import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useSearch(queryString = "") {
  return useQuery({
    queryKey: ["search", queryString],
    queryFn: () => api.searchTags(queryString),
  });
}
