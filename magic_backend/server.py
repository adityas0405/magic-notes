import datetime
import json
import os
import uuid
from typing import Any, Dict, List, Optional

import bcrypt
import jwt
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import create_engine, func, select
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

# Never auto-create schema in prod
if os.getenv("ENV", "dev") != "prod":
    Base.metadata.create_all(bind=engine)

if STORAGE_BACKEND == "local":
    os.makedirs(STORAGE_DIR, exist_ok=True)

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


class StrokePayload(BaseModel):
    strokes: List[Dict[str, Any]]
    captured_at: Optional[str] = None


class FlashcardPayload(BaseModel):
    cards: Optional[List[Dict[str, str]]] = None

# ------------------------------------------------------------------
# Defaults (single-transaction safe)
# ------------------------------------------------------------------

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
        ensure_user_defaults(db, current_user)
        notebook = db.execute(
            select(Notebook)
            .join(Subject)
            .where(
                Notebook.user_id == current_user.id,
                Notebook.name == "Unsorted",
            )
        ).scalar_one()

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
