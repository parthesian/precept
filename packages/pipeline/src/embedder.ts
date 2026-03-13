export async function embedThumbnail(_thumbnailPath: string): Promise<number[]> {
  // Placeholder 512-dim vector.
  return Array.from({ length: 512 }, (_, i) => Number(Math.sin(i).toFixed(6)));
}
