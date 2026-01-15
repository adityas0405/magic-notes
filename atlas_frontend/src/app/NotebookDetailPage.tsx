import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getApiErrorMessage } from "../lib/api";
import {
  useCreateNote,
  useEnqueueNoteOcr,
  useNoteDetail,
  useNoteStrokes,
  useNotebookNotes,
  useSubjectNotebooks,
  useUpdateNotebook,
} from "../lib/queries";

type StrokePoint = {
  x: number;
  y: number;
};

type StrokeSet = {
  points: StrokePoint[];
  width: number;
};

const parseStrokePoints = (stroke: Record<string, unknown>): StrokePoint[] => {
  const pointSets =
    (stroke.points as unknown[]) ||
    (stroke.path as unknown[]) ||
    (stroke.segments as unknown[]);
  let points: unknown[] | undefined = pointSets;

  if (Array.isArray(stroke.x) && Array.isArray(stroke.y)) {
    points = (stroke.x as unknown[]).map((x, index) => [x, (stroke.y as unknown[])[index]]);
  }

  if (!points) {
    return [];
  }

  const parsed: StrokePoint[] = [];
  for (const point of points) {
    if (Array.isArray(point) && point.length >= 2) {
      const [x, y] = point;
      if (typeof x === "number" && typeof y === "number") {
        parsed.push({ x, y });
      }
      continue;
    }
    if (point && typeof point === "object") {
      const { x, y } = point as { x?: unknown; y?: unknown };
      if (typeof x === "number" && typeof y === "number") {
        parsed.push({ x, y });
      }
    }
  }
  return parsed;
};

const getStrokeWidth = (stroke: Record<string, unknown>) => {
  const widthKeys = ["width", "stroke_width", "strokeWidth", "lineWidth", "size"];
  for (const key of widthKeys) {
    const value = stroke[key] as number | string | undefined;
    if (value !== undefined && value !== null) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return Math.max(1, Math.round(parsed));
      }
    }
  }
  return 2;
};

