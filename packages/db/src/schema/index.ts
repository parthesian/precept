import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/** Milliseconds since epoch (Workers-friendly). */
export type EpochMs = number;

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    handle: text("handle").notNull(),
    displayName: text("display_name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    avatarUrl: text("avatar_url"),
    role: text("role").notNull().default("contributor"),
    reputation: integer("reputation").notNull().default(0),
    contributionCounts: text("contribution_counts", { mode: "json" })
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    isSeedData: integer("is_seed_data", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("users_handle_uidx").on(t.handle),
    uniqueIndex("users_email_uidx").on(t.email),
  ]
);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: integer("expires_at", { mode: "number" }).notNull(),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const films = sqliteTable(
  "films",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    tmdbId: integer("tmdb_id"),
    imdbId: text("imdb_id"),
    title: text("title").notNull(),
    originalTitle: text("original_title"),
    releaseYear: integer("release_year").notNull(),
    releaseDate: text("release_date"),
    runtimeMinutes: integer("runtime_minutes"),
    country: text("country", { mode: "json" }).$type<string[]>().notNull().default([]),
    originalLanguage: text("original_language"),
    genres: text("genres", { mode: "json" }).$type<string[]>().notNull().default([]),
    synopsis: text("synopsis"),
    posterUrl: text("poster_url"),
    backdropUrl: text("backdrop_url"),
    aspectRatio: text("aspect_ratio"),
    colorFormat: text("color_format"),
    popularityScore: real("popularity_score").notNull().default(0),
    connectionCount: integer("connection_count").notNull().default(0),
    isSeedData: integer("is_seed_data", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("films_slug_uidx").on(t.slug),
    uniqueIndex("films_tmdb_uidx").on(t.tmdbId),
    index("films_year_idx").on(t.releaseYear),
    index("films_popularity_idx").on(t.popularityScore),
  ]
);

