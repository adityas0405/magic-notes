import { Link } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import { useLibrary } from "../lib/queries";

const LibraryPage = () => {
  const { data, isLoading } = useLibrary();
  const subjects = data?.subjects ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">My Knowledge Atlas</h1>
        <p className="mt-2 text-sm text-muted">Your collection of subjects and study materials</p>
      </div>
      {/* TODO: enable subject creation once backend supports it. */}
      <PrimaryButton
        className="rounded-xl px-5 py-2 text-xs opacity-60 cursor-not-allowed"
        disabled
      >
        + New Subject
      </PrimaryButton>

      {isLoading ? (
        <p className="text-sm text-muted">Loading subjects…</p>
      ) : subjects.length ? (
        <div className="grid gap-6 md:grid-cols-2">
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              to={`/app/subjects/${subject.id}`}
              className="rounded-2xl border border-border bg-surface p-6 shadow-card transition hover:-translate-y-1"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-primary">
                ✦
              </div>
              <h3 className="mt-4 text-lg font-semibold">{subject.name}</h3>
              <p className="text-sm text-muted">
                {subject.notebook_count} Notebooks
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No subjects yet.</p>
      )}
    </div>
  );
};

export default LibraryPage;
