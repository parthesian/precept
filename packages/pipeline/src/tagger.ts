import { readFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import {
  AnalysisTier,
  AudioVisualRelationship,
  CameraAngle,
  CameraMovement,
  ColorPalette,
  Composition,
  EmotionalRegister,
  LightingStyle,
  LocationType,
  MusicMood,
  MusicType,
  NarrativeFunction,
  SettingCategory,
  ShotScale,
  SoundDesignEmphasis,
  SubjectAction,
  TimeOfDay,
  shotSchema,
} from "@precept/shared";
import type { AudioMetadata } from "./audio-extract.js";
import { loadPipelineConfig, type PipelineConfig, type VlmProvider } from "./config/pipeline-config.js";

export interface TaggedShotDraft {
  shot_index: number;
  timecode_start?: number;
  timecode_end?: number;
  duration_seconds?: number;
  frames: string[];
  thumbnail: string;
  audio_clip?: string;
  audio_metadata?: AudioMetadata;
  keyframe_diagnostics?: {
    candidate_count?: number;
    selected_count?: number;
    rejected_dedup?: number;
    rejected_blur?: number;
    avg_motion?: number;
    avg_entropy?: number;
  };
}

type ShotTaxonomyDraft = {
  shot_scale?: string;
  camera_angle?: string;
  camera_movement?: string[];
  composition?: string[];
  lighting?: string;
  color_palette?: string[];
  dominant_colors?: string[];
  location_type?: string;
  setting?: string;
  time_of_day?: string;
  subject_count?: number;
  subject_actions?: string[];
  emotional_register?: string[];
  narrative_function?: string;
  props_or_motifs?: string[];
  music_present?: boolean;
  music_type?: string;
  music_mood?: string;
  music_diegetic?: boolean;
  audio_visual_relationship?: string;
  sound_design?: string;
  dialogue_present?: boolean;
  specific_song?: string;
  llm_description?: string;
};

interface ClassificationResult {
  taxonomy: ShotTaxonomyDraft;
  tierUsed: AnalysisTier;
  provider: VlmProvider | "local";
  modelUsed: string;
  confidence: number;
}

const enumValues = <T extends Record<string, string>>(input: T): string[] => Object.values(input);

const taxonomyInstruction = `
Return ONLY minified JSON with this shape:
{
  "shot_scale": string,
  "camera_angle": string,
  "camera_movement": string[],
  "composition": string[],
  "lighting": string,
  "color_palette": string[],
  "dominant_colors": string[],
  "location_type": string,
  "setting": string,
  "time_of_day": string,
  "subject_count": number,
  "subject_actions": string[],
  "emotional_register": string[],
  "narrative_function": string,
  "props_or_motifs": string[],
  "music_present": boolean,
  "music_type": string,
  "music_mood": string,
  "music_diegetic": boolean,
  "audio_visual_relationship": string,
  "sound_design": string,
  "dialogue_present": boolean,
  "specific_song": string,
  "llm_description": string
}
Allowed values:
- shot_scale: ${enumValues(ShotScale).join(", ")}
- camera_angle: ${enumValues(CameraAngle).join(", ")}
- camera_movement: ${enumValues(CameraMovement).join(", ")}
- composition: ${enumValues(Composition).join(", ")}
- lighting: ${enumValues(LightingStyle).join(", ")}
- color_palette: ${enumValues(ColorPalette).join(", ")}
- location_type: ${enumValues(LocationType).join(", ")}
- setting: ${enumValues(SettingCategory).join(", ")}
- time_of_day: ${enumValues(TimeOfDay).join(", ")}
- subject_actions: ${enumValues(SubjectAction).join(", ")}
- emotional_register: ${enumValues(EmotionalRegister).join(", ")}
- narrative_function: ${enumValues(NarrativeFunction).join(", ")}
- music_type: ${enumValues(MusicType).join(", ")}
- music_mood: ${enumValues(MusicMood).join(", ")}
- audio_visual_relationship: ${enumValues(AudioVisualRelationship).join(", ")}
- sound_design: ${enumValues(SoundDesignEmphasis).join(", ")}
Rules:
- dominant_colors must be 1-5 hex strings like #RRGGBB.
- Keep arrays short and specific.
- llm_description must be concise (1-3 sentences) and cinematic.
- If uncertain, choose the closest allowed enum value.
`.trim();

function safeEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function safeEnumArray<T extends string>(value: unknown, allowed: T[], fallback: T[]): T[] {
  if (!Array.isArray(value)) return fallback;
  const filtered = value.filter((v): v is T => typeof v === "string" && allowed.includes(v as T));
  return filtered.length > 0 ? filtered : fallback;
}

function safeHexColors(value: unknown): string[] {
  if (!Array.isArray(value)) return ["#808080"];
  const out = value.filter((v): v is string => typeof v === "string" && /^#[0-9A-Fa-f]{6}$/.test(v));
  return out.length > 0 ? out.slice(0, 5) : ["#808080"];
}

function parseModelJson(raw: string): ShotTaxonomyDraft | null {
  const trimmed = raw.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  const first = withoutFence.indexOf("{");
  const last = withoutFence.lastIndexOf("}");
  if (first < 0 || last <= first) return null;
  const jsonCandidate = withoutFence.slice(first, last + 1);
  try {
    return JSON.parse(jsonCandidate) as ShotTaxonomyDraft;
  } catch {
    return null;
  }
}

class NarrativeMemory {
  private summary = "";
  private readonly recent: string[] = [];
  private shotCounter = 0;

  constructor(private readonly maxRecent = 5, private readonly compressEvery = 15) {}

  getContextBlock(): string {
    const recent = this.recent.length > 0 ? this.recent.map((line, i) => `${i + 1}. ${line}`).join("\n") : "None";
    return `Running summary:\n${this.summary || "None yet."}\n\nRecent shots:\n${recent}`;
  }

  update(newDescription: string): void {
    this.shotCounter += 1;
    this.recent.push(newDescription);
    if (this.recent.length > this.maxRecent) this.recent.shift();
    if (!this.summary) {
      this.summary = newDescription.slice(0, 900);
      return;
    }
    if (this.shotCounter % this.compressEvery === 0) {
      const compact = `${this.summary} ${this.recent.join(" ")}`;
      this.summary = compact.split(/\s+/).slice(-160).join(" ");
    }
  }
}

async function imageToBase64(path: string): Promise<string> {
  const raw = await readFile(path);
  return raw.toString("base64");
}

function buildUserPrompt(shot: TaggedShotDraft, filmTitle: string, year: number, director: string): string {
  const audioSummary = shot.audio_metadata
    ? `Audio hints: music=${shot.audio_metadata.has_music}, dialogue=${shot.audio_metadata.has_dialogue}, silence=${shot.audio_metadata.has_silence}, energy=${shot.audio_metadata.energy_level}.`
    : "Audio hints unavailable.";
  return [
    `Film: ${filmTitle} (${year}), director: ${director}.`,
    `Shot index: ${shot.shot_index}.`,
    audioSummary,
    "Analyze the provided frame set as one cinematic shot and classify it using the required taxonomy.",
  ].join(" ");
}

function fallbackTag(shot: TaggedShotDraft): ShotTaxonomyDraft {
  return {
    shot_scale: ShotScale.MEDIUM_SHOT,
    camera_angle: CameraAngle.EYE_LEVEL,
    camera_movement: [CameraMovement.STATIC],
    composition: [Composition.RULE_OF_THIRDS],
    lighting: LightingStyle.NATURAL,
    color_palette: [ColorPalette.DESATURATED],
    dominant_colors: ["#808080"],
    location_type: LocationType.INTERIOR,
    setting: SettingCategory.ROOM,
    time_of_day: TimeOfDay.AMBIGUOUS,
    subject_count: 1,
    subject_actions: [SubjectAction.NONE],
    emotional_register: [EmotionalRegister.AMBIGUITY],
    narrative_function: NarrativeFunction.TRANSITION,
    props_or_motifs: [],
    music_present: shot.audio_metadata?.has_music ?? false,
    audio_visual_relationship: AudioVisualRelationship.NEUTRAL,
    sound_design: SoundDesignEmphasis.AMBIENT,
    dialogue_present: shot.audio_metadata?.has_dialogue ?? false,
    llm_description: "Unable to confidently classify this shot from current visual output.",
  };
}

function complexityFromShot(shot: TaggedShotDraft): number {
  const motion = shot.keyframe_diagnostics?.avg_motion ?? 0;
  const entropy = shot.keyframe_diagnostics?.avg_entropy ?? 0;
  const frameCount = shot.frames.length;
  const hasDialogue = shot.audio_metadata?.has_dialogue ? 0.1 : 0;
  const hasMusic = shot.audio_metadata?.has_music ? 0.08 : 0;
  return Math.max(0, Math.min(1, motion / 20 + entropy / 10 + frameCount / 10 + hasDialogue + hasMusic));
}

function selectTier(config: PipelineConfig, complexity: number): AnalysisTier {
  if (complexity >= 0.7) return AnalysisTier.TIER_2;
  if (complexity <= 0.35) return AnalysisTier.TIER_0;
  return config.vlm.defaultTier === AnalysisTier.TIER_2 ? AnalysisTier.TIER_2 : AnalysisTier.TIER_1;
}

async function classifyShotWithClaude(
  apiKey: string,
  model: string,
  shot: TaggedShotDraft,
  filmTitle: string,
  year: number,
  director: string,
  memoryContext: string
): Promise<ShotTaxonomyDraft> {
  const client = new Anthropic({ apiKey });
  const imageBlocks = await Promise.all(
    shot.frames.slice(0, 5).map(async (framePath) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: "image/webp" as const,
        data: await imageToBase64(framePath),
      },
    }))
  );
  const response = await client.messages.create({
    model,
    max_tokens: 1000,
    temperature: 0.1,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: taxonomyInstruction },
          { type: "text", text: `${buildUserPrompt(shot, filmTitle, year, director)}\n\n${memoryContext}` },
          ...imageBlocks,
        ],
      },
    ],
  });
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => ("text" in block ? block.text : ""))
    .join("\n");
  const parsed = parseModelJson(text);
  if (parsed) return parsed;
  throw new Error(`Unparseable Claude response: ${text.slice(0, 240)}`);
}

