import { and, eq, sql } from "drizzle-orm";
import {
  QUALIFYING_EVIDENCE_FOR_CONFIRMED,
  assertConfirmedHasQualifyingEvidence,
} from "@precept/shared";
import type { Db } from "../client.js";
import {
  collectionFilms,
  collections,
  connections,
  credits,
  evidence,
  filmLocations,
  films,
  people,
  places,
  preceptExamples,
  preceptRelations,
  precepts,
  revisions,
  spotlights,
  suggestions,
  users,
} from "../schema/index.js";
import { assertExcerptCap, newId, slugify } from "../utils.js";

const TRUSTED_THRESHOLD = Number(process.env.TRUSTED_APPROVALS_THRESHOLD ?? "10");

export type EvidenceInput = {
  evidence_type: string;
  url?: string | null;
  citation_text: string;
  excerpt?: string | null;
  page_or_timestamp?: string | null;
};

export type CreateSuggestionInput = {
  target_type: (typeof suggestions.$inferInsert)["targetType"];
  target_id?: string | null;
  operation: (typeof suggestions.$inferInsert)["operation"];
  payload: Record<string, unknown>;
  source?: "user" | "ai" | "import";
  ai_metadata?: Record<string, unknown> | null;
  evidence?: EvidenceInput[];
  submitter_note?: string | null;
  submitted_by: string;
  /** When true and actor is admin/moderator, approve in the same transaction. */
  auto_approve?: boolean;
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function validateEvidenceList(items: EvidenceInput[] | undefined): void {
  for (const item of items ?? []) {
    assertExcerptCap(item.excerpt);
  }
}

async function nextRevisionNumber(
  db: Db,
  targetType: string,
  targetId: string
): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`coalesce(max(${revisions.revisionNumber}), 0)` })
    .from(revisions)
    .where(and(eq(revisions.targetType, targetType), eq(revisions.targetId, targetId)));
  return Number(rows[0]?.n ?? 0) + 1;
}

async function writeEvidence(
  db: Db,
  targetType: string,
  targetId: string,
  items: EvidenceInput[] | undefined,
  submittedBy: string | null
): Promise<void> {
  for (const item of items ?? []) {
    assertExcerptCap(item.excerpt);
    await db.insert(evidence).values({
      id: newId(),
      targetType,
      targetId,
      evidenceType: item.evidence_type as (typeof evidence.$inferInsert)["evidenceType"],
      url: item.url ?? null,
      citationText: item.citation_text,
      excerpt: item.excerpt ?? null,
      pageOrTimestamp: item.page_or_timestamp ?? null,
      submittedBy,
    });
  }
}

async function bumpFilmConnectionCounts(db: Db, filmIds: string[]): Promise<void> {
  for (const filmId of [...new Set(filmIds)]) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(connections)
      .where(
        and(
          eq(connections.status, "approved"),
          sql`(${connections.sourceFilmId} = ${filmId} OR ${connections.targetFilmId} = ${filmId})`
        )
      );
    await db
      .update(films)
      .set({ connectionCount: count, updatedAt: new Date() })
      .where(eq(films.id, filmId));
  }
}

