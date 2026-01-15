import datetime
import json
import logging
import math
import os
import threading
import uuid
from typing import Any, Dict, Iterable, List, Optional, Tuple

import bcrypt
import jwt
from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from PIL import Image, ImageDraw
from pydantic import BaseModel
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker

from models import AIJob, Flashcard, Note, NoteFile, NoteStroke, Notebook, Subject, User
from settings import (
    CORS_ORIGINS,
    CORS_ORIGIN_REGEX,
    DATABASE_URL,
    JWT_EXPIRES_SECONDS,
    JWT_SECRET,
    STORAGE_BACKEND,
    STORAGE_DIR,
    get_s3_client,
    s3_settings,
)

# ------------------------------------------------------------------
# Database setup
# ------------------------------------------------------------------

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

if STORAGE_BACKEND == "local":
    os.makedirs(STORAGE_DIR, exist_ok=True)
OCR_IMAGE_DIR = os.path.join(STORAGE_DIR, "ocr")
os.makedirs(OCR_IMAGE_DIR, exist_ok=True)
OCR_ENGINE = "paddleocr"

logger = logging.getLogger(__name__)
_OCR = None
_OCR_LOCK = threading.Lock()

# ------------------------------------------------------------------
# App setup
# ------------------------------------------------------------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------
# Auth + DB helpers
# ------------------------------------------------------------------

