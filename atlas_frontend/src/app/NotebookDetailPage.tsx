import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useNoteDetail, useNotebookNotes } from "../lib/queries";

const NotebookDetailPage = () => {
  const { subjectId, notebookId } = useParams();
  const { data: notes, isLoading: isNotesLoading } = useNotebookNotes(notebookId);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const { data: noteDetail, isLoading: isNoteLoading } = useNoteDetail(
    selectedNoteId ?? undefined
  );
  const [tab, setTab] = useState<"flashcards" | "summary">("flashcards");
  const [cardIndex, setCardIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"handwriting" | "digitized">("handwriting");

  useEffect(() => {
    if (notes?.length && !selectedNoteId) {
      setSelectedNoteId(notes[0].id);
    }
  }, [notes, selectedNoteId]);

  useEffect(() => {
    setSelectedNoteId(null);
    setCardIndex(0);
  }, [notebookId]);

  const cards = noteDetail?.cards ?? [];
  const card = cards[cardIndex];
  const noteTitle = noteDetail?.title ?? "Select a note";
  const subjectName = noteDetail?.subject.name ?? "Subject";
  const notebookName = noteDetail?.notebook.name ?? "Notebook";
  const hasNotes = Boolean(notes?.length);
  const hasFile = Boolean(noteDetail?.file_url);
  const fileLabel = hasFile ? "View latest upload" : "No handwriting upload yet";
  const summaryText =
    noteDetail?.summary || "Summaries will appear once processing completes.";

  const breadcrumb = useMemo(
    () => (
      <div className="text-sm text-muted">
        <Link to="/app/library">Library</Link> /{" "}
        <Link to={`/app/subjects/${subjectId}`}>{subjectName}</Link> /{" "}
        <span className="text-text">{notebookName}</span>
      </div>
    ),
    [subjectId, subjectName, notebookName]
  );

  return (
    <div className="space-y-6">
      {breadcrumb}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{noteTitle}</h1>
        <div className="flex items-center gap-2 rounded-xl bg-base p-1">
          <button
            className={`rounded-lg px-4 py-2 text-xs font-medium shadow-sm ${
              viewMode === "handwriting" ? "bg-white" : "text-muted"
            }`}
            onClick={() => setViewMode("handwriting")}
          >
            Original Handwriting
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-xs ${
              viewMode === "digitized" ? "bg-white font-medium" : "text-muted"
            }`}
            onClick={() => setViewMode("digitized")}
          >
            Digitized Text
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr_320px]">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
          <h2 className="text-sm font-semibold">Notes</h2>
          {isNotesLoading ? (
            <p className="mt-4 text-xs text-muted">Loading notes…</p>
          ) : hasNotes ? (
            <div className="mt-4 space-y-2">
              {notes?.map((note) => (
                <button
                  key={note.id}
                  onClick={() => {
                    setSelectedNoteId(note.id);
                    setCardIndex(0);
                  }}
                  className={`w-full rounded-xl border px-3 py-3 text-left text-xs ${
                    note.id === selectedNoteId
                      ? "border-primary bg-emerald-50 text-primary"
                      : "border-border bg-base text-text"
                  }`}
                >
                  <p className="font-semibold">{note.title}</p>
                  <p className="text-[11px] text-muted">
                    {note.flashcard_count} cards
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-muted">No notes in this notebook.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-8 shadow-card">
          {isNoteLoading ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-base text-sm text-muted">
              Loading note…
            </div>
          ) : viewMode === "handwriting" ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-base text-sm text-muted">
              <p>{fileLabel}</p>
              {hasFile ? (
                <a
                  className="mt-2 text-xs text-primary underline"
                  href={noteDetail?.file_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open file
                </a>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3 text-sm text-text">
              <h3 className="text-sm font-semibold">Digitized Summary</h3>
              <p className="text-xs text-muted">{summaryText}</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface shadow-card">
          <div className="flex border-b border-border text-xs font-semibold">
            <button
              className={`flex-1 px-4 py-3 ${
                tab === "flashcards"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted"
              }`}
              onClick={() => setTab("flashcards")}
              disabled={!cards.length}
            >
              Flashcards
            </button>
            <button
              className={`flex-1 px-4 py-3 ${
                tab === "summary"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted"
              }`}
              onClick={() => setTab("summary")}
            >
              Summary
            </button>
          </div>

          {tab === "flashcards" ? (
            <div className="space-y-4 p-5">
              {cards.length ? (
                <>
                  <p className="text-center text-xs text-muted">
                    Card {cardIndex + 1} of {cards.length}
                  </p>
                  <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-border bg-base p-6 text-center text-sm font-semibold text-text shadow-sm">
                    {card?.question ?? "No card selected"}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted">
                    <button
                      className="hover:text-text"
                      disabled={cardIndex === 0}
                      onClick={() => setCardIndex((prev) => Math.max(prev - 1, 0))}
                    >
                      ← Previous
                    </button>
                    <button
                      className="text-text"
                      disabled={cardIndex === cards.length - 1}
                      onClick={() =>
                        setCardIndex((prev) =>
                          Math.min(prev + 1, cards.length - 1)
                        )
                      }
                    >
                      Next →
                    </button>
                  </div>
                  <p className="text-center text-[11px] text-muted">
                    Flashcards are synced from your notes.
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted">No flashcards yet.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4 p-5">
              <h3 className="text-sm font-semibold">Summary</h3>
              <p className="text-xs text-muted">{summaryText}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotebookDetailPage;
