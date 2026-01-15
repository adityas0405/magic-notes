import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import PrimaryButton from "../components/PrimaryButton";
import { getApiErrorMessage } from "../lib/api";
import { useCreateSubject, useLibrary } from "../lib/queries";

const LibraryPage = () => {
  const { data, isLoading } = useLibrary();
  const subjects = data?.subjects ?? [];
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const createSubject = useCreateSubject();

  const handleCreate = async () => {
    const name = subjectName.trim();
    if (!name) {
      setFormError("Please enter a subject name.");
      return;
    }
    setFormError(null);
    try {
      const subject = await createSubject.mutateAsync(name);
      setSubjectName("");
      setIsModalOpen(false);
      navigate(`/app/subjects/${subject.id}`);
    } catch (error) {
      setFormError(getApiErrorMessage(error, "Unable to create subject."));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">My Knowledge Atlas</h1>
        <p className="mt-2 text-sm text-muted">Your collection of subjects and study materials</p>
      </div>
      <PrimaryButton
        className="rounded-xl px-5 py-2 text-xs"
        onClick={() => setIsModalOpen(true)}
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

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-card">
            <h2 className="text-lg font-semibold">New Subject</h2>
            <p className="mt-1 text-xs text-muted">Give your subject a name to get started.</p>
            <input
              className="mt-4 w-full rounded-xl border border-border bg-base px-3 py-2 text-sm"
              placeholder="e.g. Biology"
              value={subjectName}
              onChange={(event) => setSubjectName(event.target.value)}
            />
            {formError ? (
              <p className="mt-2 text-xs text-red-500">{formError}</p>
            ) : null}
            {createSubject.isError ? (
              <p className="mt-2 text-xs text-red-500">
                {getApiErrorMessage(createSubject.error, "Failed to create subject.")}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-xl border border-border px-4 py-2 text-xs text-muted"
                onClick={() => {
                  setIsModalOpen(false);
                  setFormError(null);
                }}
                type="button"
              >
                Cancel
              </button>
              <PrimaryButton
                className="rounded-xl px-4 py-2 text-xs"
                onClick={handleCreate}
                disabled={createSubject.isPending}
              >
                {createSubject.isPending ? "Creating…" : "Create"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default LibraryPage;
