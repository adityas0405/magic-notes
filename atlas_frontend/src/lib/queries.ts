import { useQuery } from "@tanstack/react-query";
import { apiFetch, LibraryResponse } from "./api";

export const useLibrary = () => {
  return useQuery({
    queryKey: ["library"],
    queryFn: () => apiFetch<LibraryResponse>("/api/library"),
  });
};
