import { useQuery } from "@tanstack/react-query";
import {
  apiFetch,
  LibraryResponse,
  NoteDetail,
  NoteSummary,
  SubjectNotebooksResponse,
} from "./api";

export const useLibrary = () => {
  return useQuery({
    queryKey: ["library"],
    queryFn: () => apiFetch<LibraryResponse>("/api/library"),
  });
};

export const useSubjectNotebooks = (subjectId?: string) => {
  return useQuery({
    queryKey: ["subjects", subjectId, "notebooks"],
    queryFn: () =>
      apiFetch<SubjectNotebooksResponse>(`/api/subjects/${subjectId}/notebooks`),
    enabled: Boolean(subjectId),
  });
};

export const useNotebookNotes = (notebookId?: string) => {
  return useQuery({
    queryKey: ["notebooks", notebookId, "notes"],
    queryFn: () => apiFetch<NoteSummary[]>(`/api/notebooks/${notebookId}/notes`),
    enabled: Boolean(notebookId),
  });
};

export const useNoteDetail = (noteId?: number) => {
  return useQuery({
    queryKey: ["notes", noteId],
    queryFn: () => apiFetch<NoteDetail>(`/api/notes/${noteId}`),
    enabled: Boolean(noteId),
  });
};
