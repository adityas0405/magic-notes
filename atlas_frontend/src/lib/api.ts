import { getStoredToken } from "./authStorage";

export const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";

export type LibraryNotebook = {
  id: number;
  name: string;
  color: string;
  icon: string;
  note_count: number;
};

export type LibrarySubject = {
  id: number;
  name: string;
  notebook_count: number;
};

export type LibraryResponse = {
  subjects: LibrarySubject[];
  notebooks: LibraryNotebook[];
};

export type SubjectNotebook = {
  id: number;
  name: string;
  color: string;
  icon: string;
  note_count: number;
  updated_at: string;
};

export type SubjectNotebooksResponse = {
  subject: {
    id: number;
    name: string;
  };
  notebooks: SubjectNotebook[];
};

export type SubjectMutation = {
  id: number;
  name: string;
  notebook_count: number;
};

export type NotebookMutation = {
  id: number;
  name: string;
  color: string;
  icon: string;
  note_count: number;
};

export type NoteSummary = {
  id: number;
  title: string;
  updated_at: string;
  flashcard_count: number;
};

export type NoteDetail = {
  id: number;
  title: string;
  summary: string;
  subject: {
    id: number | null;
    name: string | null;
  };
  notebook: {
    id: number | null;
    name: string | null;
  };
  updated_at: string;
  file_url: string;
  cards: { question: string; answer: string }[];
};

export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(status: number, detail?: string) {
    super(detail ?? "Request failed");
    this.status = status;
    this.detail = detail;
  }
}

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== "object" || !("status" in error)) {
    return fallback;
  }
  const status = (error as ApiError).status;
  const detail = (error as ApiError).detail;
  const friendly =
    status === 401
      ? "You’re not authorized. Please log in again."
      : status === 403
        ? "You don’t have access to this resource."
        : status === 404
          ? "We couldn’t find what you were looking for."
          : status >= 500
            ? "Server error. Please try again."
            : null;
  if (friendly && detail && detail !== friendly) {
    return `${friendly} (${detail})`;
  }
  return friendly ?? detail ?? fallback;
};

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
    ...options,
  });
  if (!response.ok) {
    let detail = "Request failed";
    try {
      const data = (await response.json()) as { detail?: string };
      if (data?.detail) {
        detail = data.detail;
      }
    } catch (error) {
      // ignore parse errors
    }
    throw new ApiError(response.status, detail);
  }
  return (await response.json()) as T;
}

export const createSubject = async (name: string) => {
  return apiFetch<SubjectMutation>("/api/subjects", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
};

export const renameSubject = async (subjectId: number, name: string) => {
  return apiFetch<SubjectMutation>(`/api/subjects/${subjectId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
};

export const deleteSubject = async (subjectId: number) => {
  return apiFetch<{ status: string }>(`/api/subjects/${subjectId}`, {
    method: "DELETE",
  });
};

export const createNotebook = async (
  subjectId: number,
  payload: { name: string; color?: string; icon?: string }
) => {
  return apiFetch<NotebookMutation>(`/api/subjects/${subjectId}/notebooks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateNotebook = async (
  notebookId: number,
  payload: { name?: string; color?: string; icon?: string }
) => {
  return apiFetch<NotebookMutation>(`/api/notebooks/${notebookId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

export const deleteNotebook = async (notebookId: number) => {
  return apiFetch<{ status: string }>(`/api/notebooks/${notebookId}`, {
    method: "DELETE",
  });
};

export const changePassword = async (payload: {
  current_password: string;
  new_password: string;
}) => {
  return apiFetch<{ status: string }>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};