security = HTTPBearer(auto_error=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(user: User) -> str:
    now = datetime.datetime.utcnow()
    expires_at = now + datetime.timedelta(seconds=JWT_EXPIRES_SECONDS)
    payload = {
        "user_id": user.id,
        "email": user.email,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    if isinstance(token, bytes):
        return token.decode("utf-8")
    return token


def serialize_user(user: User) -> Dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "created_at": user.created_at.isoformat(),
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


def serialize_ai_job(job: AIJob) -> Dict[str, Any]:
    return {
        "id": job.id,
        "note_id": job.note_id,
        "type": job.job_type,
        "status": job.status,
        "error": job.error,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "updated_at": job.updated_at.isoformat() if job.updated_at else None,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "finished_at": job.finished_at.isoformat() if job.finished_at else None,
    }


def serialize_note_stroke(stroke: NoteStroke) -> Dict[str, Any]:
    try:
        payload: Any = json.loads(stroke.payload)
    except json.JSONDecodeError:
        payload = stroke.payload
    return {
        "id": stroke.id,
        "note_id": stroke.note_id,
        "payload": payload,
        "created_at": stroke.created_at.isoformat(),
    }


def _iter_stroke_points(stroke: Dict[str, Any]) -> Iterable[Tuple[float, float]]:
    candidates = stroke.get("points") or stroke.get("path") or stroke.get("segments")
    if isinstance(stroke.get("x"), list) and isinstance(stroke.get("y"), list):
        candidates = list(zip(stroke.get("x"), stroke.get("y")))
    if not candidates:
        return []
    points: List[Tuple[float, float]] = []
    for point in candidates:
        if isinstance(point, dict):
            x = point.get("x")
            y = point.get("y")
        elif isinstance(point, (list, tuple)) and len(point) >= 2:
            x, y = point[0], point[1]
        else:
            continue
        if x is None or y is None:
            continue
        points.append((float(x), float(y)))
    return points


def _stroke_width(stroke: Dict[str, Any]) -> int:
    for key in ("width", "stroke_width", "strokeWidth", "lineWidth", "size"):
        value = stroke.get(key)
        if value:
            try:
                return max(1, int(round(float(value))))
            except (TypeError, ValueError):
                continue
    return 2


def render_note_strokes_to_png(note: Note, job_id: int) -> str:
    strokes_sorted = sorted(note.strokes, key=lambda item: (item.created_at, item.id))
    stroke_sets: List[Tuple[List[Tuple[float, float]], int]] = []
    min_x = min_y = None
    max_x = max_y = None
    for stroke_entry in strokes_sorted:
        try:
            payload = json.loads(stroke_entry.payload)
        except json.JSONDecodeError:
            continue
        for stroke in payload.get("strokes", []):
            points = list(_iter_stroke_points(stroke))
            if not points:
                continue
            stroke_sets.append((points, _stroke_width(stroke)))
            for x, y in points:
                min_x = x if min_x is None else min(min_x, x)
                min_y = y if min_y is None else min(min_y, y)
                max_x = x if max_x is None else max(max_x, x)
                max_y = y if max_y is None else max(max_y, y)

    if min_x is None or min_y is None or max_x is None or max_y is None:
        raise ValueError("No stroke data available to render.")

    padding = 20
    width = max(1, int(math.ceil(max_x - min_x + padding * 2)))
    height = max(1, int(math.ceil(max_y - min_y + padding * 2)))
    image = Image.new("RGB", (width, height), color="white")
    draw = ImageDraw.Draw(image)

    for points, stroke_width in stroke_sets:
        translated = [
            (x - min_x + padding, y - min_y + padding)
            for x, y in points
        ]
        if len(translated) == 1:
            x, y = translated[0]
            radius = max(1, stroke_width)
            draw.ellipse(
                (x - radius, y - radius, x + radius, y + radius),
                fill="black",
                outline="black",
            )
        else:
            draw.line(translated, fill="black", width=stroke_width, joint="curve")

    note_dir = os.path.join(OCR_IMAGE_DIR, f"note_{note.id}")
    os.makedirs(note_dir, exist_ok=True)
    image_path = os.path.join(note_dir, f"{job_id}.png")
    image.save(image_path, format="PNG")
    return image_path


def run_paddleocr(image_path: str) -> Tuple[str, Optional[float]]:
    ocr = get_ocr()
    result = ocr.ocr(image_path, cls=True)
    if not result:
        return "", None

    lines: List[str] = []
    confidences: List[float] = []
    for page in result:
        for entry in page:
            if not entry or len(entry) < 2:
                continue
            text_info = entry[1]
            if not isinstance(text_info, (list, tuple)) or len(text_info) < 2:
                continue
            text, confidence = text_info[0], text_info[1]
            if text:
                lines.append(str(text))
            if confidence is not None:
                try:
                    confidences.append(float(confidence))
                except (TypeError, ValueError):
                    continue

    if not lines:
        return "", None

    avg_confidence = None
    if confidences:
        avg_confidence = sum(confidences) / len(confidences)
    return "\n".join(lines).strip(), avg_confidence


def get_ocr():
    global _OCR
    if _OCR is None:
        with _OCR_LOCK:
            if _OCR is None:
                from paddleocr import PaddleOCR

                _OCR = PaddleOCR(use_angle_cls=True, lang="en")
    return _OCR


def run_ocr_job(job_id: int) -> None:
    db = SessionLocal()
    try:
        job = db.get(AIJob, job_id)
        if not job:
            return
        if job.status not in {"queued", "running"}:
            return
        now = datetime.datetime.utcnow()
        job.status = "running"
        job.started_at = now
        job.updated_at = now
        db.commit()

        note = db.execute(
            select(Note)
            .join(Notebook)
            .where(Note.id == job.note_id, Notebook.user_id == job.user_id)
        ).scalar_one_or_none()
        if not note:
            raise ValueError("Note not found for OCR job.")

        image_path = render_note_strokes_to_png(note, job.id)
        text, confidence = run_paddleocr(image_path)
        now = datetime.datetime.utcnow()
        note.ocr_text = text or ""
        note.ocr_engine = OCR_ENGINE
        note.ocr_confidence = confidence
        note.ocr_updated_at = now
        job.status = "succeeded"
        job.finished_at = now
        job.updated_at = now
        db.commit()
    except Exception as exc:  # noqa: BLE001 - preserve job failure detail
        now = datetime.datetime.utcnow()
        job = db.get(AIJob, job_id)
        if job:
            job.status = "failed"
            job.error = str(exc)
            job.finished_at = now
            job.updated_at = now
            db.commit()
        logger.exception("OCR job %s failed", job_id)
    finally:
        db.close()


# ------------------------------------------------------------------
# Schemas
# ------------------------------------------------------------------


class AuthPayload(BaseModel):
    email: str
    password: str


class SubjectCreate(BaseModel):
    name: str


class SubjectUpdate(BaseModel):
    name: str


class NotebookCreate(BaseModel):
    name: str
    color: Optional[str] = None
    icon: Optional[str] = None


class NotebookUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password: str


class NoteCreate(BaseModel):
    title: Optional[str] = None
    device: Optional[str] = None
    notebook_id: Optional[int] = None


class DeviceNoteCreate(BaseModel):
    title: Optional[str] = None
    device_type: str
    device_id: Optional[str] = None


class StrokePayload(BaseModel):
    strokes: List[Dict[str, Any]]
    captured_at: Optional[str] = None


class FlashcardPayload(BaseModel):
    cards: Optional[List[Dict[str, str]]] = None

# ------------------------------------------------------------------
# Defaults (single-transaction safe)
# ------------------------------------------------------------------

INBOX_NOTEBOOKS = {"tablet": "Tablet Inbox"}


def ensure_user_defaults(db: Session, user: User) -> None:
    subject = db.execute(
        select(Subject).where(
            Subject.user_id == user.id,
            Subject.name == "Unsorted",
        )
    ).scalar_one_or_none()

    if not subject:
        subject = Subject(name="Unsorted", user_id=user.id)
        db.add(subject)
        db.flush()

    notebook = db.execute(
        select(Notebook).where(
            Notebook.user_id == user.id,
            Notebook.subject_id == subject.id,
            Notebook.name == "Unsorted",
        )
    ).scalar_one_or_none()

    if not notebook:
        db.add(
            Notebook(
                name="Unsorted",
                color="#14b8a6",
                icon="Atom",
                user_id=user.id,
                subject_id=subject.id,
            )
        )


def ensure_user_inbox(db: Session, user: User, inbox_type: str) -> Notebook:
    normalized_type = inbox_type.strip().lower()
    inbox_name = INBOX_NOTEBOOKS.get(normalized_type)
    if not inbox_name:
        raise HTTPException(status_code=400, detail="Unsupported inbox type")

    subject = db.execute(
        select(Subject).where(
            Subject.user_id == user.id,
            Subject.name == "Inbox",
        )
    ).scalar_one_or_none()

    if not subject:
        subject = Subject(name="Inbox", user_id=user.id)
        db.add(subject)
        db.flush()

    notebook = db.execute(
        select(Notebook).where(
            Notebook.user_id == user.id,
            Notebook.subject_id == subject.id,
            Notebook.name == inbox_name,
        )
    ).scalar_one_or_none()

    if not notebook:
        notebook = Notebook(
            name=inbox_name,
            color="#14b8a6",
            icon="Atom",
            user_id=user.id,
            subject_id=subject.id,
            is_inbox=True,
            inbox_type=normalized_type,
        )
        db.add(notebook)
        db.flush()
    else:
        notebook.is_inbox = True
        notebook.inbox_type = normalized_type

    return notebook

# ------------------------------------------------------------------
# Auth endpoints
# ------------------------------------------------------------------

@app.post("/api/auth/signup")
async def signup(payload: AuthPayload, db: Session = Depends(get_db)):
    if db.execute(select(User).where(User.email == payload.email.lower())).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=payload.email.lower(), password_hash=hash_password(payload.password))
    db.add(user)
    db.flush()

    ensure_user_defaults(db, user)
    db.commit()
    db.refresh(user)

    return {
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "user": serialize_user(user),
    }

@app.post("/api/auth/login")
async def login(payload: AuthPayload, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == payload.email.lower())).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    ensure_user_defaults(db, user)
    db.commit()

    return {
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "user": serialize_user(user),
    }

