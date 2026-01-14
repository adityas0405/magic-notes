import datetime
import json
import logging
import os
import time
import uuid
from typing import Any, Dict, List, Optional

import bcrypt
import jwt
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker


from models import Base, Flashcard, Note, NoteFile, NoteStroke, Notebook, Subject, User
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

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}



# Normalize Fly's postgres:// to SQLAlchemy's postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)


engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

if STORAGE_BACKEND == "local":
    os.makedirs(STORAGE_DIR, exist_ok=True)

app = FastAPI()
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_methods=["*"],
    allow_headers=["*"],
)

LOGIN_THROTTLE_WINDOW_SECONDS = 60
LOGIN_THROTTLE_MAX_ATTEMPTS = 5
login_attempts: Dict[str, List[float]] = {}


@app.on_event("startup")
def warn_on_missing_columns() -> None:
    from sqlalchemy import inspect

    inspector = inspect(engine)
    required_columns = {
        "subjects": {"id", "name", "created_at", "user_id"},
        "notebooks": {"id", "name", "color", "icon", "created_at", "user_id", "subject_id"},
        "notes": {
            "id",
            "title",
            "device",
            "created_at",
            "updated_at",
            "summary",
            "notebook_id",
            "user_id",
        },
    }
    for table, columns in required_columns.items():
        if not inspector.has_table(table):
            logger.warning("Missing table '%s'. Run migrations before using auth.", table)
            continue
        existing = {column["name"] for column in inspector.get_columns(table)}
        missing = columns - existing
        if missing:
            logger.warning(
                "Table '%s' is missing columns %s. Run migrations/backfill before using auth.",
                table,
                ", ".join(sorted(missing)),
            )


@app.get("/health")
async def health_check():
    return {"status": "ok"}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


security = HTTPBearer(auto_error=False)


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


class NoteCreate(BaseModel):
    title: Optional[str] = None
    device: Optional[str] = None
    notebook_id: Optional[int] = None


class StrokePayload(BaseModel):
    strokes: List[Dict[str, Any]]
    captured_at: Optional[str] = None


class FlashcardPayload(BaseModel):
    cards: Optional[List[Dict[str, str]]] = None


class AuthPayload(BaseModel):
    email: str
    password: str


def get_or_create_default_subject(db: Session, user: User) -> Subject:
    existing = db.execute(
        select(Subject).where(
            Subject.user_id == user.id,
            Subject.name == "Unsorted",
        )
    ).scalar_one_or_none()
    if existing:
        return existing

    subject = Subject(name="Unsorted", user=user)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


def get_or_create_default_notebook(db: Session, user: User, subject: Subject) -> Notebook:
    existing = db.execute(
        select(Notebook).where(
            Notebook.user_id == user.id,
            Notebook.subject_id == subject.id,
            Notebook.name == "Unsorted",
        )
    ).scalar_one_or_none()
    if existing:
        return existing

    notebook = Notebook(
        name="Unsorted",
        color="#14b8a6",
        icon="Atom",
        user=user,
        subject=subject,
    )
    db.add(notebook)
    db.commit()
    db.refresh(notebook)
    return notebook


def ensure_user_defaults(db: Session, user: User) -> None:
    subject = get_or_create_default_subject(db, user)
    get_or_create_default_notebook(db, user, subject)


def throttle_login(request: Request) -> None:
    client_host = request.client.host if request.client else "unknown"
    now = time.time()
    attempts = login_attempts.get(client_host, [])
    attempts = [attempt for attempt in attempts if now - attempt < LOGIN_THROTTLE_WINDOW_SECONDS]
    if len(attempts) >= LOGIN_THROTTLE_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many login attempts")
    attempts.append(now)
    login_attempts[client_host] = attempts


@app.post("/api/auth/signup")
async def signup(payload: AuthPayload, db: Session = Depends(get_db)):
    existing = db.execute(
        select(User).where(User.email == payload.email.lower())
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=payload.email.lower(), password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    ensure_user_defaults(db, user)

    token = create_access_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": serialize_user(user),
    }


