import { useState } from "react";
import { Link, useParams } from "react-router-dom";

const flashcards = [
  {
    question: "Why can carbon form so many different compounds?",
    answer: "It forms stable bonds with itself and other elements, allowing chains and rings.",
  },
  {
    question: "What is an isomer?",
    answer: "Compounds with the same formula but different structures.",
  },
];

const NotebookDetailPage = () => {
  const { subjectId, notebookId } = useParams();
  const [tab, setTab] = useState<"flashcards" | "summary">("flashcards");
  const [cardIndex, setCardIndex] = useState(0);

  const card = flashcards[cardIndex];

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted">
        <Link to="/app/library">Library</Link> / <Link to={`/app/subjects/${subjectId}`}>Biology</Link> /{" "}
        <span className="text-text">Organic Chemistry Basics</span>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Organic Chemistry Basics</h1>
        <div className="flex items-center gap-2 rounded-xl bg-base p-1">
          <button className="rounded-lg bg-white px-4 py-2 text-xs font-medium shadow-sm">
            Original Handwriting
          </button>
          <button className="rounded-lg px-4 py-2 text-xs text-muted">Digitized Text</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-card">
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-base text-sm text-muted">
            No image available for this page
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface shadow-card">
          <div className="flex border-b border-border text-xs font-semibold">
            <button
              className={`flex-1 px-4 py-3 ${tab === "flashcards" ? "text-primary border-b-2 border-primary" : "text-muted"}`}
              onClick={() => setTab("flashcards")}
            >
              Flashcards
            </button>
            <button
              className={`flex-1 px-4 py-3 ${tab === "summary" ? "text-primary border-b-2 border-primary" : "text-muted"}`}
              onClick={() => setTab("summary")}
            >
              Summary
            </button>
          </div>

          {tab === "flashcards" ? (
            <div className="space-y-4 p-5">
              <p className="text-center text-xs text-muted">Card {cardIndex + 1} of {flashcards.length}</p>
              <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-border bg-base p-6 text-center text-sm font-semibold text-text shadow-sm">
                {card.question}
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
                  disabled={cardIndex === flashcards.length - 1}
                  onClick={() => setCardIndex((prev) => Math.min(prev + 1, flashcards.length - 1))}
                >
                  Next →
                </button>
              </div>
              <p className="text-center text-[11px] text-muted">Click card to flip</p>
            </div>
          ) : (
            <div className="space-y-4 p-5">
              <h3 className="text-sm font-semibold">Summary</h3>
              <p className="text-xs text-muted">
                Summaries will appear here once the AI finishes processing your handwritten notes. Meanwhile, keep
                capturing and syncing your pages.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotebookDetailPage;