async function applyCreate(
  db: Db,
  targetType: CreateSuggestionInput["target_type"],
  payload: Record<string, unknown>,
  actorId: string,
  evidenceItems: EvidenceInput[] | undefined
): Promise<string> {
  const now = new Date();

  switch (targetType) {
    case "film": {
      const title = String(payload.title ?? "");
      const slug = String(payload.slug ?? slugify(title));
      const id = newId();
      await db.insert(films).values({
        id,
        slug,
        tmdbId: (payload.tmdb_id as number | undefined) ?? null,
        imdbId: (payload.imdb_id as string | undefined) ?? null,
        title,
        originalTitle: (payload.original_title as string | undefined) ?? null,
        releaseYear: Number(payload.release_year),
        releaseDate: (payload.release_date as string | undefined) ?? null,
        runtimeMinutes: (payload.runtime_minutes as number | undefined) ?? null,
        country: asStringArray(payload.country),
        originalLanguage: (payload.original_language as string | undefined) ?? null,
        genres: asStringArray(payload.genres),
        synopsis: (payload.synopsis as string | undefined) ?? null,
        posterUrl: (payload.poster_url as string | undefined) ?? null,
        backdropUrl: (payload.backdrop_url as string | undefined) ?? null,
        aspectRatio: (payload.aspect_ratio as string | undefined) ?? null,
        colorFormat: (payload.color_format as (typeof films.$inferInsert)["colorFormat"]) ?? null,
        popularityScore: Number(payload.popularity_score ?? 0),
        updatedAt: now,
      });
      return id;
    }
    case "person": {
      const name = String(payload.name ?? "");
      const id = newId();
      await db.insert(people).values({
        id,
        slug: String(payload.slug ?? slugify(name)),
        tmdbPersonId: (payload.tmdb_person_id as number | undefined) ?? null,
        name,
        alsoKnownAs: asStringArray(payload.also_known_as),
        primaryDepartment: (payload.primary_department as string | undefined) ?? null,
        birthYear: (payload.birth_year as number | undefined) ?? null,
        deathYear: (payload.death_year as number | undefined) ?? null,
        bioSnippet: (payload.bio_snippet as string | undefined) ?? null,
        photoUrl: (payload.photo_url as string | undefined) ?? null,
        updatedAt: now,
      });
      return id;
    }
    case "place": {
      const name = String(payload.name ?? "");
      const id = newId();
      await db.insert(places).values({
        id,
        slug: String(payload.slug ?? slugify(name)),
        name,
        altNames: asStringArray(payload.alt_names),
        address: (payload.address as string | undefined) ?? null,
        locality: (payload.locality as string | undefined) ?? null,
        region: (payload.region as string | undefined) ?? null,
        country: (payload.country as string | undefined) ?? null,
        lat: Number(payload.lat),
        lng: Number(payload.lng),
        geohash: (payload.geohash as string | undefined) ?? null,
        placeKind: payload.place_kind as (typeof places.$inferInsert)["placeKind"],
        stillExtant: payload.still_extant !== false,
        notes: (payload.notes as string | undefined) ?? null,
        externalIds: (payload.external_ids as Record<string, unknown>) ?? {},
        status: "approved",
        createdBy: actorId,
        approvedBy: actorId,
        approvedAt: now,
        updatedAt: now,
      });
      return id;
    }
    case "connection": {
      const confidence = String(payload.confidence_tier ?? "proposed");
      const ev = (evidenceItems ??
        (payload.evidence as EvidenceInput[] | undefined) ??
        []) as EvidenceInput[];
      assertConfirmedHasQualifyingEvidence(confidence, ev);
      if (confidence === "confirmed") {
        const ok = ev.some((e) =>
          (QUALIFYING_EVIDENCE_FOR_CONFIRMED as readonly string[]).includes(e.evidence_type)
        );
        if (!ok) throw new Error("confirmed requires qualifying evidence");
      }
      const id = newId();
      const sourceFilmId = String(payload.source_film_id);
      const targetFilmId = String(payload.target_film_id);
      await db.insert(connections).values({
        id,
        sourceFilmId,
        targetFilmId,
        isDirected: payload.is_directed !== false,
        connectionType: payload.connection_type as (typeof connections.$inferInsert)["connectionType"],
        confidenceTier: confidence as (typeof connections.$inferInsert)["confidenceTier"],
        title: String(payload.title),
        rationale: String(payload.rationale),
        sourceAnchor: payload.source_anchor ?? null,
        targetAnchor: payload.target_anchor ?? null,
        tags: asStringArray(payload.tags),
        status: "approved",
        createdBy: actorId,
        approvedBy: actorId,
        approvedAt: now,
        updatedAt: now,
      });
      await writeEvidence(db, "connection", id, ev, actorId);
      await bumpFilmConnectionCounts(db, [sourceFilmId, targetFilmId]);
      return id;
    }
    case "film_location": {
      let placeId = payload.place_id ? String(payload.place_id) : null;
      if (!placeId && payload.place && typeof payload.place === "object") {
        placeId = await applyCreate(db, "place", payload.place as Record<string, unknown>, actorId, []);
      }
      if (!placeId) throw new Error("film_location requires place_id or nested place");
      const id = newId();
      await db.insert(filmLocations).values({
        id,
        filmId: String(payload.film_id),
        placeId,
        relationship: payload.relationship as (typeof filmLocations.$inferInsert)["relationship"],
        sceneDescription: (payload.scene_description as string | undefined) ?? null,
        timecodeStart: (payload.timecode_start as string | undefined) ?? null,
        timecodeEnd: (payload.timecode_end as string | undefined) ?? null,
        isDoublingFor: (payload.is_doubling_for as string | undefined) ?? null,
        status: "approved",
        createdBy: actorId,
        approvedBy: actorId,
        approvedAt: now,
        updatedAt: now,
      });
      await writeEvidence(
        db,
        "film_location",
        id,
        (evidenceItems ?? (payload.evidence as EvidenceInput[] | undefined)) as EvidenceInput[],
        actorId
      );
      return id;
    }
    case "precept": {
      const name = String(payload.name ?? "");
      const id = newId();
      await db.insert(precepts).values({
        id,
        slug: String(payload.slug ?? slugify(name)),
        name,
        aliases: asStringArray(payload.aliases),
        category: payload.category as (typeof precepts.$inferInsert)["category"],
        shortDefinition: String(payload.short_definition),
        description: String(payload.description),
        originClaim: payload.origin_claim ?? null,
        popularizedByFilmIds: asStringArray(payload.popularized_by_film_ids),
        status: "approved",
        createdBy: actorId,
        approvedBy: actorId,
        approvedAt: now,
        updatedAt: now,
      });
      return id;
    }
    case "precept_relation": {
      const id = newId();
      await db.insert(preceptRelations).values({
        id,
        sourcePreceptId: String(payload.source_precept_id),
        targetPreceptId: String(payload.target_precept_id),
        relationType: payload.relation_type as (typeof preceptRelations.$inferInsert)["relationType"],
        status: "approved",
        createdBy: actorId,
        approvedBy: actorId,
        approvedAt: now,
      });
      return id;
    }
    case "precept_example": {
      const id = newId();
      await db.insert(preceptExamples).values({
        id,
        preceptId: String(payload.precept_id),
        filmId: String(payload.film_id),
        timecodeStart: (payload.timecode_start as string | undefined) ?? null,
        timecodeEnd: (payload.timecode_end as string | undefined) ?? null,
        description: String(payload.description),
        isCanonicalExample: Boolean(payload.is_canonical_example),
        status: "approved",
        createdBy: actorId,
        approvedBy: actorId,
        approvedAt: now,
        updatedAt: now,
      });
      await writeEvidence(
        db,
        "precept_example",
        id,
        (evidenceItems ?? (payload.evidence as EvidenceInput[] | undefined)) as EvidenceInput[],
        actorId
      );
      return id;
    }
    case "collection": {
      const name = String(payload.name ?? "");
      const id = newId();
      await db.insert(collections).values({
        id,
        slug: String(payload.slug ?? slugify(name)),
        name,
        description: (payload.description as string | undefined) ?? null,
        kind: payload.kind as (typeof collections.$inferInsert)["kind"],
        updatedAt: now,
      });
      const filmIds = asStringArray(payload.film_ids);
      let position = 0;
      for (const filmId of filmIds) {
        await db.insert(collectionFilms).values({
          id: newId(),
          collectionId: id,
          filmId,
          position: position++,
        });
      }
      return id;
    }
    case "spotlight": {
      const id = newId();
      const headline = String(payload.headline ?? "");
      await db.insert(spotlights).values({
        id,
        slug: String(payload.slug ?? slugify(headline)),
        filmId: String(payload.film_id),
        headline,
        bodyMarkdown: String(payload.body_markdown),
        featuredConnectionIds: asStringArray(payload.featured_connection_ids),
        publishedAt: payload.published_at ? new Date(String(payload.published_at)) : now,
        status: "approved",
        createdBy: actorId,
        approvedBy: actorId,
        updatedAt: now,
      });
      return id;
    }
    default:
      throw new Error(`Unsupported create target_type: ${targetType}`);
  }
}

