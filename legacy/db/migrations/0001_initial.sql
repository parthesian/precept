-- Films table
CREATE TABLE films (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  director TEXT NOT NULL,
  cinematographer TEXT,
  genre TEXT NOT NULL DEFAULT '[]',
  runtime_minutes INTEGER NOT NULL,
  aspect_ratio TEXT,
  film_stock_or_camera TEXT,
  imdb_id TEXT,
  tmdb_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_films_director ON films(director);
CREATE INDEX idx_films_year ON films(year);

-- Shots table
CREATE TABLE shots (
  id TEXT PRIMARY KEY,
  film_id TEXT NOT NULL REFERENCES films(id),
  shot_index INTEGER NOT NULL,
  timecode_start REAL NOT NULL,
  timecode_end REAL NOT NULL,
  duration_seconds REAL NOT NULL,

  frames TEXT NOT NULL DEFAULT '[]',
  thumbnail TEXT NOT NULL,
  audio_clip TEXT,

  shot_scale TEXT NOT NULL,
  camera_angle TEXT NOT NULL,
  camera_movement TEXT NOT NULL DEFAULT '[]',
  composition TEXT NOT NULL DEFAULT '[]',
  lighting TEXT NOT NULL,
  color_palette TEXT NOT NULL DEFAULT '[]',
  dominant_colors TEXT NOT NULL DEFAULT '[]',
  location_type TEXT NOT NULL,
  setting TEXT NOT NULL,
  time_of_day TEXT NOT NULL,

  subject_count INTEGER NOT NULL DEFAULT 0,
  subject_actions TEXT NOT NULL DEFAULT '[]',
  emotional_register TEXT NOT NULL DEFAULT '[]',
  narrative_function TEXT NOT NULL,
  props_or_motifs TEXT DEFAULT '[]',

  music_present INTEGER NOT NULL DEFAULT 0,
  music_type TEXT,
  music_mood TEXT,
  music_diegetic INTEGER,
  audio_visual_relationship TEXT NOT NULL DEFAULT 'neutral',
  sound_design TEXT NOT NULL DEFAULT 'ambient',
  dialogue_present INTEGER NOT NULL DEFAULT 0,
  specific_song TEXT,

  llm_description TEXT NOT NULL,
  embedding_id TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE(film_id, shot_index)
);

CREATE INDEX idx_shots_film ON shots(film_id);
CREATE INDEX idx_shots_scale ON shots(shot_scale);
CREATE INDEX idx_shots_setting ON shots(setting);
CREATE INDEX idx_shots_lighting ON shots(lighting);
CREATE INDEX idx_shots_narrative ON shots(narrative_function);
CREATE INDEX idx_shots_emotion ON shots(emotional_register);
CREATE INDEX idx_shots_music_type ON shots(music_type);
CREATE INDEX idx_shots_av_relationship ON shots(audio_visual_relationship);
CREATE INDEX idx_shots_timecode ON shots(film_id, timecode_start);

-- Connections between shots
CREATE TABLE connections (
  id TEXT PRIMARY KEY,
  source_shot_id TEXT NOT NULL REFERENCES shots(id),
  target_shot_id TEXT NOT NULL REFERENCES shots(id),
  connection_type TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'ai_suggested',
  description TEXT,
  evidence TEXT,
  similarity_score REAL,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE(source_shot_id, target_shot_id, connection_type)
);

CREATE INDEX idx_conn_source ON connections(source_shot_id);
CREATE INDEX idx_conn_target ON connections(target_shot_id);
CREATE INDEX idx_conn_type ON connections(connection_type);
CREATE INDEX idx_conn_confidence ON connections(confidence);

-- Directors table
CREATE TABLE directors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  known_influences TEXT DEFAULT '[]',
  active_years TEXT,
  signature_techniques TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
