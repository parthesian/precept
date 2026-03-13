import type { ShotIngestPayload } from "@cinegraph/shared";

export async function uploadIngestPayload(
  apiUrl: string,
  apiKey: string,
  payload: ShotIngestPayload
): Promise<void> {
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
}
