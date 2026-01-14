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
logger = logging.getLogger(__name__)

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
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())

def create_access_token(user: User) -> str:
    now = datetime.datetime.utcnow()
    payload = {
        "user_id": user.id,
        "email": user.email,
        "iat": int(now.timestamp()),
        "exp": int((now + datetime.timedelta(seconds=JWT_EXPIRES_SECONDS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

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
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.get(User, payload.get("user_id"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user

# ------------------------------------------------------------------
# Schemas
# ------------------------------------------------------------------

class AuthPayload(BaseModel):
    email: str
    password: str

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
        "subject": {
            "id": note.notebook.subject.id,
            "name": note.notebook.subject.name,
        },
        "updated_at": note.updated_at.isoformat(),
    }
