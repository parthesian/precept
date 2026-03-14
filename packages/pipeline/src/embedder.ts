import { pipeline } from "@xenova/transformers";
import { loadPipelineConfig } from "./config/pipeline-config.js";
import { embedImageWithVisionService } from "./vision-service.js";

let extractorPromise: Promise<any> | null = null;

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline("image-feature-extraction", "Xenova/clip-vit-base-patch32");
  }
  return extractorPromise;
}

export async function embedThumbnail(thumbnailPath: string): Promise<number[]> {
  const config = loadPipelineConfig();
  if (config.features.enablePythonVisionService && config.endpoints.visionServiceUrl) {
    try {
      const response = await embedImageWithVisionService(config.endpoints.visionServiceUrl, thumbnailPath);
      if (Array.isArray(response.embedding) && response.embedding.length > 0) {
        return response.embedding;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Vision service embedding failed, using local CLIP embedding: ${message}`);
    }
  }

  const extractor = await getExtractor();
  const output = await extractor(thumbnailPath, { pooling: "mean", normalize: true });
  const values = Array.from(output?.data ?? []) as number[];
  if (values.length === 0) {
    throw new Error("CLIP embedding extractor returned empty vector.");
  }
  return values;
}