@app.post("/api/auth/login")
async def login(payload: AuthPayload, request: Request, db: Session = Depends(get_db)):
    throttle_login(request)
    user = db.execute(
        select(User).where(User.email == payload.email.lower())
    ).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    ensure_user_defaults(db, user)

    token = create_access_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": serialize_user(user),
    }


@app.get("/api/auth/me")
async def me(current_user: User = Depends(get_current_user)):
    return {"user": serialize_user(current_user)}


@app.post("/api/notes")
async def create_note(
    payload: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
        subject = get_or_create_default_subject(db, current_user)
        notebook = get_or_create_default_notebook(db, current_user, subject)

    now = datetime.datetime.utcnow()
    note = Note(
        title=payload.title or "Untitled Note",
        device=payload.device or "unknown",
        created_at=now,
        updated_at=now,
        notebook=notebook,
        user=current_user,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return {
        "id": note.id,
        "title": note.title,
        "device": note.device,
        "created_at": note.created_at.isoformat(),
        "updated_at": note.updated_at.isoformat(),
        "notebook_id": note.notebook_id,
    }


@app.post("/api/notes/{note_id}/strokes")
async def add_strokes(
    note_id: int,
    payload: StrokePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    ).scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    stroke_record = NoteStroke(
        note=note,
        payload=json.dumps(
            {
                "strokes": payload.strokes,
                "captured_at": payload.captured_at,
            }
        ),
    )
    note.updated_at = datetime.datetime.utcnow()
    db.add(stroke_record)
    db.commit()

    return {"status": "ok", "note_id": note_id}


@app.post("/api/notes/{note_id}/upload")
async def upload_note_file(
    note_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    ).scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    extension = os.path.splitext(file.filename or "")[1]
    stored_filename = f"{uuid.uuid4().hex}{extension}"
    content = await file.read()

    if STORAGE_BACKEND == "s3":
        client = get_s3_client()
        client.put_object(
            Bucket=s3_settings.bucket,
            Key=stored_filename,
            Body=content,
            ContentType=file.content_type or "application/octet-stream",
        )
    else:
        stored_path = os.path.join(STORAGE_DIR, stored_filename)
        with open(stored_path, "wb") as out_file:
            out_file.write(content)

    note_file = NoteFile(
        note=note,
        stored_filename=stored_filename,
        original_filename=file.filename or stored_filename,
        content_type=file.content_type or "application/octet-stream",
    )
    note.updated_at = datetime.datetime.utcnow()
    db.add(note_file)
    db.commit()

    return {
        "status": "ok",
        "note_id": note_id,
        "file_url": f"/api/notes/{note_id}/file",
    }


@app.get("/api/library")
async def get_library(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_user_defaults(db, current_user)
    subjects = (
        db.execute(select(Subject).where(Subject.user_id == current_user.id))
        .scalars()
        .all()
    )
    subject_response = [
        {
            "id": subject.id,
            "name": subject.name,
            "notebook_count": len(subject.notebooks),
        }
        for subject in subjects
    ]

    notebooks = (
        db.execute(select(Notebook).where(Notebook.user_id == current_user.id))
        .scalars()
        .all()
    )
    notebook_response = [
        {
            "id": notebook.id,
            "name": notebook.name,
            "color": notebook.color,
            "icon": notebook.icon,
            "note_count": len(notebook.notes),
        }
        for notebook in notebooks
    ]

    return {"subjects": subject_response, "notebooks": notebook_response}


@app.get("/api/subjects/{subject_id}/notebooks")
async def get_subject_notebooks(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subject = db.execute(
        select(Subject).where(
            Subject.id == subject_id,
            Subject.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    notebooks = (
        db.execute(
            select(Notebook).where(
                Notebook.subject_id == subject_id,
                Notebook.user_id == current_user.id,
            )
        )
        .scalars()
        .all()
    )

    return {
        "subject": {"id": subject.id, "name": subject.name},
        "notebooks": [
            {
                "id": notebook.id,
                "name": notebook.name,
                "color": notebook.color,
                "icon": notebook.icon,
                "note_count": len(notebook.notes),
                "updated_at": notebook.created_at.isoformat(),
            }
            for notebook in notebooks
        ],
    }


@app.get("/api/notebooks/{notebook_id}/notes")
async def get_notebook_notes(
    notebook_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notebook = db.execute(
        select(Notebook).where(
            Notebook.id == notebook_id,
            Notebook.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")

    notes = (
        db.execute(
            select(Note).where(
                Note.notebook_id == notebook_id,
                Note.user_id == current_user.id,
            )
        )
        .scalars()
        .all()
    )

    return [
        {
            "id": note.id,
            "title": note.title,
            "updated_at": note.updated_at.isoformat(),
            "flashcard_count": len(note.flashcards),
        }
        for note in notes
    ]


@app.get("/api/notes/{note_id}")
async def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    ).scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    latest_file = (
        db.execute(
            select(NoteFile)
            .where(NoteFile.note_id == note_id)
            .order_by(NoteFile.created_at.desc())
        )
        .scalars()
        .first()
    )

    return {
        "id": note.id,
        "title": note.title,
        "summary": note.summary,
        "subject": {
            "id": note.notebook.subject.id if note.notebook and note.notebook.subject else None,
            "name": note.notebook.subject.name
            if note.notebook and note.notebook.subject
            else None,
        },
        "notebook": {
            "id": note.notebook.id if note.notebook else None,
            "name": note.notebook.name if note.notebook else "Unsorted",
        },
        "updated_at": note.updated_at.isoformat(),
        "file_url": f"/api/notes/{note_id}/file" if latest_file else "",
        "cards": [
            {"question": card.question, "answer": card.answer}
            for card in note.flashcards
        ],
    }


@app.get("/api/notes/{note_id}/strokes")
async def get_note_strokes(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    ).scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    strokes = (
        db.execute(
            select(NoteStroke)
            .where(NoteStroke.note_id == note_id)
            .order_by(NoteStroke.created_at.asc())
        )
        .scalars()
        .all()
    )

    return [json.loads(stroke.payload) for stroke in strokes]


@app.get("/api/notes/{note_id}/file")
async def get_note_file(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    ).scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    latest_file = (
        db.execute(
            select(NoteFile)
            .where(NoteFile.note_id == note_id)
            .order_by(NoteFile.created_at.desc())
        )
        .scalars()
        .first()
    )

    if not latest_file:
        raise HTTPException(status_code=404, detail="File not found")

    if STORAGE_BACKEND == "s3":
        client = get_s3_client()
        presigned_url = client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": s3_settings.bucket,
                "Key": latest_file.stored_filename,
            },
            ExpiresIn=s3_settings.presigned_expires,
        )
        return RedirectResponse(presigned_url)

    file_path = os.path.join(STORAGE_DIR, latest_file.stored_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File missing on disk")

    return FileResponse(file_path, media_type=latest_file.content_type)


@app.post("/api/notes/{note_id}/summarize")
async def summarize_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    ).scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.summary = "Summary generation is queued."
    note.updated_at = datetime.datetime.utcnow()
    db.commit()

    return {"status": "queued", "summary": note.summary}


@app.post("/api/notes/{note_id}/flashcards")
async def generate_flashcards(
    note_id: int,
    payload: FlashcardPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    ).scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    if payload.cards:
        for card in payload.cards:
            flashcard = Flashcard(
                note=note,
                question=card.get("question", ""),
                answer=card.get("answer", ""),
            )
            db.add(flashcard)
        note.updated_at = datetime.datetime.utcnow()
        db.commit()

    return {
        "status": "queued",
        "cards": [
            {"question": card.question, "answer": card.answer}
            for card in note.flashcards
        ],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