async function applyUpdate(
  db: Db,
  targetType: CreateSuggestionInput["target_type"],
  targetId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const now = new Date();
  switch (targetType) {
    case "film":
      await db
        .update(films)
        .set({
          ...(payload.title != null ? { title: String(payload.title) } : {}),
          ...(payload.synopsis != null ? { synopsis: String(payload.synopsis) } : {}),
          ...(payload.poster_url != null ? { posterUrl: String(payload.poster_url) } : {}),
          ...(payload.popularity_score != null
            ? { popularityScore: Number(payload.popularity_score) }
            : {}),
          updatedAt: now,
        })
        .where(eq(films.id, targetId));
      return;
    case "connection": {
      if (payload.confidence_tier === "confirmed") {
        const existing = await db
          .select()
          .from(evidence)
          .where(and(eq(evidence.targetType, "connection"), eq(evidence.targetId, targetId)));
        const merged = [
          ...existing.map((e) => ({ evidence_type: e.evidenceType })),
          ...(((payload.evidence as EvidenceInput[]) ?? []).map((e) => ({
            evidence_type: e.evidence_type,
          })) as Array<{ evidence_type: string }>),
        ];
        assertConfirmedHasQualifyingEvidence("confirmed", merged);
      }
      await db
        .update(connections)
        .set({
          ...(payload.title != null ? { title: String(payload.title) } : {}),
          ...(payload.rationale != null ? { rationale: String(payload.rationale) } : {}),
          ...(payload.confidence_tier != null
            ? {
                confidenceTier:
                  payload.confidence_tier as (typeof connections.$inferInsert)["confidenceTier"],
              }
            : {}),
          ...(payload.connection_type != null
            ? {
                connectionType:
                  payload.connection_type as (typeof connections.$inferInsert)["connectionType"],
              }
            : {}),
          updatedAt: now,
        })
        .where(eq(connections.id, targetId));
      return;
    }
    case "place":
      await db
        .update(places)
        .set({
          ...(payload.name != null ? { name: String(payload.name) } : {}),
          ...(payload.notes != null ? { notes: String(payload.notes) } : {}),
          updatedAt: now,
        })
        .where(eq(places.id, targetId));
      return;
    case "precept":
      await db
        .update(precepts)
        .set({
          ...(payload.name != null ? { name: String(payload.name) } : {}),
          ...(payload.short_definition != null
            ? { shortDefinition: String(payload.short_definition) }
            : {}),
          ...(payload.description != null ? { description: String(payload.description) } : {}),
          updatedAt: now,
        })
        .where(eq(precepts.id, targetId));
      return;
    case "spotlight":
      await db
        .update(spotlights)
        .set({
          ...(payload.headline != null ? { headline: String(payload.headline) } : {}),
          ...(payload.body_markdown != null ? { bodyMarkdown: String(payload.body_markdown) } : {}),
          ...(payload.featured_connection_ids != null
            ? { featuredConnectionIds: asStringArray(payload.featured_connection_ids) }
            : {}),
          updatedAt: now,
        })
        .where(eq(spotlights.id, targetId));
      return;
    default:
      throw new Error(`Unsupported update target_type: ${targetType}`);
  }
}