async function classifyShotWithGemini(
  apiKey: string,
  model: string,
  shot: TaggedShotDraft,
  filmTitle: string,
  year: number,
  director: string,
  memoryContext: string
): Promise<ShotTaxonomyDraft> {
  const frameBase64 = await Promise.all(shot.frames.slice(0, 5).map((framePath) => imageToBase64(framePath)));
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: taxonomyInstruction },
              { text: `${buildUserPrompt(shot, filmTitle, year, director)}\n\n${memoryContext}` },
              ...frameBase64.map((data) => ({ inline_data: { mime_type: "image/webp", data } })),
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000,
        },
      }),
    }
  );
  if (!response.ok) {
    throw new Error(`Gemini request failed (${response.status}): ${await response.text()}`);
  }
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";
  const parsed = parseModelJson(text);
  if (parsed) return parsed;
  throw new Error(`Unparseable Gemini response: ${text.slice(0, 240)}`);
}

async function classifyShotWithQwen(
  qwenBaseUrl: string,
  model: string,
  shot: TaggedShotDraft,
  filmTitle: string,
  year: number,
  director: string,
  memoryContext: string
): Promise<ShotTaxonomyDraft> {
  const frameBase64 = await Promise.all(shot.frames.slice(0, 5).map((framePath) => imageToBase64(framePath)));
  const response = await fetch(`${qwenBaseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: taxonomyInstruction },
            { type: "text", text: `${buildUserPrompt(shot, filmTitle, year, director)}\n\n${memoryContext}` },
            ...frameBase64.map((data) => ({ type: "image_url", image_url: { url: `data:image/webp;base64,${data}` } })),
          ],
        },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`Qwen request failed (${response.status}): ${await response.text()}`);
  }
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = payload.choices?.[0]?.message?.content ?? "";
  const parsed = parseModelJson(text);
  if (parsed) return parsed;
  throw new Error(`Unparseable Qwen response: ${text.slice(0, 240)}`);
}

async function classifyByProvider(
  config: PipelineConfig,
  provider: VlmProvider,
  model: string,
  shot: TaggedShotDraft,
  filmTitle: string,
  year: number,
  director: string,
  memoryContext: string
): Promise<ShotTaxonomyDraft> {
  if (provider === "anthropic") {
    if (!config.keys.anthropicApiKey) throw new Error("ANTHROPIC_API_KEY missing");
    return classifyShotWithClaude(config.keys.anthropicApiKey, model, shot, filmTitle, year, director, memoryContext);
  }
  if (provider === "gemini") {
    if (!config.keys.geminiApiKey) throw new Error("GEMINI_API_KEY missing");
    return classifyShotWithGemini(config.keys.geminiApiKey, model, shot, filmTitle, year, director, memoryContext);
  }
  if (!config.endpoints.qwenBaseUrl) throw new Error("QWEN_BASE_URL missing");
  return classifyShotWithQwen(config.endpoints.qwenBaseUrl, model, shot, filmTitle, year, director, memoryContext);
}

export async function tagShotsWithVisionModel(
  input: TaggedShotDraft[],
  filmTitle: string,
  year: number,
  director: string
) {
  const config = loadPipelineConfig();
  const memory = new NarrativeMemory(5, config.vlm.summaryCompressEveryShots);
  const outputs = [];

  for (const shot of input) {
    const complexity = complexityFromShot(shot);
    const tier = selectTier(config, complexity);
    let result: ClassificationResult = {
      taxonomy: fallbackTag(shot),
      tierUsed: AnalysisTier.TIER_0,
      provider: "local",
      modelUsed: "local-heuristic",
      confidence: 0.5,
    };

    if (tier !== AnalysisTier.TIER_0) {
      const provider = tier === AnalysisTier.TIER_1 ? config.vlm.tier1Provider : config.vlm.tier2Provider;
      const model = tier === AnalysisTier.TIER_1 ? config.vlm.tier1Model : config.vlm.tier2Model;
      try {
        const taxonomy = await classifyByProvider(
          config,
          provider,
          model,
          shot,
          filmTitle,
          year,
          director,
          memory.getContextBlock()
        );
        result = {
          taxonomy,
          tierUsed: tier,
          provider,
          modelUsed: model,
          confidence: Math.max(0.55, 1 - complexity / 1.4),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Tiered tagging failed for shot ${shot.shot_index} (${provider}/${model}): ${message}`);
        result = {
          taxonomy: fallbackTag(shot),
          tierUsed: AnalysisTier.TIER_0,
          provider: "local",
          modelUsed: "local-heuristic",
          confidence: 0.45,
        };
      }
    }

    const raw = result.taxonomy;
    const timecodeStart = shot.timecode_start ?? shot.shot_index * 4;
    const durationSeconds =
      shot.duration_seconds ?? (shot.timecode_end != null ? Math.max(0.05, shot.timecode_end - timecodeStart) : 4);
    const timecodeEnd = shot.timecode_end ?? timecodeStart + durationSeconds;
    const audioHasMusic = shot.audio_metadata?.has_music;
    const audioHasDialogue = shot.audio_metadata?.has_dialogue;
    const musicPresent = audioHasMusic ?? raw.music_present ?? false;
    const dialoguePresent = audioHasDialogue ?? raw.dialogue_present ?? false;

    const tagged = shotSchema.parse({
      shot_index: shot.shot_index,
      timecode_start: Number(timecodeStart.toFixed(3)),
      timecode_end: Number(timecodeEnd.toFixed(3)),
      duration_seconds: Number(durationSeconds.toFixed(3)),
      frames: shot.frames,
      thumbnail: shot.thumbnail,
      audio_clip: shot.audio_clip,
      shot_scale: safeEnum(raw.shot_scale, enumValues(ShotScale), ShotScale.MEDIUM_SHOT),
      camera_angle: safeEnum(raw.camera_angle, enumValues(CameraAngle), CameraAngle.EYE_LEVEL),
      camera_movement: safeEnumArray(raw.camera_movement, enumValues(CameraMovement), [CameraMovement.STATIC]),
      composition: safeEnumArray(raw.composition, enumValues(Composition), [Composition.RULE_OF_THIRDS]),
      lighting: safeEnum(raw.lighting, enumValues(LightingStyle), LightingStyle.NATURAL),
      color_palette: safeEnumArray(raw.color_palette, enumValues(ColorPalette), [ColorPalette.DESATURATED]),
      dominant_colors: safeHexColors(raw.dominant_colors),
      location_type: safeEnum(raw.location_type, enumValues(LocationType), LocationType.INTERIOR),
      setting: safeEnum(raw.setting, enumValues(SettingCategory), SettingCategory.ROOM),
      time_of_day: safeEnum(raw.time_of_day, enumValues(TimeOfDay), TimeOfDay.AMBIGUOUS),
      subject_count:
        typeof raw.subject_count === "number" && Number.isFinite(raw.subject_count)
          ? Math.max(0, Math.round(raw.subject_count))
          : 1,
      subject_actions: safeEnumArray(raw.subject_actions, enumValues(SubjectAction), [SubjectAction.NONE]),
      emotional_register: safeEnumArray(raw.emotional_register, enumValues(EmotionalRegister), [
        EmotionalRegister.AMBIGUITY,
      ]),
      narrative_function: safeEnum(raw.narrative_function, enumValues(NarrativeFunction), NarrativeFunction.TRANSITION),
      props_or_motifs: Array.isArray(raw.props_or_motifs)
        ? raw.props_or_motifs.filter((x): x is string => typeof x === "string").slice(0, 12)
        : [],
      music_present: musicPresent,
      music_type: musicPresent && raw.music_type ? safeEnum(raw.music_type, enumValues(MusicType), MusicType.NONE) : undefined,
      music_mood: musicPresent && raw.music_mood ? safeEnum(raw.music_mood, enumValues(MusicMood), MusicMood.TENSE) : undefined,
      music_diegetic: typeof raw.music_diegetic === "boolean" ? raw.music_diegetic : undefined,
      audio_visual_relationship: safeEnum(
        raw.audio_visual_relationship,
        enumValues(AudioVisualRelationship),
        AudioVisualRelationship.NEUTRAL
      ),
      sound_design: safeEnum(raw.sound_design, enumValues(SoundDesignEmphasis), SoundDesignEmphasis.AMBIENT),
      dialogue_present: dialoguePresent,
      specific_song:
        typeof raw.specific_song === "string" && raw.specific_song.trim().length > 0
          ? raw.specific_song.trim().slice(0, 200)
          : undefined,
      llm_description:
        typeof raw.llm_description === "string" && raw.llm_description.trim().length > 0
          ? raw.llm_description.trim()
          : "Shot classification generated with partial confidence.",
      analysis_tier: result.tierUsed,
      analysis_provider: result.provider,
      analysis_model: result.modelUsed,
      analysis_confidence: Number(result.confidence.toFixed(4)),
      keyframe_diagnostics: shot.keyframe_diagnostics,
    });

    memory.update(tagged.llm_description);
    outputs.push(tagged);
  }

  return outputs;
}
