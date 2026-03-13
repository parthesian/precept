import type { ShotIngestPayload } from "@precept/shared";

export async function uploadIngestPayload(
  apiUrl: string,
  apiKey: string,
  payload: ShotIngestPayload
): Promise<{ film_id: string; shots_ingested: number }> {
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/api/ingest/shots`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ingest upload failed (${response.status}): ${text}`);
  }

  return (await response.json()) as { film_id: string; shots_ingested: number };
}