const NotebookDetailPage = () => {
  const { subjectId, notebookId } = useParams();
  const { data: notes, isLoading: isNotesLoading } = useNotebookNotes(notebookId);
  const { data: subjectData } = useSubjectNotebooks(subjectId);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const { data: noteDetail, isLoading: isNoteLoading } = useNoteDetail(
    selectedNoteId ?? undefined
  );
  const { data: noteStrokes, isLoading: isStrokesLoading } = useNoteStrokes(
    selectedNoteId ?? undefined
  );
  const [tab, setTab] = useState<"flashcards" | "summary">("flashcards");
  const [cardIndex, setCardIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"handwriting" | "digitized">("handwriting");
  const [isRenamingNotebook, setIsRenamingNotebook] = useState(false);
  const [notebookNameInput, setNotebookNameInput] = useState("");
  const [noteActionError, setNoteActionError] = useState<string | null>(null);
  const enqueueOcr = useEnqueueNoteOcr(selectedNoteId ?? undefined);

  const notebookIdNumber = notebookId ? Number(notebookId) : undefined;
  const updateNotebook = useUpdateNotebook(notebookIdNumber, subjectId ? Number(subjectId) : undefined);
  const createNote = useCreateNote();

  useEffect(() => {
    if (notes?.length && !selectedNoteId) {
      setSelectedNoteId(notes[0].id);
    }
  }, [notes, selectedNoteId]);

  useEffect(() => {
    setSelectedNoteId(null);
    setCardIndex(0);
  }, [notebookId]);

  const strokeSets = useMemo<StrokeSet[]>(() => {
    if (!noteStrokes) {
      return [];
    }
    const sets: StrokeSet[] = [];
    for (const entry of noteStrokes) {
      const payload = entry.payload as { strokes?: Record<string, unknown>[] } | undefined;
      const strokes = payload?.strokes ?? [];
      for (const stroke of strokes) {
        const points = parseStrokePoints(stroke);
        if (!points.length) {
          continue;
        }
        sets.push({ points, width: getStrokeWidth(stroke) });
      }
    }
    return sets;
  }, [noteStrokes]);

  const strokeBounds = useMemo(() => {
    let minX: number | null = null;
    let minY: number | null = null;
    let maxX: number | null = null;
    let maxY: number | null = null;
    for (const set of strokeSets) {
      for (const point of set.points) {
        minX = minX === null ? point.x : Math.min(minX, point.x);
        minY = minY === null ? point.y : Math.min(minY, point.y);
        maxX = maxX === null ? point.x : Math.max(maxX, point.x);
        maxY = maxY === null ? point.y : Math.max(maxY, point.y);
      }
    }
    if (minX === null || minY === null || maxX === null || maxY === null) {
      return null;
    }
    return { minX, minY, maxX, maxY };
  }, [strokeSets]);

  const cards = noteDetail?.cards ?? [];
  const card = cards[cardIndex];
  const noteTitle = noteDetail?.title ?? "Select a note";
  const subjectName = noteDetail?.subject.name ?? "Subject";
  const notebookName =
    subjectData?.notebooks.find((notebook) => notebook.id === notebookIdNumber)
      ?.name ?? noteDetail?.notebook.name ?? "Notebook";
  const hasNotes = Boolean(notes?.length);
  const summaryText =
    noteDetail?.summary || "Summaries will appear once processing completes.";
  const hasOcrText = Boolean(noteDetail?.ocr_text?.trim());

  useEffect(() => {
    if (!hasOcrText && viewMode === "digitized") {
      setViewMode("handwriting");
    }
  }, [hasOcrText, viewMode]);

  const breadcrumb = useMemo(
    () => (
      <div className="text-sm text-muted">
        <Link to="/app/library">Library</Link> /{" "}
        <Link to={`/app/subjects/${subjectId}`}>{subjectName}</Link> /{" "}
        <Link
          to={`/app/subjects/${subjectId}/notebooks/${notebookId}`}
          className="text-text"
        >
          {notebookName}
        </Link>
      </div>
    ),
    [subjectId, subjectName, notebookName, notebookId]
  );

  return (
    <div className="space-y-6">
      {breadcrumb}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {isRenamingNotebook ? (
            <div className="space-y-2">
              <input
                className="w-full rounded-xl border border-border bg-base px-3 py-2 text-sm"
                value={notebookNameInput}
                onChange={(event) => setNotebookNameInput(event.target.value)}
              />
              <div className="flex gap-2 text-xs">
                <button
                  className="rounded-lg border border-border px-3 py-1 text-muted"
                  onClick={() => {
                    setIsRenamingNotebook(false);
                    setNotebookNameInput(notebookName);
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-primary px-3 py-1 text-xs text-white"
                  onClick={async () => {
                    const name = notebookNameInput.trim();
                    if (!name) {
                      return;
                    }
                    await updateNotebook.mutateAsync({ name });
                    setIsRenamingNotebook(false);
                  }}
                  type="button"
                  disabled={updateNotebook.isPending}
                >
                  {updateNotebook.isPending ? "Saving…" : "Save"}
                </button>
              </div>
              {updateNotebook.isError ? (
                <p className="text-xs text-red-500">
                  {getApiErrorMessage(updateNotebook.error, "Failed to rename notebook.")}
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold">{notebookName}</h1>
              <p className="text-sm text-muted">{noteTitle}</p>
            </>
          )}
        </div>
        {!isRenamingNotebook ? (
          <button
            className="rounded-xl border border-border px-3 py-2 text-xs text-muted"
            onClick={() => {
              setNotebookNameInput(notebookName);
              setIsRenamingNotebook(true);
            }}
            type="button"
          >
            Rename Notebook
          </button>
        ) : null}
        <div className="flex items-center gap-2 rounded-xl bg-base p-1">
          <button
            className={`rounded-lg px-4 py-2 text-xs font-medium shadow-sm ${
              viewMode === "handwriting" ? "bg-white" : "text-muted"
            }`}
            onClick={() => setViewMode("handwriting")}
          >
            Original Handwriting
          </button>
          {hasOcrText ? (
            <button
              className={`rounded-lg px-4 py-2 text-xs ${
                viewMode === "digitized" ? "bg-white font-medium" : "text-muted"
              }`}
              onClick={() => setViewMode("digitized")}
            >
              Digitized Text
            </button>
          ) : (
            <button
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white"
              onClick={() => enqueueOcr.mutate()}
              disabled={!selectedNoteId || enqueueOcr.isPending}
              type="button"
            >
              {enqueueOcr.isPending ? "Enqueueing…" : "Enqueue OCR"}
            </button>
          )}
        </div>
        {enqueueOcr.isError ? (
          <p className="text-xs text-red-500">
            {getApiErrorMessage(enqueueOcr.error, "Unable to enqueue OCR.")}
          </p>
        ) : null}
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
                  type="button"
                >
                  <p className="font-semibold">{note.title}</p>
                  <p className="text-[11px] text-muted">
                    {note.flashcard_count} cards
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted">No notes in this notebook yet.</p>
              <button
                className="rounded-xl bg-text px-3 py-2 text-xs font-semibold text-white"
                onClick={async () => {
                  if (!notebookIdNumber) {
                    return;
                  }
                  setNoteActionError(null);
                  try {
                    const note = await createNote.mutateAsync({
                      title: "New Note",
                      notebook_id: notebookIdNumber,
                      device: "web",
                    });
                    setSelectedNoteId(note.id);
                    setCardIndex(0);
                  } catch (error) {
                    setNoteActionError(
                      getApiErrorMessage(error, "Unable to create note.")
                    );
                  }
                }}
                type="button"
                disabled={createNote.isPending}
              >
                {createNote.isPending ? "Creating…" : "+ Create Note"}
              </button>
              {noteActionError ? (
                <p className="text-xs text-red-500">{noteActionError}</p>
              ) : null}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-8 shadow-card">
          {isNoteLoading || isStrokesLoading ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-base text-sm text-muted">
              Loading handwriting…
            </div>
          ) : viewMode === "handwriting" ? (
            strokeSets.length ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-base">
                <svg
                  className="h-full w-full"
                  viewBox={
                    strokeBounds
                      ? `${strokeBounds.minX - 20} ${strokeBounds.minY - 20} ${
                          Math.max(1, strokeBounds.maxX - strokeBounds.minX + 40)
                        } ${Math.max(1, strokeBounds.maxY - strokeBounds.minY + 40)}`
                      : "0 0 1 1"
                  }
                >
                  {strokeSets.map((stroke, index) => (
                    <path
                      key={`${stroke.points.length}-${index}`}
                      d={stroke.points
                        .map((point, pointIndex) =>
                          `${pointIndex === 0 ? "M" : "L"} ${point.x} ${point.y}`
                        )
                        .join(" ")}
                      fill="none"
                      stroke="black"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={stroke.width}
                    />
                  ))}
                </svg>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-base text-sm text-muted">
                <p>No handwriting upload yet</p>
              </div>
            )
          ) : (
            <div className="space-y-3 text-sm text-text">
              <h3 className="text-sm font-semibold">Digitized Text</h3>
              <p className="text-xs text-muted">{noteDetail?.ocr_text}</p>
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
              type="button"
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
              type="button"
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
