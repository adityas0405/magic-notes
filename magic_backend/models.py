import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    subjects = relationship("Subject", back_populates="user", cascade="all, delete-orphan")
    notebooks = relationship("Notebook", back_populates="user", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="user", cascade="all, delete-orphan")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    user = relationship("User", back_populates="subjects")
    notebooks = relationship(
        "Notebook", back_populates="subject", cascade="all, delete-orphan"
    )


class Notebook(Base):
    __tablename__ = "notebooks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    color = Column(String, default="#14b8a6")
    icon = Column(String, default="Atom")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"))

    user = relationship("User", back_populates="notebooks")
    subject = relationship("Subject", back_populates="notebooks")
    notes = relationship("Note", back_populates="notebook", cascade="all, delete-orphan")


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, default="Untitled Note")
    device = Column(String, default="unknown")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)
    summary = Column(Text, default="")
    notebook_id = Column(Integer, ForeignKey("notebooks.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    user = relationship("User", back_populates="notes")
    notebook = relationship("Notebook", back_populates="notes")
    strokes = relationship("NoteStroke", back_populates="note", cascade="all, delete-orphan")
    files = relationship("NoteFile", back_populates="note", cascade="all, delete-orphan")
    flashcards = relationship("Flashcard", back_populates="note", cascade="all, delete-orphan")


class NoteStroke(Base):
    __tablename__ = "note_strokes"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"))
    payload = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    note = relationship("Note", back_populates="strokes")


class NoteFile(Base):
    __tablename__ = "note_files"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"))
    stored_filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    note = relationship("Note", back_populates="files")


class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"))
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    note = relationship("Note", back_populates="flashcards")