async function applyDelete(
  db: Db,
  targetType: CreateSuggestionInput["target_type"],
  targetId: string
): Promise<void> {
  switch (targetType) {
    case "connection": {
      const [row] = await db.select().from(connections).where(eq(connections.id, targetId));
      await db.delete(connections).where(eq(connections.id, targetId));
      if (row) await bumpFilmConnectionCounts(db, [row.sourceFilmId, row.targetFilmId]);
      return;
    }
    case "film_location":
      await db.delete(filmLocations).where(eq(filmLocations.id, targetId));
      return;
    case "place":
      await db.delete(places).where(eq(places.id, targetId));
      return;
    case "precept":
      await db.delete(precepts).where(eq(precepts.id, targetId));
      return;
    case "precept_relation":
      await db.delete(preceptRelations).where(eq(preceptRelations.id, targetId));
      return;
    case "precept_example":
      await db.delete(preceptExamples).where(eq(preceptExamples.id, targetId));
      return;
    case "spotlight":
      await db.delete(spotlights).where(eq(spotlights.id, targetId));
      return;
    case "film":
      await db.delete(films).where(eq(films.id, targetId));
      return;
    case "person":
      await db.delete(people).where(eq(people.id, targetId));
      return;
    case "collection":
      await db.delete(collections).where(eq(collections.id, targetId));
      return;
    default:
      throw new Error(`Unsupported delete target_type: ${targetType}`);
  }
}

