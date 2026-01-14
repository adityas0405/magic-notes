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
    throw new Error("Request failed");
  }
  return (await response.json()) as T;
}
