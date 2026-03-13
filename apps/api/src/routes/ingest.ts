import { Hono } from "hono";
import type { ShotIngestPayload } from "@precept/shared";
import { ingestAuth } from "../middleware/auth";
import { generateId, nowIsoString, toSqliteBool } from "../services/d1";
import { upsertVectors } from "../services/vectorize";

type Bindings = {
  DB: D1Database;
  FRAMES: R2Bucket;
  VECTORS: VectorizeIndex;
  API_KEY: string;
};

export const ingestRouter = new Hono<{ Bindings: Bindings }>();

ingestRouter.use("*", ingestAuth);

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.codePointAt(i) ?? 0;
  }
  return bytes;
}

ingestRouter.post("/ingest/shots", async (c) => {
  const payload = await c.req.json<ShotIngestPayload>();
  const filmId = generateId();

  await c.env.DB.prepare(
    "INSERT INTO films (id, title, year, director, cinematographer, genre, runtime_minutes, aspect_ratio, film_stock_or_camera, imdb_id, tmdb_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)"
  )
    .bind(
      filmId,
      payload.film.title,
      payload.film.year,
      payload.film.director,
      payload.film.cinematographer ?? null,
      JSON.stringify(payload.film.genre ?? []),
      payload.film.runtime_minutes,
      payload.film.aspect_ratio ?? null,
      payload.film.film_stock_or_camera ?? null,
      payload.film.imdb_id ?? null,
      payload.film.tmdb_id ?? null,
      nowIsoString()
    )
    .run();

  const vectors: Array<{ id: string; values: number[]; metadata: Record<string, VectorizeVectorMetadata> }> = [];

  for (const shot of payload.shots) {
    const shotId = generateId();
    const embeddingId = generateId();
    const frameKeys: string[] = [];

    for (const frame of shot.frame_buffers ?? []) {
      await c.env.FRAMES.put(frame.key, decodeBase64(frame.data_base64), {
        httpMetadata: { contentType: frame.content_type },
      });
      frameKeys.push(frame.key);
    }

    let audioKey: string | null = null;
    if (shot.audio_buffer) {
      await c.env.FRAMES.put(shot.audio_buffer.key, decodeBase64(shot.audio_buffer.data_base64), {
        httpMetadata: { contentType: shot.audio_buffer.content_type },
      });
      audioKey = shot.audio_buffer.key;
    }

    await c.env.DB.prepare(
      "INSERT INTO shots (id, film_id, shot_index, timecode_start, timecode_end, duration_seconds, frames, thumbnail, audio_clip, shot_scale, camera_angle, camera_movement, composition, lighting, color_palette, dominant_colors, location_type, setting, time_of_day, subject_count, subject_actions, emotional_register, narrative_function, props_or_motifs, music_present, music_type, music_mood, music_diegetic, audio_visual_relationship, sound_design, dialogue_present, specific_song, llm_description, embedding_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, ?30, ?31, ?32, ?33, ?34, ?35, ?36)"
    )
      .bind(
        shotId,
        filmId,
        shot.shot_index,
        shot.timecode_start,
        shot.timecode_end,
        shot.duration_seconds,
        JSON.stringify(frameKeys),
        frameKeys[Math.floor(frameKeys.length / 2)] ?? shot.thumbnail,
        audioKey,
        shot.shot_scale,
        shot.camera_angle,
        JSON.stringify(shot.camera_movement),
        JSON.stringify(shot.composition),
        shot.lighting,
        JSON.stringify(shot.color_palette),
        JSON.stringify(shot.dominant_colors),
        shot.location_type,
        shot.setting,
        shot.time_of_day,
        shot.subject_count,
        JSON.stringify(shot.subject_actions),
        JSON.stringify(shot.emotional_register),
        shot.narrative_function,
        JSON.stringify(shot.props_or_motifs ?? []),
        toSqliteBool(shot.music_present),
        shot.music_type ?? null,
        shot.music_mood ?? null,
        shot.music_diegetic == null ? null : toSqliteBool(shot.music_diegetic),
        shot.audio_visual_relationship,
        shot.sound_design,
        toSqliteBool(shot.dialogue_present),
        shot.specific_song ?? null,
        shot.llm_description,
        embeddingId,
        nowIsoString(),
        nowIsoString()
      )
      .run();

    vectors.push({
      id: embeddingId,
      values: shot.embedding_vector,
      metadata: {
        film_id: filmId,
        director: payload.film.director,
        shot_scale: shot.shot_scale,
        setting: shot.setting,
        emotional_register: shot.emotional_register.join(","),
      },
    });
  }

  await upsertVectors(c.env.VECTORS, vectors);
  return c.json({ film_id: filmId, shots_ingested: payload.shots.length }, 201);
});

ingestRouter.post("/ingest/frames", (c) => c.json({ error: "Use /api/ingest/shots in scaffold." }, 501));
ingestRouter.post("/ingest/embeddings", (c) => c.json({ error: "Use /api/ingest/shots in scaffold." }, 501));
