import type {
  AudioVisualRelationship,
  CameraAngle,
  CameraMovement,
  ColorPalette,
  Composition,
  ConnectionConfidence,
  ConnectionType,
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
} from "./taxonomy.js";

export interface Film {
  id: string;
  title: string;
  year: number;
  director: string;
  cinematographer?: string;
  genre: string[];
  runtime_minutes: number;
  aspect_ratio?: string;
  film_stock_or_camera?: string;
  imdb_id?: string;
  tmdb_id?: number;
  created_at: string;
}

export interface Shot {
  id: string;
  film_id: string;
  shot_index: number;
  timecode_start: number;
  timecode_end: number;
  duration_seconds: number;
  frames: string[];
  thumbnail: string;
  audio_clip?: string;
  shot_scale: ShotScale;
  camera_angle: CameraAngle;
  camera_movement: CameraMovement[];
  composition: Composition[];
  lighting: LightingStyle;
  color_palette: ColorPalette[];
  dominant_colors: string[];
  location_type: LocationType;
  setting: SettingCategory;
  time_of_day: TimeOfDay;
  subject_count: number;
  subject_actions: SubjectAction[];
  emotional_register: EmotionalRegister[];
  narrative_function: NarrativeFunction;
  props_or_motifs?: string[];
  music_present: boolean;
  music_type?: MusicType;
  music_mood?: MusicMood;
  music_diegetic?: boolean;
  audio_visual_relationship: AudioVisualRelationship;
  sound_design: SoundDesignEmphasis;
  dialogue_present: boolean;
  specific_song?: string;
  llm_description: string;
  embedding_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Connection {
  id: string;
  source_shot_id: string;
  target_shot_id: string;
  connection_type: ConnectionType;
  confidence: ConnectionConfidence;
  description?: string;
  evidence?: string;
  similarity_score?: number;
  created_by: "system" | "user" | "ai";
  created_at: string;
}

export interface ShotIngestPayload {
  film: Omit<Film, "id" | "created_at">;
  shots: Array<
    Omit<Shot, "id" | "film_id" | "created_at" | "updated_at" | "embedding_id"> & {
      frame_buffers: { key: string; content_type: string; data_base64: string }[];
      audio_buffer?: { key: string; content_type: string; data_base64: string };
      embedding_vector: number[];
    }
  >;
}
