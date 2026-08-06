import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "anon",
  "contributor",
  "trusted",
  "moderator",
  "admin",
]);

export const collectionKindEnum = pgEnum("collection_kind", [
  "franchise",
  "trilogy",
  "thematic",
  "shared_universe",
]);

export const roleTypeEnum = pgEnum("role_type", [
  "director",
  "cinematographer",
  "editor",
  "composer",
  "production_designer",
  "writer",
  "actor",
  "other",
]);

export const connectionTypeEnum = pgEnum("connection_type", [
  "homage",
  "shot_for_shot_quotation",
  "visual_motif",
  "shared_technique",
  "subversion_parody",
  "narrative_structure",
  "remake_adaptation",
  "audiovisual_parallel",
  "stated_influence",
  "crew_lineage",
  "soundtrack_reference",
]);

export const confidenceTierEnum = pgEnum("confidence_tier", [
  "confirmed",
  "highly_likely",
  "proposed",
  "ai_suggested",
]);

export const evidenceTypeEnum = pgEnum("evidence_type", [
  "interview",
  "commentary",
  "video_essay",
  "book",
  "article",
  "screenshot_link",
  "timecode_pair",
  "wiki",
  "other",
]);

export const contentStatusEnum = pgEnum("content_status", [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
]);

export const placeKindEnum = pgEnum("place_kind", [
  "building",
  "street",
  "landmark",
  "natural",
  "studio_backlot",
  "neighborhood",
  "region",
]);

export const locationRelationshipEnum = pgEnum("location_relationship", [
  "filmed_at",
  "set_in",
  "both",
]);

export const preceptCategoryEnum = pgEnum("precept_category", [
  "shot_type",
  "camera_movement",
  "lens_optics",
  "lighting",
  "editing",
  "sound_audiovisual",
  "color",
  "staging_blocking",
  "narrative_device",
  "genre_convention",
  "vfx",
]);

export const preceptRelationTypeEnum = pgEnum("precept_relation_type", [
  "broader",
  "narrower",
  "opposite_of",
  "commonly_paired_with",
  "see_also",
]);

export const suggestionTargetTypeEnum = pgEnum("suggestion_target_type", [
  "connection",
  "film_location",
  "place",
  "precept",
  "precept_relation",
  "precept_example",
  "film",
  "person",
  "collection",
  "spotlight",
]);

export const suggestionOperationEnum = pgEnum("suggestion_operation", [
  "create",
  "update",
  "delete",
  "merge",
]);

export const suggestionSourceEnum = pgEnum("suggestion_source", ["user", "ai", "import"]);

export const suggestionStatusEnum = pgEnum("suggestion_status", [
  "pending",
  "approved",
  "rejected",
  "needs_evidence",
  "withdrawn",
  "superseded",
]);

export const rejectionReasonEnum = pgEnum("rejection_reason", [
  "insufficient_evidence",
  "duplicate",
  "factually_wrong",
  "out_of_scope",
  "low_quality",
  "spam",
]);

export const colorFormatEnum = pgEnum("color_format", ["color", "bw", "mixed"]);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    handle: text("handle").notNull(),
    displayName: text("display_name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    avatarUrl: text("avatar_url"),
    role: userRoleEnum("role").notNull().default("contributor"),
    reputation: integer("reputation").notNull().default(0),
    contributionCounts: jsonb("contribution_counts").notNull().default({}),
    isSeedData: boolean("is_seed_data").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_handle_uidx").on(t.handle),
    uniqueIndex("users_email_uidx").on(t.email),
  ]
);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const films = pgTable(
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
    country: jsonb("country").notNull().default([]),
    originalLanguage: text("original_language"),
    genres: jsonb("genres").notNull().default([]),
    synopsis: text("synopsis"),
    posterUrl: text("poster_url"),
    backdropUrl: text("backdrop_url"),
    aspectRatio: text("aspect_ratio"),
    colorFormat: colorFormatEnum("color_format"),
    popularityScore: real("popularity_score").notNull().default(0),
    connectionCount: integer("connection_count").notNull().default(0),
    isSeedData: boolean("is_seed_data").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("films_slug_uidx").on(t.slug),
    uniqueIndex("films_tmdb_uidx").on(t.tmdbId),
    index("films_year_idx").on(t.releaseYear),
    index("films_popularity_idx").on(t.popularityScore),
  ]
);

export const collections = pgTable(
  "collections",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    kind: collectionKindEnum("kind").notNull(),
    isSeedData: boolean("is_seed_data").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("collections_slug_uidx").on(t.slug)]
);

export const collectionFilms = pgTable(
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
    isSeedData: boolean("is_seed_data").notNull().default(false),
  },
  (t) => [
    uniqueIndex("collection_films_uidx").on(t.collectionId, t.filmId),
    index("collection_films_film_idx").on(t.filmId),
  ]
);