export const collections = sqliteTable(
  "collections",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    kind: text("kind").notNull(),
    isSeedData: integer("is_seed_data", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [uniqueIndex("collections_slug_uidx").on(t.slug)]
);

export const collectionFilms = sqliteTable(
  "collection_films",
  {
    id: text("id").primaryKey(),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    filmId: text("film_id")
      .notNull()
      .references(() => films.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    isSeedData: integer("is_seed_data", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [
    uniqueIndex("collection_films_uidx").on(t.collectionId, t.filmId),
    index("collection_films_film_idx").on(t.filmId),
  ]
);

export const people = sqliteTable(
  "people",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    tmdbPersonId: integer("tmdb_person_id"),
    name: text("name").notNull(),
    alsoKnownAs: text("also_known_as", { mode: "json" }).$type<string[]>().notNull().default([]),
    primaryDepartment: text("primary_department"),
    birthYear: integer("birth_year"),
    deathYear: integer("death_year"),
    bioSnippet: text("bio_snippet"),
    photoUrl: text("photo_url"),
    isSeedData: integer("is_seed_data", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("people_slug_uidx").on(t.slug),
    uniqueIndex("people_tmdb_uidx").on(t.tmdbPersonId),
  ]
);

export const credits = sqliteTable(
  "credits",
  {
    id: text("id").primaryKey(),
    personId: text("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    filmId: text("film_id")
      .notNull()
      .references(() => films.id, { onDelete: "cascade" }),
    roleType: text("role_type").notNull(),
    characterName: text("character_name"),
    billingOrder: integer("billing_order"),
    department: text("department"),
    isSeedData: integer("is_seed_data", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [
    index("credits_person_idx").on(t.personId),
    index("credits_film_idx").on(t.filmId),
    index("credits_role_idx").on(t.roleType),
  ]
);

export const connections = sqliteTable(
  "connections",
  {
    id: text("id").primaryKey(),
    sourceFilmId: text("source_film_id")
      .notNull()
      .references(() => films.id, { onDelete: "cascade" }),
    targetFilmId: text("target_film_id")
      .notNull()
      .references(() => films.id, { onDelete: "cascade" }),
    isDirected: integer("is_directed", { mode: "boolean" }).notNull().default(true),
    connectionType: text("connection_type").notNull(),
    confidenceTier: text("confidence_tier").notNull().default("proposed"),
    title: text("title").notNull(),
    rationale: text("rationale").notNull(),
    sourceAnchor: text("source_anchor", { mode: "json" }).$type<Record<string, unknown> | null>(),
    targetAnchor: text("target_anchor", { mode: "json" }).$type<Record<string, unknown> | null>(),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
    upvotes: integer("upvotes").notNull().default(0),
    downvotes: integer("downvotes").notNull().default(0),
    communityScore: integer("community_score").notNull().default(0),
    status: text("status").notNull().default("approved"),
    createdBy: text("created_by").references(() => users.id),
    approvedBy: text("approved_by").references(() => users.id),
    approvedAt: integer("approved_at", { mode: "number" }),
    isSeedData: integer("is_seed_data", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("connections_source_idx").on(t.sourceFilmId),
    index("connections_target_idx").on(t.targetFilmId),
    index("connections_type_idx").on(t.connectionType),
    index("connections_confidence_idx").on(t.confidenceTier),
    index("connections_score_idx").on(t.communityScore),
  ]
);

export const evidence = sqliteTable(
  "evidence",
  {
    id: text("id").primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    evidenceType: text("evidence_type").notNull(),
    url: text("url"),
    citationText: text("citation_text").notNull(),
    excerpt: text("excerpt"),
    pageOrTimestamp: text("page_or_timestamp"),
    submittedBy: text("submitted_by").references(() => users.id),
    isSeedData: integer("is_seed_data", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("evidence_target_idx").on(t.targetType, t.targetId)]
);

export const places = sqliteTable(
  "places",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    altNames: text("alt_names", { mode: "json" }).$type<string[]>().notNull().default([]),
    address: text("address"),
    locality: text("locality"),
    region: text("region"),
    country: text("country"),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    geohash: text("geohash"),
    placeKind: text("place_kind").notNull(),
    stillExtant: integer("still_extant", { mode: "boolean" }).notNull().default(true),
    notes: text("notes"),
    externalIds: text("external_ids", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    status: text("status").notNull().default("approved"),
    createdBy: text("created_by").references(() => users.id),
    approvedBy: text("approved_by").references(() => users.id),
    approvedAt: integer("approved_at", { mode: "number" }),
    isSeedData: integer("is_seed_data", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("places_slug_uidx").on(t.slug),
    index("places_geo_idx").on(t.lat, t.lng),
  ]
);

export const filmLocations = sqliteTable(
  "film_locations",
  {
    id: text("id").primaryKey(),
    filmId: text("film_id")
      .notNull()
      .references(() => films.id, { onDelete: "cascade" }),
    placeId: text("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    relationship: text("relationship").notNull(),
    sceneDescription: text("scene_description"),
    timecodeStart: text("timecode_start"),
    timecodeEnd: text("timecode_end"),
    isDoublingFor: text("is_doubling_for").references(() => places.id),
    upvotes: integer("upvotes").notNull().default(0),
    downvotes: integer("downvotes").notNull().default(0),
    communityScore: integer("community_score").notNull().default(0),
    status: text("status").notNull().default("approved"),
    createdBy: text("created_by").references(() => users.id),
    approvedBy: text("approved_by").references(() => users.id),
    approvedAt: integer("approved_at", { mode: "number" }),
    isSeedData: integer("is_seed_data", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("film_locations_film_idx").on(t.filmId),
    index("film_locations_place_idx").on(t.placeId),
  ]
);

export const precepts = sqliteTable(
  "precepts",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    aliases: text("aliases", { mode: "json" }).$type<string[]>().notNull().default([]),
    category: text("category").notNull(),
    shortDefinition: text("short_definition").notNull(),
    description: text("description").notNull(),
    originClaim: text("origin_claim", { mode: "json" }).$type<Record<string, unknown> | null>(),
    popularizedByFilmIds: text("popularized_by_film_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    status: text("status").notNull().default("approved"),
    createdBy: text("created_by").references(() => users.id),
    approvedBy: text("approved_by").references(() => users.id),
    approvedAt: integer("approved_at", { mode: "number" }),
    isSeedData: integer("is_seed_data", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("precepts_slug_uidx").on(t.slug),
    index("precepts_category_idx").on(t.category),
  ]
);

export const preceptRelations = sqliteTable(
  "precept_relations",
  {
    id: text("id").primaryKey(),
    sourcePreceptId: text("source_precept_id")
      .notNull()
      .references(() => precepts.id, { onDelete: "cascade" }),
    targetPreceptId: text("target_precept_id")
      .notNull()
      .references(() => precepts.id, { onDelete: "cascade" }),
    relationType: text("relation_type").notNull(),
    status: text("status").notNull().default("approved"),
    createdBy: text("created_by").references(() => users.id),
    approvedBy: text("approved_by").references(() => users.id),
    approvedAt: integer("approved_at", { mode: "number" }),
    isSeedData: integer("is_seed_data", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("precept_relations_source_idx").on(t.sourcePreceptId),
    index("precept_relations_target_idx").on(t.targetPreceptId),
  ]
);

export const preceptExamples = sqliteTable(
  "precept_examples",
  {
    id: text("id").primaryKey(),
    preceptId: text("precept_id")
      .notNull()
      .references(() => precepts.id, { onDelete: "cascade" }),
    filmId: text("film_id")
      .notNull()
      .references(() => films.id, { onDelete: "cascade" }),
    timecodeStart: text("timecode_start"),
    timecodeEnd: text("timecode_end"),
    description: text("description").notNull(),
    isCanonicalExample: integer("is_canonical_example", { mode: "boolean" }).notNull().default(false),
    upvotes: integer("upvotes").notNull().default(0),
    downvotes: integer("downvotes").notNull().default(0),
    communityScore: integer("community_score").notNull().default(0),
    status: text("status").notNull().default("approved"),
    createdBy: text("created_by").references(() => users.id),
    approvedBy: text("approved_by").references(() => users.id),
    approvedAt: integer("approved_at", { mode: "number" }),
    isSeedData: integer("is_seed_data", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("precept_examples_precept_idx").on(t.preceptId),
    index("precept_examples_film_idx").on(t.filmId),
    index("precept_examples_canonical_idx").on(t.isCanonicalExample),
  ]
);

export const suggestions = sqliteTable(
  "suggestions",
  {
    id: text("id").primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    operation: text("operation").notNull(),
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    source: text("source").notNull().default("user"),
    aiMetadata: text("ai_metadata", { mode: "json" }).$type<Record<string, unknown> | null>(),
    submitterNote: text("submitter_note"),
    status: text("status").notNull().default("pending"),
    submittedBy: text("submitted_by").references(() => users.id),
    reviewedBy: text("reviewed_by").references(() => users.id),
    reviewedAt: integer("reviewed_at", { mode: "number" }),
    reviewNote: text("review_note"),
    rejectionReason: text("rejection_reason"),
    duplicateOfId: text("duplicate_of_id"),
    communityScore: integer("community_score").notNull().default(0),
    isSeedData: integer("is_seed_data", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("suggestions_status_idx").on(t.status),
    index("suggestions_target_idx").on(t.targetType, t.targetId),
    index("suggestions_score_idx").on(t.communityScore),
  ]
);

export const revisions = sqliteTable(
  "revisions",
  {
    id: text("id").primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    revisionNumber: integer("revision_number").notNull(),
    diff: text("diff", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    suggestionId: text("suggestion_id").references(() => suggestions.id),
    actorId: text("actor_id").references(() => users.id),
    isSeedData: integer("is_seed_data", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("revisions_target_idx").on(t.targetType, t.targetId),
    uniqueIndex("revisions_number_uidx").on(t.targetType, t.targetId, t.revisionNumber),
  ]
);

export const votes = sqliteTable(
  "votes",
  {
    id: text("id").primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    value: integer("value").notNull(),
    isSeedData: integer("is_seed_data", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
  },
  (t) => [uniqueIndex("votes_unique_uidx").on(t.targetType, t.targetId, t.userId)]
);

export const flags = sqliteTable(
  "flags",
  {
    id: text("id").primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    note: text("note"),
    status: text("status").notNull().default("open"),
    submittedBy: text("submitted_by").references(() => users.id),
    isSeedData: integer("is_seed_data", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("flags_target_idx").on(t.targetType, t.targetId)]
);

export const spotlights = sqliteTable(
  "spotlights",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    filmId: text("film_id")
      .notNull()
      .references(() => films.id),
    headline: text("headline").notNull(),
    bodyMarkdown: text("body_markdown").notNull(),
    featuredConnectionIds: text("featured_connection_ids", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    publishedAt: integer("published_at", { mode: "number" }),
    status: text("status").notNull().default("approved"),
    createdBy: text("created_by").references(() => users.id),
    approvedBy: text("approved_by").references(() => users.id),
    isSeedData: integer("is_seed_data", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [uniqueIndex("spotlights_slug_uidx").on(t.slug)]
);
