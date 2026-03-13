import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useConnections(shotId?: string) {
  return useQuery({
    queryKey: ["connections", shotId],
    queryFn: () => api.getConnections(shotId!),
    enabled: Boolean(shotId),
  });
}
