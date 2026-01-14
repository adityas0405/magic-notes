export const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";

export type LibraryNotebook = {
  id: number;
  name: string;
  color: string;
  icon: string;
  note_count: number;
};

export type LibraryResponse = {
  notebooks: LibraryNotebook[];
};

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });
  if (!response.ok) {
    throw new Error("Request failed");
  }
  return (await response.json()) as T;
}
