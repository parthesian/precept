import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useSimilarShots(embedding?: number[]) {
  return useQuery({
    queryKey: ["similar-shots", embedding],
    queryFn: () => api.getSimilarShots(embedding ?? []),
    enabled: Boolean(embedding && embedding.length),
  });
}
