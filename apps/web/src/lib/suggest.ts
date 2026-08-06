import { API_URL } from "./api";

export async function submitSuggestion(body: Record<string, unknown>): Promise<{
  ok: boolean;
  message: string;
  data?: any;
}> {
  const res = await fetch(`${API_URL}/api/suggestions`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    return { ok: false, message: json.errors?.[0]?.message ?? "Request failed" };
  }
  const status = json.data?.status;
  const id = json.data?.targetId ?? json.data?.suggestionId;
  return {
    ok: true,
    data: json.data,
    message:
      status === "approved"
        ? `Approved — ${id}`
        : `Queued suggestion ${json.data?.suggestionId ?? id}`,
  };
}