@app.get("/api/auth/me")
async def me(current_user: User = Depends(get_current_user)):
    return {"user": serialize_user(current_user)}


@app.post("/api/auth/change-password")
async def change_password(
    payload: ChangePasswordPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    new_password = payload.new_password.strip()
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password is too short")
    current_user.password_hash = hash_password(new_password)
    db.commit()
    return {"status": "ok"}

# ------------------------------------------------------------------
# Subjects + Notebooks
# ------------------------------------------------------------------

def serialize_subject(subject: Subject, notebook_count: int) -> Dict[str, Any]:
    return {
        "id": subject.id,
        "name": subject.name,
        "notebook_count": notebook_count,
    }


def serialize_notebook_base(
    notebook: Notebook,
    note_count: int,
) -> Dict[str, Any]:
    return {
        "id": notebook.id,
        "name": notebook.name,
        "color": notebook.color,
        "icon": notebook.icon,
        "note_count": note_count,
    }


def serialize_inbox_notebook(notebook: Notebook) -> Dict[str, Any]:
    return {
        "id": notebook.id,
        "name": notebook.name,
        "color": notebook.color,
        "icon": notebook.icon,
        "is_inbox": notebook.is_inbox,
        "inbox_type": notebook.inbox_type,
        "subject_id": notebook.subject_id,
    }


@app.get("/api/library")
async def get_library(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subjects_with_counts = db.execute(
        select(Subject, func.count(Notebook.id))
        .outerjoin(Notebook)
        .where(Subject.user_id == current_user.id)
        .group_by(Subject.id)
        .order_by(Subject.created_at)
    ).all()

    notebooks_with_counts = db.execute(
        select(Notebook, func.count(Note.id))
        .outerjoin(Note)
        .where(Notebook.user_id == current_user.id)
        .group_by(Notebook.id)
        .order_by(Notebook.created_at.desc())
    ).all()

    return {
        "subjects": [
            serialize_subject(subject, notebook_count)
            for subject, notebook_count in subjects_with_counts
        ],
        "notebooks": [
            serialize_notebook_base(notebook, note_count)
            for notebook, note_count in notebooks_with_counts
        ],
    }


@app.get("/api/subjects")
async def list_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subjects_with_counts = db.execute(
        select(Subject, func.count(Notebook.id))
        .outerjoin(Notebook)
        .where(Subject.user_id == current_user.id)
        .group_by(Subject.id)
        .order_by(Subject.created_at)
    ).all()

    return {
        "subjects": [
            serialize_subject(subject, notebook_count)
            for subject, notebook_count in subjects_with_counts
        ]
    }


@app.post("/api/subjects")
async def create_subject(
    payload: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    subject = Subject(name=name, user_id=current_user.id)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return serialize_subject(subject, 0)


@app.patch("/api/subjects/{subject_id}")
async def update_subject(
    subject_id: int,
    payload: SubjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subject = db.execute(
        select(Subject).where(
            Subject.id == subject_id, Subject.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    subject.name = name
    db.commit()
    db.refresh(subject)
    return serialize_subject(subject, len(subject.notebooks))


@app.delete("/api/subjects/{subject_id}")
async def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subject = db.execute(
        select(Subject).where(
            Subject.id == subject_id, Subject.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    db.delete(subject)
    db.commit()
    return {"status": "ok"}


@app.get("/api/subjects/{subject_id}/notebooks")
async def get_subject_notebooks(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subject = db.execute(
        select(Subject).where(
            Subject.id == subject_id, Subject.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    notebooks_with_stats = db.execute(
        select(Notebook, func.count(Note.id), func.max(Note.updated_at))
        .outerjoin(Note)
        .where(Notebook.subject_id == subject.id, Notebook.user_id == current_user.id)
        .group_by(Notebook.id)
        .order_by(Notebook.created_at)
    ).all()

    notebooks = []
    for notebook, note_count, updated_at in notebooks_with_stats:
        notebook_data = serialize_notebook_base(notebook, note_count)
        notebook_data["updated_at"] = (
            updated_at or notebook.created_at
        ).isoformat()
        notebooks.append(notebook_data)

    return {"subject": {"id": subject.id, "name": subject.name}, "notebooks": notebooks}


@app.post("/api/subjects/{subject_id}/notebooks")
async def create_notebook(
    subject_id: int,
    payload: NotebookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subject = db.execute(
        select(Subject).where(
            Subject.id == subject_id, Subject.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    notebook = Notebook(
        name=name,
        color=payload.color or "#14b8a6",
        icon=payload.icon or "Atom",
        user_id=current_user.id,
        subject_id=subject.id,
    )
    db.add(notebook)
    db.commit()
    db.refresh(notebook)
    return serialize_notebook_base(notebook, 0)


@app.get("/api/notebooks/inbox")
async def get_inbox_notebook(
    inbox_type: str = Query(..., alias="type"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notebook = ensure_user_inbox(db, current_user, inbox_type)
    db.commit()
    db.refresh(notebook)
    return serialize_inbox_notebook(notebook)


@app.patch("/api/notebooks/{notebook_id}")
async def update_notebook(
    notebook_id: int,
    payload: NotebookUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notebook = db.execute(
        select(Notebook).where(
            Notebook.id == notebook_id, Notebook.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name is required")
        notebook.name = name
    if payload.color is not None:
        notebook.color = payload.color
    if payload.icon is not None:
        notebook.icon = payload.icon

    db.commit()
    db.refresh(notebook)
    return serialize_notebook_base(notebook, len(notebook.notes))


@app.delete("/api/notebooks/{notebook_id}")
async def delete_notebook(
    notebook_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notebook = db.execute(
        select(Notebook).where(
            Notebook.id == notebook_id, Notebook.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")

    db.delete(notebook)
    db.commit()
    return {"status": "ok"}

# ------------------------------------------------------------------
# Notes (OWNERSHIP ALWAYS VIA NOTEBOOK)
# ------------------------------------------------------------------

def owned_note(db: Session, note_id: int, user_id: int) -> Optional[Note]:
    return db.execute(
        select(Note)
        .join(Notebook)
        .where(
            Note.id == note_id,
            Notebook.user_id == user_id,
        )
    ).scalar_one_or_none()


@app.get("/api/notebooks/{notebook_id}/notes")
async def get_notebook_notes(
    notebook_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notebook = db.execute(
        select(Notebook).where(
            Notebook.id == notebook_id, Notebook.user_id == current_user.id
        )
    ).scalar_one_or_none()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")

    notes_with_counts = db.execute(
        select(Note, func.count(Flashcard.id))
        .outerjoin(Flashcard)
        .where(Note.notebook_id == notebook_id)
        .group_by(Note.id)
        .order_by(Note.updated_at.desc())
    ).all()

    return [
        {
            "id": note.id,
            "title": note.title,
            "updated_at": note.updated_at.isoformat(),
            "flashcard_count": flashcard_count,
        }
        for note, flashcard_count in notes_with_counts
    ]


@app.post("/api/device/notes")
async def create_device_note(
    payload: DeviceNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    device_type = payload.device_type.strip()
    if not device_type:
        raise HTTPException(status_code=400, detail="Device type is required")

    notebook = ensure_user_inbox(db, current_user, device_type)

    note = Note(
        title=payload.title or "Untitled Note",
        device=device_type,
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow(),
        notebook_id=notebook.id,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return {"note_id": note.id, "notebook_id": notebook.id}


@app.post("/api/notes")
async def create_note(
    payload: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Repro: new user signs up -> Flutter send -> note should create in Tablet Inbox.
    if payload.notebook_id:
        notebook = db.execute(
            select(Notebook).where(
                Notebook.id == payload.notebook_id,
                Notebook.user_id == current_user.id,
            )
        ).scalar_one_or_none()
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")
    else:
        notebook = ensure_user_inbox(db, current_user, "tablet")

    note = Note(
        title=payload.title or "Untitled Note",
        device=payload.device or "unknown",
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow(),
        notebook_id=notebook.id,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return {"id": note.id, "title": note.title}

@app.post("/api/notes/{note_id}/strokes")
async def add_strokes(
    note_id: int,
    payload: StrokePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = owned_note(db, note_id, current_user.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    db.add(
        NoteStroke(
            note_id=note.id,
            payload=json.dumps(payload.dict()),
        )
    )
    note.updated_at = datetime.datetime.utcnow()
    db.commit()
    return {"status": "ok"}


@app.get("/api/notes/{note_id}/strokes")
async def get_note_strokes(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = owned_note(db, note_id, current_user.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    strokes = db.execute(
        select(NoteStroke)
        .where(NoteStroke.note_id == note.id)
        .order_by(NoteStroke.created_at.asc(), NoteStroke.id.asc())
    ).scalars()
    return [serialize_note_stroke(stroke) for stroke in strokes]

@app.post("/api/notes/{note_id}/upload")
async def upload_note_file(
    note_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = owned_note(db, note_id, current_user.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    filename = f"{uuid.uuid4().hex}{os.path.splitext(file.filename)[1]}"
    content = await file.read()

    if STORAGE_BACKEND == "s3":
        get_s3_client().put_object(
            Bucket=s3_settings.bucket,
            Key=filename,
            Body=content,
            ContentType=file.content_type,
        )
    else:
        with open(os.path.join(STORAGE_DIR, filename), "wb") as f:
            f.write(content)

    db.add(
        NoteFile(
            note_id=note.id,
            stored_filename=filename,
            original_filename=file.filename,
            content_type=file.content_type,
        )
    )
    note.updated_at = datetime.datetime.utcnow()
    db.commit()

    return {"status": "ok"}

@app.get("/api/notes/{note_id}")
async def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = owned_note(db, note_id, current_user.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    return {
        "id": note.id,
        "title": note.title,
        "summary": note.summary,
        "ocr_text": note.ocr_text,
        "ocr_engine": note.ocr_engine,
        "ocr_confidence": note.ocr_confidence,
        "ocr_updated_at": note.ocr_updated_at.isoformat() if note.ocr_updated_at else None,
        "subject": {
            "id": note.notebook.subject.id if note.notebook and note.notebook.subject else None,
            "name": note.notebook.subject.name
            if note.notebook and note.notebook.subject
            else None,
        },
        "notebook": {
            "id": note.notebook.id,
            "name": note.notebook.name,
        },
        "updated_at": note.updated_at.isoformat(),
        "file_url": None,
        "cards": [
            {"question": card.question, "answer": card.answer}
            for card in note.flashcards
        ],
    }


@app.post("/api/notes/{note_id}/ocr/enqueue")
async def enqueue_ocr(
    note_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = owned_note(db, note_id, current_user.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    existing_job = db.execute(
        select(AIJob).where(
            AIJob.note_id == note.id,
            AIJob.user_id == current_user.id,
            AIJob.job_type == "ocr",
            AIJob.status.in_(["queued", "running"]),
        )
    ).scalar_one_or_none()
    if existing_job:
        return {"job": serialize_ai_job(existing_job)}

    now = datetime.datetime.utcnow()
    job = AIJob(
        note_id=note.id,
        user_id=current_user.id,
        job_type="ocr",
        status="queued",
        created_at=now,
        updated_at=now,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(run_ocr_job, job.id)
    return {"job": serialize_ai_job(job)}


@app.get("/api/notes/{note_id}/ocr")
async def get_note_ocr(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = owned_note(db, note_id, current_user.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    latest_job = db.execute(
        select(AIJob)
        .where(
            AIJob.note_id == note.id,
            AIJob.user_id == current_user.id,
            AIJob.job_type == "ocr",
        )
        .order_by(AIJob.created_at.desc())
    ).scalar_one_or_none()

    return {
        "note_id": note.id,
        "ocr_text": note.ocr_text,
        "ocr_engine": note.ocr_engine,
        "ocr_confidence": note.ocr_confidence,
        "ocr_updated_at": note.ocr_updated_at.isoformat() if note.ocr_updated_at else None,
        "job": serialize_ai_job(latest_job) if latest_job else None,
    }
