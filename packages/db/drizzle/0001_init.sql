CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE user_role AS ENUM ('anon', 'contributor', 'trusted', 'moderator', 'admin');
CREATE TYPE collection_kind AS ENUM ('franchise', 'trilogy', 'thematic', 'shared_universe');
CREATE TYPE role_type AS ENUM ('director', 'cinematographer', 'editor', 'composer', 'production_designer', 'writer', 'actor', 'other');
CREATE TYPE connection_type AS ENUM (
  'homage', 'shot_for_shot_quotation', 'visual_motif', 'shared_technique', 'subversion_parody',
  'narrative_structure', 'remake_adaptation', 'audiovisual_parallel', 'stated_influence',
  'crew_lineage', 'soundtrack_reference'
);
CREATE TYPE confidence_tier AS ENUM ('confirmed', 'highly_likely', 'proposed', 'ai_suggested');
CREATE TYPE evidence_type AS ENUM (
  'interview', 'commentary', 'video_essay', 'book', 'article',
  'screenshot_link', 'timecode_pair', 'wiki', 'other'
);
CREATE TYPE content_status AS ENUM ('pending', 'approved', 'rejected', 'withdrawn');
CREATE TYPE place_kind AS ENUM ('building', 'street', 'landmark', 'natural', 'studio_backlot', 'neighborhood', 'region');
CREATE TYPE location_relationship AS ENUM ('filmed_at', 'set_in', 'both');
CREATE TYPE precept_category AS ENUM (
  'shot_type', 'camera_movement', 'lens_optics', 'lighting', 'editing', 'sound_audiovisual',
  'color', 'staging_blocking', 'narrative_device', 'genre_convention', 'vfx'
);
CREATE TYPE precept_relation_type AS ENUM ('broader', 'narrower', 'opposite_of', 'commonly_paired_with', 'see_also');
CREATE TYPE suggestion_target_type AS ENUM (
  'connection', 'film_location', 'place', 'precept', 'precept_relation',
  'precept_example', 'film', 'person', 'collection', 'spotlight'
);
CREATE TYPE suggestion_operation AS ENUM ('create', 'update', 'delete', 'merge');
CREATE TYPE suggestion_source AS ENUM ('user', 'ai', 'import');
CREATE TYPE suggestion_status AS ENUM ('pending', 'approved', 'rejected', 'needs_evidence', 'withdrawn', 'superseded');
CREATE TYPE rejection_reason AS ENUM (
  'insufficient_evidence', 'duplicate', 'factually_wrong', 'out_of_scope', 'low_quality', 'spam'
);
CREATE TYPE color_format AS ENUM ('color', 'bw', 'mixed');

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'contributor',
  reputation INTEGER NOT NULL DEFAULT 0,
  contribution_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_seed_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX users_handle_uidx ON users(handle);
