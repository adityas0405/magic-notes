import { Link, useParams } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import { useSubjectNotebooks } from "../lib/queries";

const SubjectDetailPage = () => {
  const { subjectId } = useParams();
  const { data, isLoading } = useSubjectNotebooks(subjectId);
  const subjectName = data?.subject.name ?? "Subject";
  const notebooks = data?.notebooks ?? [];

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
      {/* TODO: enable notebook creation once backend supports it. */}
      <PrimaryButton
        className="rounded-xl px-5 py-2 text-xs opacity-60 cursor-not-allowed"
        disabled
      >
        + New Notebook
      </PrimaryButton>

      {isLoading ? (
        <p className="text-sm text-muted">Loading notebooks…</p>
      ) : notebooks.length ? (
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
                <h3 className="text-sm font-semibold">{notebook.name}</h3>
                <p className="text-xs text-muted">
                  {notebook.note_count} Notes
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No notebooks yet.</p>
      )}
    </div>
  );
};

export default SubjectDetailPage;