export const people = pgTable(
  "people",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    tmdbPersonId: integer("tmdb_person_id"),
    name: text("name").notNull(),
    alsoKnownAs: jsonb("also_known_as").notNull().default([]),
    primaryDepartment: text("primary_department"),
    birthYear: integer("birth_year"),
    deathYear: integer("death_year"),
    bioSnippet: text("bio_snippet"),
    photoUrl: text("photo_url"),
    isSeedData: boolean("is_seed_data").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("people_slug_uidx").on(t.slug),
    uniqueIndex("people_tmdb_uidx").on(t.tmdbPersonId),
  ]
);

export const credits = pgTable(
  "credits",
  {
    id: text("id").primaryKey(),
    personId: text("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    filmId: text("film_id")
      .notNull()
      .references(() => films.id, { onDelete: "cascade" }),
    roleType: roleTypeEnum("role_type").notNull(),
    characterName: text("character_name"),
    billingOrder: integer("billing_order"),
    department: text("department"),
    isSeedData: boolean("is_seed_data").notNull().default(false),
  },
  (t) => [
    index("credits_person_idx").on(t.personId),
    index("credits_film_idx").on(t.filmId),
    index("credits_role_idx").on(t.roleType),
  ]
);

export const connections = pgTable(
  "connections",
  {
    id: text("id").primaryKey(),
    sourceFilmId: text("source_film_id")
      .notNull()
      .references(() => films.id, { onDelete: "cascade" }),
    targetFilmId: text("target_film_id")
      .notNull()
      .references(() => films.id, { onDelete: "cascade" }),
    isDirected: boolean("is_directed").notNull().default(true),
    connectionType: connectionTypeEnum("connection_type").notNull(),
    confidenceTier: confidenceTierEnum("confidence_tier").notNull().default("proposed"),
    title: text("title").notNull(),
    rationale: text("rationale").notNull(),
    sourceAnchor: jsonb("source_anchor"),
    targetAnchor: jsonb("target_anchor"),
    tags: jsonb("tags").notNull().default([]),
    upvotes: integer("upvotes").notNull().default(0),
    downvotes: integer("downvotes").notNull().default(0),
    communityScore: integer("community_score").notNull().default(0),
    status: contentStatusEnum("status").notNull().default("approved"),
    createdBy: text("created_by").references(() => users.id),
    approvedBy: text("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    isSeedData: boolean("is_seed_data").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("connections_source_idx").on(t.sourceFilmId),
    index("connections_target_idx").on(t.targetFilmId),
    index("connections_type_idx").on(t.connectionType),
    index("connections_confidence_idx").on(t.confidenceTier),
    index("connections_score_idx").on(t.communityScore),
  ]
);

export const evidence = pgTable(
  "evidence",
  {
    id: text("id").primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    evidenceType: evidenceTypeEnum("evidence_type").notNull(),
    url: text("url"),
    citationText: text("citation_text").notNull(),
    excerpt: text("excerpt"),
    pageOrTimestamp: text("page_or_timestamp"),
    submittedBy: text("submitted_by").references(() => users.id),
    isSeedData: boolean("is_seed_data").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("evidence_target_idx").on(t.targetType, t.targetId)]
);

export const places = pgTable(
  "places",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    altNames: jsonb("alt_names").notNull().default([]),
    address: text("address"),
    locality: text("locality"),
    region: text("region"),
    country: text("country"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    geohash: text("geohash"),
    placeKind: placeKindEnum("place_kind").notNull(),
    stillExtant: boolean("still_extant").notNull().default(true),
    notes: text("notes"),
    externalIds: jsonb("external_ids").notNull().default({}),
    status: contentStatusEnum("status").notNull().default("approved"),
    createdBy: text("created_by").references(() => users.id),
    approvedBy: text("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    isSeedData: boolean("is_seed_data").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("places_slug_uidx").on(t.slug),
    index("places_geo_idx").on(t.lat, t.lng),
  ]
);

export const filmLocations = pgTable(
  "film_locations",
  {
    id: text("id").primaryKey(),
    filmId: text("film_id")
      .notNull()
      .references(() => films.id, { onDelete: "cascade" }),
    placeId: text("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    relationship: locationRelationshipEnum("relationship").notNull(),
    sceneDescription: text("scene_description"),
    timecodeStart: text("timecode_start"),
    timecodeEnd: text("timecode_end"),
    isDoublingFor: text("is_doubling_for").references(() => places.id),
    upvotes: integer("upvotes").notNull().default(0),
    downvotes: integer("downvotes").notNull().default(0),
    communityScore: integer("community_score").notNull().default(0),
    status: contentStatusEnum("status").notNull().default("approved"),
    createdBy: text("created_by").references(() => users.id),
    approvedBy: text("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    isSeedData: boolean("is_seed_data").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("film_locations_film_idx").on(t.filmId),
    index("film_locations_place_idx").on(t.placeId),
  ]
);

export const precepts = pgTable(
  "precepts",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    aliases: jsonb("aliases").notNull().default([]),
    category: preceptCategoryEnum("category").notNull(),
    shortDefinition: text("short_definition").notNull(),
    description: text("description").notNull(),
    originClaim: jsonb("origin_claim"),
    popularizedByFilmIds: jsonb("popularized_by_film_ids").notNull().default([]),
    status: contentStatusEnum("status").notNull().default("approved"),
    createdBy: text("created_by").references(() => users.id),
    approvedBy: text("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    isSeedData: boolean("is_seed_data").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("precepts_slug_uidx").on(t.slug),
    index("precepts_category_idx").on(t.category),
  ]
);

export const preceptRelations = pgTable(
  "precept_relations",
  {
    id: text("id").primaryKey(),
    sourcePreceptId: text("source_precept_id")
      .notNull()
      .references(() => precepts.id, { onDelete: "cascade" }),
    targetPreceptId: text("target_precept_id")
      .notNull()
      .references(() => precepts.id, { onDelete: "cascade" }),
    relationType: preceptRelationTypeEnum("relation_type").notNull(),
    status: contentStatusEnum("status").notNull().default("approved"),
    createdBy: text("created_by").references(() => users.id),
    approvedBy: text("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    isSeedData: boolean("is_seed_data").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("precept_relations_source_idx").on(t.sourcePreceptId),
    index("precept_relations_target_idx").on(t.targetPreceptId),
  ]
);

export const preceptExamples = pgTable(
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
    isCanonicalExample: boolean("is_canonical_example").notNull().default(false),
    upvotes: integer("upvotes").notNull().default(0),
    downvotes: integer("downvotes").notNull().default(0),
    communityScore: integer("community_score").notNull().default(0),
    status: contentStatusEnum("status").notNull().default("approved"),
    createdBy: text("created_by").references(() => users.id),
    approvedBy: text("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    isSeedData: boolean("is_seed_data").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("precept_examples_precept_idx").on(t.preceptId),
    index("precept_examples_film_idx").on(t.filmId),
    index("precept_examples_canonical_idx").on(t.isCanonicalExample),
  ]
);

export const suggestions = pgTable(
  "suggestions",
  {
    id: text("id").primaryKey(),
    targetType: suggestionTargetTypeEnum("target_type").notNull(),
    targetId: text("target_id"),
    operation: suggestionOperationEnum("operation").notNull(),
    payload: jsonb("payload").notNull(),
    source: suggestionSourceEnum("source").notNull().default("user"),
    aiMetadata: jsonb("ai_metadata"),
    submitterNote: text("submitter_note"),
    status: suggestionStatusEnum("status").notNull().default("pending"),
    submittedBy: text("submitted_by").references(() => users.id),
    reviewedBy: text("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
    rejectionReason: rejectionReasonEnum("rejection_reason"),
    duplicateOfId: text("duplicate_of_id"),
    communityScore: integer("community_score").notNull().default(0),
    isSeedData: boolean("is_seed_data").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("suggestions_status_idx").on(t.status),
    index("suggestions_target_idx").on(t.targetType, t.targetId),
    index("suggestions_score_idx").on(t.communityScore),
  ]
);

export const revisions = pgTable(
  "revisions",
  {
    id: text("id").primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    revisionNumber: integer("revision_number").notNull(),
    diff: jsonb("diff").notNull(),
    suggestionId: text("suggestion_id").references(() => suggestions.id),
    actorId: text("actor_id").references(() => users.id),
    isSeedData: boolean("is_seed_data").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("revisions_target_idx").on(t.targetType, t.targetId),
    uniqueIndex("revisions_number_uidx").on(t.targetType, t.targetId, t.revisionNumber),
  ]
);

export const votes = pgTable(
  "votes",
  {
    id: text("id").primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    value: integer("value").notNull(),
    isSeedData: boolean("is_seed_data").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("votes_unique_uidx").on(t.targetType, t.targetId, t.userId)]
);

export const flags = pgTable(
  "flags",
  {
    id: text("id").primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    note: text("note"),
    status: text("status").notNull().default("open"),
    submittedBy: text("submitted_by").references(() => users.id),
    isSeedData: boolean("is_seed_data").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("flags_target_idx").on(t.targetType, t.targetId)]
);

export const spotlights = pgTable(
  "spotlights",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    filmId: text("film_id")
      .notNull()
      .references(() => films.id),
    headline: text("headline").notNull(),
    bodyMarkdown: text("body_markdown").notNull(),
    featuredConnectionIds: jsonb("featured_connection_ids").notNull().default([]),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    status: contentStatusEnum("status").notNull().default("approved"),
    createdBy: text("created_by").references(() => users.id),
    approvedBy: text("approved_by").references(() => users.id),
    isSeedData: boolean("is_seed_data").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("spotlights_slug_uidx").on(t.slug)]
);
