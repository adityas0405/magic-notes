import { Link } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import { useLibrary } from "../lib/queries";

const fallbackSubjects = [
  { id: 1, name: "Biology", note_count: 2 },
  { id: 2, name: "Physics", note_count: 1 },
];

const LibraryPage = () => {
  const { data } = useLibrary();
  const subjects = data?.notebooks?.length
    ? data.notebooks.map((notebook) => ({
        id: notebook.id,
        name: notebook.name,
        note_count: notebook.note_count,
      }))
    : fallbackSubjects;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">My Knowledge Atlas</h1>
        <p className="mt-2 text-sm text-muted">Your collection of subjects and study materials</p>
      </div>
      <PrimaryButton className="rounded-xl px-5 py-2 text-xs">
        + New Subject
      </PrimaryButton>

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
            <p className="text-sm text-muted">{subject.note_count} Notebooks</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default LibraryPage;
