import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiFetch,
  changePassword,
  createNotebook,
  createSubject,
  deleteNotebook,
  deleteSubject,
  LibraryResponse,
  NoteDetail,
  NoteSummary,
  renameSubject,
  SubjectNotebooksResponse,
  updateNotebook,
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

export const useCreateSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createSubject(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["library"] });
      void queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
};

export const useRenameSubject = (subjectId?: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => {
      if (!subjectId) {
        throw new Error("Subject id is required");
      }
      return renameSubject(subjectId, name);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["library"] });
      if (subjectId) {
        void queryClient.invalidateQueries({
          queryKey: ["subjects", String(subjectId), "notebooks"],
        });
      }
    },
  });
};

export const useDeleteSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subjectId: number) => deleteSubject(subjectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["library"] });
      void queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
};

export const useCreateNotebook = (subjectId?: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; color?: string; icon?: string }) => {
      if (!subjectId) {
        throw new Error("Subject id is required");
      }
      return createNotebook(subjectId, payload);
    },
    onSuccess: () => {
      if (subjectId) {
        void queryClient.invalidateQueries({
          queryKey: ["subjects", String(subjectId), "notebooks"],
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["library"] });
    },
  });
};

export const useUpdateNotebook = (notebookId?: number, subjectId?: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name?: string; color?: string; icon?: string }) => {
      if (!notebookId) {
        throw new Error("Notebook id is required");
      }
      return updateNotebook(notebookId, payload);
    },
    onSuccess: () => {
      if (subjectId) {
        void queryClient.invalidateQueries({
          queryKey: ["subjects", String(subjectId), "notebooks"],
        });
      }
      if (notebookId) {
        void queryClient.invalidateQueries({
          queryKey: ["notebooks", String(notebookId), "notes"],
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["library"] });
    },
  });
};

export const useDeleteNotebook = (subjectId?: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notebookId: number) => deleteNotebook(notebookId),
    onSuccess: () => {
      if (subjectId) {
        void queryClient.invalidateQueries({
          queryKey: ["subjects", String(subjectId), "notebooks"],
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["library"] });
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: (payload: { current_password: string; new_password: string }) =>
      changePassword(payload),
  });
};
