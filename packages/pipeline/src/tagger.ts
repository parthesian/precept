import { readFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import pLimit from "p-limit";
import {
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

export interface TaggedShotDraft {
  shot_index: number;
  timecode_start?: number;
  timecode_end?: number;
  duration_seconds?: number;
  frames: string[];
  thumbnail: string;
  audio_clip?: string;
  audio_metadata?: AudioMetadata;
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

const configuredModel = process.env.ANTHROPIC_VISION_MODEL?.trim();
const anthropicModelCandidates = [
  configuredModel,
  "claude-sonnet-4-6",
  "claude-opus-4-6",
  "claude-haiku-4-5",
].filter((value): value is string => Boolean(value && value.length > 0));
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

function parseClaudeJson(raw: string): ShotTaxonomyDraft | null {
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

async function imageToBase64(path: string): Promise<string> {
  const raw = await readFile(path);
  return raw.toString("base64");
}

function buildUserPrompt(
  shot: TaggedShotDraft,
  filmTitle: string,
  year: number,
  director: string
): string {
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
    music_type: undefined,
    music_mood: undefined,
    music_diegetic: undefined,
    audio_visual_relationship: AudioVisualRelationship.NEUTRAL,
    sound_design: SoundDesignEmphasis.AMBIENT,
    dialogue_present: shot.audio_metadata?.has_dialogue ?? false,
    specific_song: undefined,
    llm_description: "Unable to confidently classify this shot from current visual output.",
  };
}

async function classifyShotWithClaude(
  client: Anthropic,
  shot: TaggedShotDraft,
  filmTitle: string,
  year: number,
  director: string
): Promise<ShotTaxonomyDraft> {
  const frames = shot.frames.slice(0, 5);
  const imageBlocks = await Promise.all(
    frames.map(async (framePath) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: "image/webp" as const,
        data: await imageToBase64(framePath),
      },
    }))
  );
  let response: Awaited<ReturnType<Anthropic["messages"]["create"]>> | null = null;
  let selectedModel: string | null = null;
  let lastError: unknown;
  for (const model of anthropicModelCandidates) {
    try {
      response = await client.messages.create({
        model,
        max_tokens: 1000,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: taxonomyInstruction },
              { type: "text", text: buildUserPrompt(shot, filmTitle, year, director) },
              ...imageBlocks,
            ],
          },
        ],
      });
      selectedModel = model;
      break;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      // Try another supported model when the current one is unavailable for this account.
      if (!/not_found_error|model:/i.test(message)) {
        throw error;
      }
    }
  }
  if (!response) {
    throw lastError instanceof Error
      ? lastError
      : new Error("Claude request failed for all configured model candidates.");
  }

  const textParts: string[] = [];
  for (const block of response.content) {
    if (block.type === "text" && "text" in block && typeof block.text === "string") {
      textParts.push(block.text);
    }
  }
  const textOutput = textParts.join("\n").trim();
  const parsed = parseClaudeJson(textOutput);
  if (parsed) {
    return parsed;
  }

  if (!selectedModel) {
    throw new Error("Claude response did not include a selected model.");
  }
  // Retry once with a JSON-repair prompt if the initial response is not parseable.
  const repair = await client.messages.create({
    model: selectedModel,
    max_tokens: 800,
    temperature: 0,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `${taxonomyInstruction}\n\nConvert this prior response into valid JSON for the required schema. Return JSON only:\n${textOutput}`,
          },
        ],
      },
    ],
  });
  const repairedParts: string[] = [];
  for (const block of repair.content) {
    if (block.type === "text" && "text" in block && typeof block.text === "string") {
      repairedParts.push(block.text);
    }
  }
  const repairedText = repairedParts.join("\n").trim();
  const repaired = parseClaudeJson(repairedText);
  if (repaired) {
    return repaired;
  }
  throw new Error(`Unparseable Claude response after repair attempt: ${textOutput.slice(0, 240)}`);
}

export async function tagShotsWithVisionModel(
  input: TaggedShotDraft[],
  filmTitle: string,
  year: number,
  director: string
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Set ANTHROPIC_API_KEY in environment.");
  }
  const client = new Anthropic({ apiKey });
  const limit = pLimit(2);
  const tasks = input.map((shot) =>
    limit(async () => {
      let raw = fallbackTag(shot);
      try {
        raw = await classifyShotWithClaude(client, shot, filmTitle, year, director);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Claude tagging failed for shot ${shot.shot_index}: ${message}`);
      }

      const timecodeStart = shot.timecode_start ?? shot.shot_index * 4;
      const durationSeconds =
        shot.duration_seconds ??
        (shot.timecode_end != null ? Math.max(0.05, shot.timecode_end - timecodeStart) : 4);
      const timecodeEnd = shot.timecode_end ?? timecodeStart + durationSeconds;
      const audioHasMusic = shot.audio_metadata?.has_music;
      const audioHasDialogue = shot.audio_metadata?.has_dialogue;
      const musicPresent = audioHasMusic ?? raw.music_present ?? false;
      const dialoguePresent = audioHasDialogue ?? raw.dialogue_present ?? false;

      const tagged = {
        shot_index: shot.shot_index,
        timecode_start: Number(timecodeStart.toFixed(3)),
        timecode_end: Number(timecodeEnd.toFixed(3)),
        duration_seconds: Number(durationSeconds.toFixed(3)),
        frames: shot.frames,
        thumbnail: shot.thumbnail,
        audio_clip: shot.audio_clip,
        shot_scale: safeEnum(raw.shot_scale, enumValues(ShotScale), ShotScale.MEDIUM_SHOT),
        camera_angle: safeEnum(raw.camera_angle, enumValues(CameraAngle), CameraAngle.EYE_LEVEL),
        camera_movement: safeEnumArray(raw.camera_movement, enumValues(CameraMovement), [
          CameraMovement.STATIC,
        ]),
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
        narrative_function: safeEnum(
          raw.narrative_function,
          enumValues(NarrativeFunction),
          NarrativeFunction.TRANSITION
        ),
        props_or_motifs: Array.isArray(raw.props_or_motifs)
          ? raw.props_or_motifs.filter((x): x is string => typeof x === "string").slice(0, 12)
          : [],
        music_present: musicPresent,
        music_type:
          musicPresent && raw.music_type
            ? safeEnum(raw.music_type, enumValues(MusicType), MusicType.NONE)
            : undefined,
        music_mood:
          musicPresent && raw.music_mood
            ? safeEnum(raw.music_mood, enumValues(MusicMood), MusicMood.TENSE)
            : undefined,
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
      };

      return shotSchema.parse(tagged);
    })
  );

  return Promise.all(tasks);
}
