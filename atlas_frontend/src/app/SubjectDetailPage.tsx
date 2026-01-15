import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import PrimaryButton from "../components/PrimaryButton";
import { getApiErrorMessage } from "../lib/api";
import {
  useCreateNotebook,
  useDeleteNotebook,
  useDeleteSubject,
  useRenameSubject,
  useSubjectNotebooks,
  useUpdateNotebook,
} from "../lib/queries";

const SubjectDetailPage = () => {
  const { subjectId } = useParams();
  const subjectIdNumber = subjectId ? Number(subjectId) : undefined;
  const { data, isLoading } = useSubjectNotebooks(subjectId);
  const subjectName = data?.subject.name ?? "Subject";
  const notebooks = data?.notebooks ?? [];
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [notebookName, setNotebookName] = useState("");
  const [notebookError, setNotebookError] = useState<string | null>(null);
  const [isRenamingSubject, setIsRenamingSubject] = useState(false);
  const [subjectNameInput, setSubjectNameInput] = useState(subjectName);
  const [editingNotebookId, setEditingNotebookId] = useState<number | null>(null);
  const [editingNotebookName, setEditingNotebookName] = useState("");
  const [subjectActionError, setSubjectActionError] = useState<string | null>(null);

  const createNotebook = useCreateNotebook(subjectIdNumber);
  const renameSubject = useRenameSubject(subjectIdNumber);
  const deleteSubject = useDeleteSubject();
  const updateNotebook = useUpdateNotebook(editingNotebookId ?? undefined, subjectIdNumber);
  const deleteNotebook = useDeleteNotebook(subjectIdNumber);

  useEffect(() => {
    setSubjectNameInput(subjectName);
  }, [subjectName]);

  const handleCreateNotebook = async () => {
    const name = notebookName.trim();
    if (!name) {
      setNotebookError("Please enter a notebook name.");
      return;
    }
    setNotebookError(null);
    try {
      await createNotebook.mutateAsync({ name });
      setNotebookName("");
      setIsCreateModalOpen(false);
    } catch (error) {
      setNotebookError(getApiErrorMessage(error, "Unable to create notebook."));
    }
  };

  const handleRenameSubject = async () => {
    const name = subjectNameInput.trim();
    if (!name) {
      return;
    }
    try {
      await renameSubject.mutateAsync(name);
      setIsRenamingSubject(false);
      setSubjectActionError(null);
    } catch (error) {
      setSubjectActionError(getApiErrorMessage(error, "Unable to rename subject."));
    }
  };

  const handleDeleteSubject = async () => {
    if (!subjectIdNumber) {
      return;
    }
    const confirmed = window.confirm("Delete this subject and all notebooks?");
    if (!confirmed) {
      return;
    }
    try {
      await deleteSubject.mutateAsync(subjectIdNumber);
      navigate("/app/library");
    } catch (error) {
      setSubjectActionError(getApiErrorMessage(error, "Unable to delete subject."));
    }
  };

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
          {isRenamingSubject ? (
            <div className="space-y-2">
              <input
                className="w-full rounded-xl border border-border bg-base px-3 py-2 text-sm"
                value={subjectNameInput}
                onChange={(event) => setSubjectNameInput(event.target.value)}
              />
              <div className="flex gap-2 text-xs">
                <button
                  className="rounded-lg border border-border px-3 py-1 text-muted"
                  onClick={() => {
                    setIsRenamingSubject(false);
                    setSubjectNameInput(subjectName);
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <PrimaryButton
                  className="rounded-lg px-3 py-1 text-xs"
                  onClick={handleRenameSubject}
                  disabled={renameSubject.isPending}
                >
                  {renameSubject.isPending ? "Saving…" : "Save"}
                </PrimaryButton>
              </div>
              {renameSubject.isError ? (
                <p className="text-xs text-red-500">
                  {getApiErrorMessage(renameSubject.error, "Failed to rename subject.")}
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold">{subjectName}</h1>
              <p className="text-sm text-muted">Your notebooks and study materials</p>
            </>
          )}
        </div>
        {!isRenamingSubject ? (
          <div className="ml-auto flex items-center gap-2">
            <button
              className="rounded-lg border border-border px-3 py-1 text-xs text-muted"
              onClick={() => setIsRenamingSubject(true)}
              type="button"
            >
              Rename
            </button>
            <button
              className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-500"
              onClick={handleDeleteSubject}
              type="button"
              disabled={deleteSubject.isPending}
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>
      {subjectActionError ? (
        <p className="text-xs text-red-500">{subjectActionError}</p>
      ) : null}
      <PrimaryButton
        className="rounded-xl px-5 py-2 text-xs"
        onClick={() => setIsCreateModalOpen(true)}
      >
        + New Notebook
      </PrimaryButton>

      {isLoading ? (
        <p className="text-sm text-muted">Loading notebooks…</p>
      ) : notebooks.length ? (
        <div className="space-y-4">
          {notebooks.map((notebook) => (
            <div
              key={notebook.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card"
            >
              {editingNotebookId === notebook.id ? (
                <div className="flex flex-1 flex-col gap-2">
                  <input
                    className="w-full rounded-xl border border-border bg-base px-3 py-2 text-sm"
                    value={editingNotebookName}
                    onChange={(event) => setEditingNotebookName(event.target.value)}
                  />
                  <div className="flex gap-2 text-xs">
                    <button
                      className="rounded-lg border border-border px-3 py-1 text-muted"
                      onClick={() => {
                        setEditingNotebookId(null);
                        setEditingNotebookName("");
                      }}
                      type="button"
                    >
                      Cancel
                    </button>
                    <PrimaryButton
                      className="rounded-lg px-3 py-1 text-xs"
                      onClick={async () => {
                        const name = editingNotebookName.trim();
                        if (!name) {
                          return;
                        }
                        await updateNotebook.mutateAsync({ name });
                        setEditingNotebookId(null);
                        setEditingNotebookName("");
                      }}
                      disabled={updateNotebook.isPending}
                    >
                      {updateNotebook.isPending ? "Saving…" : "Save"}
                    </PrimaryButton>
                  </div>
                  {updateNotebook.isError ? (
                    <p className="text-xs text-red-500">
                      {getApiErrorMessage(updateNotebook.error, "Failed to rename notebook.")}
                    </p>
                  ) : null}
                </div>
              ) : (
                <>
                  <Link
                    to={`/app/subjects/${subjectId}/notebooks/${notebook.id}`}
                    className="flex flex-1 items-center gap-4"
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
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-lg border border-border px-3 py-1 text-xs text-muted"
                      onClick={(event) => {
                        event.preventDefault();
                        setEditingNotebookId(notebook.id);
                        setEditingNotebookName(notebook.name);
                      }}
                      type="button"
                    >
                      Rename
                    </button>
                    <button
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-500"
                      onClick={async (event) => {
                        event.preventDefault();
                        const confirmed = window.confirm(
                          "Delete this notebook and its notes?"
                        );
                        if (!confirmed) {
                          return;
                        }
                        try {
                          await deleteNotebook.mutateAsync(notebook.id);
                          setSubjectActionError(null);
                        } catch (error) {
                          setSubjectActionError(
                            getApiErrorMessage(error, "Unable to delete notebook.")
                          );
                        }
                      }}
                      type="button"
                      disabled={deleteNotebook.isPending}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-base p-6 text-sm text-muted">
          <p className="font-medium text-text">Create your first notebook</p>
          <p className="mt-1 text-xs text-muted">
            Add a notebook to start capturing notes for this subject.
          </p>
          <PrimaryButton
            className="mt-4 rounded-xl px-4 py-2 text-xs"
            onClick={() => setIsCreateModalOpen(true)}
            type="button"
          >
            + New Notebook
          </PrimaryButton>
        </div>
      )}

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-card">
            <h2 className="text-lg font-semibold">New Notebook</h2>
            <p className="mt-1 text-xs text-muted">Add a notebook to this subject.</p>
            <input
              className="mt-4 w-full rounded-xl border border-border bg-base px-3 py-2 text-sm"
              placeholder="e.g. Lecture Notes"
              value={notebookName}
              onChange={(event) => setNotebookName(event.target.value)}
            />
            {notebookError ? (
              <p className="mt-2 text-xs text-red-500">{notebookError}</p>
            ) : null}
            {createNotebook.isError ? (
              <p className="mt-2 text-xs text-red-500">
                {getApiErrorMessage(createNotebook.error, "Failed to create notebook.")}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-xl border border-border px-4 py-2 text-xs text-muted"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setNotebookError(null);
                }}
                type="button"
              >
                Cancel
              </button>
              <PrimaryButton
                className="rounded-xl px-4 py-2 text-xs"
                onClick={handleCreateNotebook}
                disabled={createNotebook.isPending}
              >
                {createNotebook.isPending ? "Creating…" : "Create"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SubjectDetailPage;
