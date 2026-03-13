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
  NarrativeFunction,
  SettingCategory,
  ShotScale,
  SoundDesignEmphasis,
  SubjectAction,
  TimeOfDay,
  shotSchema,
} from "@cinegraph/shared";
import type { AudioMetadata } from "./audio-extract";

export interface TaggedShotDraft {
  shot_index: number;
  frames: string[];
  thumbnail: string;
  audio_clip?: string;
  audio_metadata?: AudioMetadata;
}

export async function tagShotsWithVisionModel(
  input: TaggedShotDraft[],
  _filmTitle: string,
  _year: number,
  _director: string
) {
  const limit = pLimit(5);
  const tasks = input.map((shot) =>
    limit(async () => {
      const tagged = {
        shot_index: shot.shot_index,
        timecode_start: shot.shot_index * 4,
        timecode_end: shot.shot_index * 4 + 4,
        duration_seconds: 4,
        frames: shot.frames,
        thumbnail: shot.thumbnail,
        audio_clip: shot.audio_clip,
        shot_scale: ShotScale.MEDIUM_SHOT,
        camera_angle: CameraAngle.EYE_LEVEL,
        camera_movement: [CameraMovement.STATIC],
        composition: [Composition.RULE_OF_THIRDS],
        lighting: LightingStyle.LOW_KEY,
        color_palette: [ColorPalette.COOL],
        dominant_colors: ["#222222", "#4A5568", "#A0AEC0"],
        location_type: LocationType.INTERIOR,
        setting: SettingCategory.ROOM,
        time_of_day: TimeOfDay.NIGHT,
        subject_count: 1,
        subject_actions: [SubjectAction.LOOKING],
        emotional_register: [EmotionalRegister.TENSION],
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
        llm_description: "Starter generated shot metadata. Replace with Claude vision output.",
      };

      return shotSchema.parse(tagged);
    })
  );

  return Promise.all(tasks);
}
