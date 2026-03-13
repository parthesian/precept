export async function querySimilar(
  index: VectorizeIndex,
  vector: number[],
  topK = 12
): Promise<VectorizeMatches> {
  return index.query(vector, { topK, returnMetadata: "all" });
}

export async function upsertVectors(
  index: VectorizeIndex,
  vectors: Array<{ id: string; values: number[]; metadata?: Record<string, VectorizeVectorMetadata> }>
): Promise<void> {
  await index.upsert(vectors);
}
