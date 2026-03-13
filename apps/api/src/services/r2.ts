export async function signedFrameUrl(bucket: R2Bucket, key: string): Promise<string> {
  const object = await bucket.head(key);
  if (!object) {
    throw new Error(`Frame object not found: ${key}`);
  }

  // Public URL strategy can vary; this starter keeps object-key redirect semantics.
  return `/r2/${encodeURIComponent(key)}`;
}