async function isLowRiskAutoApprove(
  operation: CreateSuggestionInput["operation"],
  targetType: CreateSuggestionInput["target_type"],
  payload: Record<string, unknown>
): Promise<boolean> {
  if (operation !== "update") return false;
  if (targetType === "connection" || targetType === "film_location" || targetType === "precept_example") {
    const keys = Object.keys(payload).filter((k) => k !== "evidence");
    if (keys.length === 0 && Array.isArray(payload.evidence)) return true;
  }
  if (targetType === "film" || targetType === "precept" || targetType === "place") {
    const keys = Object.keys(payload);
    return keys.every((k) => ["synopsis", "notes", "short_definition", "description"].includes(k));
  }
  return false;
}

/**
 * The only public mutator for live domain tables.
 * All creates/updates/deletes of product content go through suggestions → approve.
 */
export async function createSuggestion(db: Db, input: CreateSuggestionInput) {
  validateEvidenceList(input.evidence);
  if (input.source === "ai" && input.auto_approve) {
    throw new Error("AI suggestions cannot be auto-approved");
  }

  const [actor] = await db.select().from(users).where(eq(users.id, input.submitted_by));
  if (!actor) throw new Error("Unknown submitter");

  const suggestionId = newId();
  await db.insert(suggestions).values({
    id: suggestionId,
    targetType: input.target_type,
    targetId: input.target_id ?? null,
    operation: input.operation,
    payload: {
      ...input.payload,
      evidence: input.evidence ?? (input.payload.evidence as unknown) ?? [],
    },
    source: input.source ?? "user",
    aiMetadata: input.ai_metadata ?? null,
    submitterNote: input.submitter_note ?? null,
    status: "pending",
    submittedBy: input.submitted_by,
  });

  const roleAllowsSelfApprove =
    actor.role === "admin" || actor.role === "moderator" || actor.role === "trusted";
  const trustedHook =
    actor.role === "trusted" &&
    (await isLowRiskAutoApprove(input.operation, input.target_type, input.payload)) &&
    Number((actor.contributionCounts as { approved?: number })?.approved ?? 0) >= TRUSTED_THRESHOLD;

  const shouldApprove =
    input.auto_approve === true &&
    (actor.role === "admin" || actor.role === "moderator" || trustedHook) &&
    roleAllowsSelfApprove;

  if (shouldApprove) {
    return approveSuggestion(db, {
      suggestionId,
      reviewerId: input.submitted_by,
      reviewNote: "self-approved",
    });
  }

  return { suggestionId, status: "pending" as const, targetId: input.target_id ?? null };
}

