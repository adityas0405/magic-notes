import datetime
import json
import os
import uuid
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker


from models import Base, Flashcard, Note, NoteFile, NoteStroke, Notebook
from settings import (
    CORS_ORIGINS,
    CORS_ORIGIN_REGEX,
    DATABASE_URL,
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_methods=["*"],
    allow_headers=["*"],
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


class NoteCreate(BaseModel):
    title: Optional[str] = None
    device: Optional[str] = None
    notebook_id: Optional[int] = None


class StrokePayload(BaseModel):
    strokes: List[Dict[str, Any]]
    captured_at: Optional[str] = None


class FlashcardPayload(BaseModel):
    cards: Optional[List[Dict[str, str]]] = None


def get_or_create_default_notebook(db: Session) -> Notebook:
    existing = db.execute(
        select(Notebook).where(Notebook.name == "Unsorted")
    ).scalar_one_or_none()
    if existing:
        return existing

    notebook = Notebook(name="Unsorted", color="#14b8a6", icon="Atom")
    db.add(notebook)
    db.commit()
    db.refresh(notebook)
    return notebook


@app.post("/api/notes")
async def create_note(payload: NoteCreate, db: Session = Depends(get_db)):
    if payload.notebook_id:
        notebook = db.get(Notebook, payload.notebook_id)
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")
    else:
        notebook = get_or_create_default_notebook(db)

    now = datetime.datetime.utcnow()
    note = Note(
        title=payload.title or "Untitled Note",
        device=payload.device or "unknown",
        created_at=now,
        updated_at=now,
        notebook=notebook,
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
    note_id: int, payload: StrokePayload, db: Session = Depends(get_db)
):
    note = db.get(Note, note_id)
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
    note_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)
):
    note = db.get(Note, note_id)
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
async def get_library(db: Session = Depends(get_db)):
    notebooks = db.execute(select(Notebook)).scalars().all()
    response = []
    for notebook in notebooks:
        response.append(
            {
                "id": notebook.id,
                "name": notebook.name,
                "color": notebook.color,
                "icon": notebook.icon,
                "note_count": len(notebook.notes),
            }
        )

    return {"notebooks": response}


@app.get("/api/notebooks/{notebook_id}/notes")
async def get_notebook_notes(notebook_id: int, db: Session = Depends(get_db)):
    notebook = db.get(Notebook, notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")

    notes = (
        db.execute(select(Note).where(Note.notebook_id == notebook_id))
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
async def get_note(note_id: int, db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
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
async def get_note_strokes(note_id: int, db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
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
async def get_note_file(note_id: int, db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
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
async def summarize_note(note_id: int, db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.summary = "Summary generation is queued."
    note.updated_at = datetime.datetime.utcnow()
    db.commit()

    return {"status": "queued", "summary": note.summary}


@app.post("/api/notes/{note_id}/flashcards")
async def generate_flashcards(
    note_id: int, payload: FlashcardPayload, db: Session = Depends(get_db)
):
    note = db.get(Note, note_id)
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