CREATE UNIQUE INDEX users_email_uidx ON users(email);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE films (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  tmdb_id INTEGER,
  imdb_id TEXT,
  title TEXT NOT NULL,
  original_title TEXT,
  release_year INTEGER NOT NULL,
  release_date TEXT,
  runtime_minutes INTEGER,
  country JSONB NOT NULL DEFAULT '[]'::jsonb,
  original_language TEXT,
  genres JSONB NOT NULL DEFAULT '[]'::jsonb,
  synopsis TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  aspect_ratio TEXT,
  color_format color_format,
  popularity_score REAL NOT NULL DEFAULT 0,
  connection_count INTEGER NOT NULL DEFAULT 0,
  is_seed_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX films_slug_uidx ON films(slug);
CREATE UNIQUE INDEX films_tmdb_uidx ON films(tmdb_id);
CREATE INDEX films_year_idx ON films(release_year);
CREATE INDEX films_popularity_idx ON films(popularity_score);
CREATE INDEX films_title_trgm_idx ON films USING gin (title gin_trgm_ops);

CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  kind collection_kind NOT NULL,
  is_seed_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX collections_slug_uidx ON collections(slug);

CREATE TABLE collection_films (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  film_id TEXT NOT NULL REFERENCES films(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  is_seed_data BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX collection_films_uidx ON collection_films(collection_id, film_id);
CREATE INDEX collection_films_film_idx ON collection_films(film_id);

CREATE TABLE people (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  tmdb_person_id INTEGER,
  name TEXT NOT NULL,
  also_known_as JSONB NOT NULL DEFAULT '[]'::jsonb,
  primary_department TEXT,
  birth_year INTEGER,
  death_year INTEGER,
  bio_snippet TEXT,
  photo_url TEXT,
  is_seed_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX people_slug_uidx ON people(slug);
CREATE UNIQUE INDEX people_tmdb_uidx ON people(tmdb_person_id);
CREATE INDEX people_name_trgm_idx ON people USING gin (name gin_trgm_ops);

CREATE TABLE credits (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  film_id TEXT NOT NULL REFERENCES films(id) ON DELETE CASCADE,
  role_type role_type NOT NULL,
  character_name TEXT,
  billing_order INTEGER,
  department TEXT,
  is_seed_data BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX credits_person_idx ON credits(person_id);
CREATE INDEX credits_film_idx ON credits(film_id);
CREATE INDEX credits_role_idx ON credits(role_type);

CREATE TABLE connections (
  id TEXT PRIMARY KEY,
  source_film_id TEXT NOT NULL REFERENCES films(id) ON DELETE CASCADE,
  target_film_id TEXT NOT NULL REFERENCES films(id) ON DELETE CASCADE,
  is_directed BOOLEAN NOT NULL DEFAULT TRUE,
  connection_type connection_type NOT NULL,
  confidence_tier confidence_tier NOT NULL DEFAULT 'proposed',
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  source_anchor JSONB,
  target_anchor JSONB,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  community_score INTEGER NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'approved',
  created_by TEXT REFERENCES users(id),
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  is_seed_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX connections_source_idx ON connections(source_film_id);
CREATE INDEX connections_target_idx ON connections(target_film_id);
CREATE INDEX connections_type_idx ON connections(connection_type);
CREATE INDEX connections_confidence_idx ON connections(confidence_tier);
CREATE INDEX connections_score_idx ON connections(community_score);

CREATE TABLE evidence (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  evidence_type evidence_type NOT NULL,
  url TEXT,
  citation_text TEXT NOT NULL,
  excerpt TEXT,
  page_or_timestamp TEXT,
  submitted_by TEXT REFERENCES users(id),
  is_seed_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX evidence_target_idx ON evidence(target_type, target_id);

CREATE TABLE places (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  alt_names JSONB NOT NULL DEFAULT '[]'::jsonb,
  address TEXT,
  locality TEXT,
  region TEXT,
  country TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  geohash TEXT,
  place_kind place_kind NOT NULL,
  still_extant BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  external_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
  status content_status NOT NULL DEFAULT 'approved',
  created_by TEXT REFERENCES users(id),
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  is_seed_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX places_slug_uidx ON places(slug);
CREATE INDEX places_geo_idx ON places(lat, lng);
CREATE INDEX places_name_trgm_idx ON places USING gin (name gin_trgm_ops);

CREATE TABLE film_locations (
  id TEXT PRIMARY KEY,
  film_id TEXT NOT NULL REFERENCES films(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  relationship location_relationship NOT NULL,
  scene_description TEXT,
  timecode_start TEXT,
  timecode_end TEXT,
  is_doubling_for TEXT REFERENCES places(id),
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  community_score INTEGER NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'approved',
  created_by TEXT REFERENCES users(id),
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  is_seed_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX film_locations_film_idx ON film_locations(film_id);
CREATE INDEX film_locations_place_idx ON film_locations(place_id);

CREATE TABLE precepts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
  category precept_category NOT NULL,
  short_definition TEXT NOT NULL,
  description TEXT NOT NULL,
  origin_claim JSONB,
  popularized_by_film_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status content_status NOT NULL DEFAULT 'approved',
  created_by TEXT REFERENCES users(id),
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  is_seed_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX precepts_slug_uidx ON precepts(slug);
CREATE INDEX precepts_category_idx ON precepts(category);
CREATE INDEX precepts_name_trgm_idx ON precepts USING gin (name gin_trgm_ops);

CREATE TABLE precept_relations (
  id TEXT PRIMARY KEY,
  source_precept_id TEXT NOT NULL REFERENCES precepts(id) ON DELETE CASCADE,
  target_precept_id TEXT NOT NULL REFERENCES precepts(id) ON DELETE CASCADE,
  relation_type precept_relation_type NOT NULL,
  status content_status NOT NULL DEFAULT 'approved',
  created_by TEXT REFERENCES users(id),
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  is_seed_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX precept_relations_source_idx ON precept_relations(source_precept_id);
CREATE INDEX precept_relations_target_idx ON precept_relations(target_precept_id);

CREATE TABLE precept_examples (
  id TEXT PRIMARY KEY,
  precept_id TEXT NOT NULL REFERENCES precepts(id) ON DELETE CASCADE,
  film_id TEXT NOT NULL REFERENCES films(id) ON DELETE CASCADE,
  timecode_start TEXT,
  timecode_end TEXT,
  description TEXT NOT NULL,
  is_canonical_example BOOLEAN NOT NULL DEFAULT FALSE,
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  community_score INTEGER NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'approved',
  created_by TEXT REFERENCES users(id),
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  is_seed_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX precept_examples_precept_idx ON precept_examples(precept_id);
CREATE INDEX precept_examples_film_idx ON precept_examples(film_id);
CREATE INDEX precept_examples_canonical_idx ON precept_examples(is_canonical_example);

CREATE TABLE suggestions (
  id TEXT PRIMARY KEY,
  target_type suggestion_target_type NOT NULL,
  target_id TEXT,
  operation suggestion_operation NOT NULL,
  payload JSONB NOT NULL,
  source suggestion_source NOT NULL DEFAULT 'user',
  ai_metadata JSONB,
  submitter_note TEXT,
  status suggestion_status NOT NULL DEFAULT 'pending',
  submitted_by TEXT REFERENCES users(id),
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  rejection_reason rejection_reason,
  duplicate_of_id TEXT,
  community_score INTEGER NOT NULL DEFAULT 0,
  is_seed_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX suggestions_status_idx ON suggestions(status);
CREATE INDEX suggestions_target_idx ON suggestions(target_type, target_id);
CREATE INDEX suggestions_score_idx ON suggestions(community_score);

CREATE TABLE revisions (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  revision_number INTEGER NOT NULL,
  diff JSONB NOT NULL,
  suggestion_id TEXT REFERENCES suggestions(id),
  actor_id TEXT REFERENCES users(id),
  is_seed_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX revisions_target_idx ON revisions(target_type, target_id);
CREATE UNIQUE INDEX revisions_number_uidx ON revisions(target_type, target_id, revision_number);

CREATE TABLE votes (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value INTEGER NOT NULL,
  is_seed_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX votes_unique_uidx ON votes(target_type, target_id, user_id);

CREATE TABLE flags (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  submitted_by TEXT REFERENCES users(id),
  is_seed_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX flags_target_idx ON flags(target_type, target_id);

CREATE TABLE spotlights (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  film_id TEXT NOT NULL REFERENCES films(id),
  headline TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  featured_connection_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at TIMESTAMPTZ,
  status content_status NOT NULL DEFAULT 'approved',
  created_by TEXT REFERENCES users(id),
  approved_by TEXT REFERENCES users(id),
  is_seed_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX spotlights_slug_uidx ON spotlights(slug);