export async function approveSuggestion(
  db: Db,
  args: { suggestionId: string; reviewerId: string; reviewNote?: string | null; edits?: Record<string, unknown> }
) {
  const [suggestion] = await db
    .select()
    .from(suggestions)
    .where(eq(suggestions.id, args.suggestionId));
  if (!suggestion) throw new Error("Suggestion not found");
  if (suggestion.status !== "pending" && suggestion.status !== "needs_evidence") {
    throw new Error(`Suggestion is ${suggestion.status}`);
  }
  if (suggestion.source === "ai" && suggestion.status === "pending") {
    // AI may be approved by a human moderator — never skipped.
  }

  const payload = {
    ...(suggestion.payload as Record<string, unknown>),
    ...(args.edits ?? {}),
  };
  const evidenceItems = (payload.evidence as EvidenceInput[] | undefined) ?? [];
  validateEvidenceList(evidenceItems);

  return db.transaction(async (tx) => {
    const dbTx = tx as unknown as Db;
    let targetId = suggestion.targetId;

    if (suggestion.operation === "create") {
      targetId = await applyCreate(
        dbTx,
        suggestion.targetType,
        payload,
        args.reviewerId,
        evidenceItems
      );
    } else if (suggestion.operation === "update") {
      if (!targetId) throw new Error("update requires target_id");
      await applyUpdate(dbTx, suggestion.targetType, targetId, payload);
      if (evidenceItems.length) {
        await writeEvidence(dbTx, suggestion.targetType, targetId, evidenceItems, args.reviewerId);
      }
    } else if (suggestion.operation === "delete") {
      if (!targetId) throw new Error("delete requires target_id");
      await applyDelete(dbTx, suggestion.targetType, targetId);
    } else if (suggestion.operation === "merge") {
      throw new Error("merge operation not implemented in v1 apply path");
    }

    if (!targetId) throw new Error("Missing target id after apply");

    const revisionNumber = await nextRevisionNumber(dbTx, suggestion.targetType, targetId);
    await dbTx.insert(revisions).values({
      id: newId(),
      targetType: suggestion.targetType,
      targetId,
      revisionNumber,
      diff: {
        operation: suggestion.operation,
        payload,
        suggestion_id: suggestion.id,
      },
      suggestionId: suggestion.id,
      actorId: args.reviewerId,
    });

    await dbTx
      .update(suggestions)
      .set({
        status: "approved",
        targetId,
        reviewedBy: args.reviewerId,
        reviewedAt: new Date(),
        reviewNote: args.reviewNote ?? null,
        updatedAt: new Date(),
      })
      .where(eq(suggestions.id, suggestion.id));

    if (suggestion.submittedBy) {
      const [submitter] = await dbTx
        .select()
        .from(users)
        .where(eq(users.id, suggestion.submittedBy));
      if (submitter) {
        const counts = {
          ...(submitter.contributionCounts as Record<string, number>),
        };
        counts.approved = Number(counts.approved ?? 0) + 1;
        const nextRole =
          submitter.role === "contributor" && counts.approved >= TRUSTED_THRESHOLD
            ? "trusted"
            : submitter.role;
        await dbTx
          .update(users)
          .set({
            contributionCounts: counts,
            role: nextRole,
            reputation: submitter.reputation + 1,
          })
          .where(eq(users.id, submitter.id));
      }
    }

    return { suggestionId: suggestion.id, status: "approved" as const, targetId };
  });
}

export async function rejectSuggestion(
  db: Db,
  args: {
    suggestionId: string;
    reviewerId: string;
    rejection_reason: (typeof suggestions.$inferInsert)["rejectionReason"];
    review_note?: string | null;
  }
) {
  const [suggestion] = await db
    .select()
    .from(suggestions)
    .where(eq(suggestions.id, args.suggestionId));
  if (!suggestion) throw new Error("Suggestion not found");
  await db
    .update(suggestions)
    .set({
      status: "rejected",
      rejectionReason: args.rejection_reason,
      reviewedBy: args.reviewerId,
      reviewedAt: new Date(),
      reviewNote: args.review_note ?? null,
      updatedAt: new Date(),
    })
    .where(eq(suggestions.id, args.suggestionId));
  return { suggestionId: args.suggestionId, status: "rejected" as const };
}

export async function withdrawSuggestion(db: Db, args: { suggestionId: string; userId: string }) {
  const [suggestion] = await db
    .select()
    .from(suggestions)
    .where(eq(suggestions.id, args.suggestionId));
  if (!suggestion) throw new Error("Suggestion not found");
  if (suggestion.submittedBy !== args.userId) throw new Error("Only submitter can withdraw");
  if (suggestion.status !== "pending") throw new Error("Only pending suggestions can be withdrawn");
  await db
    .update(suggestions)
    .set({ status: "withdrawn", updatedAt: new Date() })
    .where(eq(suggestions.id, args.suggestionId));
  return { suggestionId: args.suggestionId, status: "withdrawn" as const };
}

/** Intentionally not exported for general use — credits are import-only baseline. */
export async function insertCreditForImport(
  db: Db,
  values: typeof credits.$inferInsert
): Promise<void> {
  await db.insert(credits).values(values);
}
