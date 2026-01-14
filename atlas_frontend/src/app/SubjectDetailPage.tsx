import { Link, useParams } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";

const notebooks = [
  {
    id: 1,
    title: "Organic Chemistry Basics",
    updated: "Last edited 1 days ago",
    pages: 0,
    cards: 4,
  },
  {
    id: 2,
    title: "World War II Timeline",
    updated: "Last edited 1 days ago",
    pages: 0,
    cards: 6,
  },
];

const SubjectDetailPage = () => {
  const { subjectId } = useParams();
  const subjectName = subjectId === "1" ? "Biology" : "Biology";

  return (
    <div className="space-y-6">
      <Link to="/app/library" className="text-sm text-muted">
        ← Back to Subjects
      </Link>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-primary">
          ✦
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{subjectName}</h1>
          <p className="text-sm text-muted">Your notebooks and study materials</p>
        </div>
      </div>
      <PrimaryButton className="rounded-xl px-5 py-2 text-xs">
        + New Notebook
      </PrimaryButton>

      <div className="space-y-4">
        {notebooks.map((notebook) => (
          <Link
            key={notebook.id}
            to={`/app/subjects/${subjectId}/notebooks/${notebook.id}`}
            className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-primary">
              ▢
            </div>
            <div>
              <h3 className="text-sm font-semibold">{notebook.title}</h3>
              <p className="text-xs text-muted">
                {notebook.updated} · {notebook.pages} Pages · {notebook.cards} Cards
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SubjectDetailPage;
