export const UserRole = {
  ANON: "anon",
  CONTRIBUTOR: "contributor",
  TRUSTED: "trusted",
  MODERATOR: "moderator",
  ADMIN: "admin",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const CollectionKind = {
  FRANCHISE: "franchise",
  TRILOGY: "trilogy",
  THEMATIC: "thematic",
  SHARED_UNIVERSE: "shared_universe",
} as const;
export type CollectionKind = (typeof CollectionKind)[keyof typeof CollectionKind];

export const RoleType = {
  DIRECTOR: "director",
  CINEMATOGRAPHER: "cinematographer",
  EDITOR: "editor",
  COMPOSER: "composer",
  PRODUCTION_DESIGNER: "production_designer",
  WRITER: "writer",
  ACTOR: "actor",
  OTHER: "other",
} as const;
export type RoleType = (typeof RoleType)[keyof typeof RoleType];

export const ConnectionType = {
  HOMAGE: "homage",
  SHOT_FOR_SHOT_QUOTATION: "shot_for_shot_quotation",
  VISUAL_MOTIF: "visual_motif",
  SHARED_TECHNIQUE: "shared_technique",
  SUBVERSION_PARODY: "subversion_parody",
  NARRATIVE_STRUCTURE: "narrative_structure",
  REMAKE_ADAPTATION: "remake_adaptation",
  AUDIOVISUAL_PARALLEL: "audiovisual_parallel",
  STATED_INFLUENCE: "stated_influence",
  CREW_LINEAGE: "crew_lineage",
  SOUNDTRACK_REFERENCE: "soundtrack_reference",
} as const;
export type ConnectionType = (typeof ConnectionType)[keyof typeof ConnectionType];

export const ConfidenceTier = ["confirmed", "highly_likely", "proposed", "ai_suggested"] as const;
export type ConfidenceTier = (typeof ConfidenceTier)[number];

export const QUALIFYING_EVIDENCE_FOR_CONFIRMED = [
  "interview",
  "commentary",
  "book",
  "article",
] as const;

export const EvidenceType = {
  INTERVIEW: "interview",
  COMMENTARY: "commentary",
  VIDEO_ESSAY: "video_essay",
  BOOK: "book",
  ARTICLE: "article",
  SCREENSHOT_LINK: "screenshot_link",
  TIMECODE_PAIR: "timecode_pair",
  WIKI: "wiki",
  OTHER: "other",
} as const;
export type EvidenceType = (typeof EvidenceType)[keyof typeof EvidenceType];

export const ContentStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
} as const;
export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];

export const PlaceKind = {
  BUILDING: "building",
  STREET: "street",
  LANDMARK: "landmark",
  NATURAL: "natural",
  STUDIO_BACKLOT: "studio_backlot",
  NEIGHBORHOOD: "neighborhood",
  REGION: "region",
} as const;
export type PlaceKind = (typeof PlaceKind)[keyof typeof PlaceKind];

export const LocationRelationship = {
  FILMED_AT: "filmed_at",
  SET_IN: "set_in",
  BOTH: "both",
} as const;
export type LocationRelationship = (typeof LocationRelationship)[keyof typeof LocationRelationship];

export const PreceptCategory = {
  SHOT_TYPE: "shot_type",
  CAMERA_MOVEMENT: "camera_movement",
  LENS_OPTICS: "lens_optics",
  LIGHTING: "lighting",
  EDITING: "editing",
  SOUND_AUDIOVISUAL: "sound_audiovisual",
  COLOR: "color",
  STAGING_BLOCKING: "staging_blocking",
  NARRATIVE_DEVICE: "narrative_device",
  GENRE_CONVENTION: "genre_convention",
  VFX: "vfx",
} as const;
export type PreceptCategory = (typeof PreceptCategory)[keyof typeof PreceptCategory];

export const PreceptRelationType = {
  BROADER: "broader",
  NARROWER: "narrower",
  OPPOSITE_OF: "opposite_of",
  COMMONLY_PAIRED_WITH: "commonly_paired_with",
  SEE_ALSO: "see_also",
} as const;
export type PreceptRelationType = (typeof PreceptRelationType)[keyof typeof PreceptRelationType];

export const SuggestionTargetType = {
  CONNECTION: "connection",
  FILM_LOCATION: "film_location",
  PLACE: "place",
  PRECEPT: "precept",
  PRECEPT_RELATION: "precept_relation",
  PRECEPT_EXAMPLE: "precept_example",
  FILM: "film",
  PERSON: "person",
  COLLECTION: "collection",
  SPOTLIGHT: "spotlight",
} as const;
export type SuggestionTargetType = (typeof SuggestionTargetType)[keyof typeof SuggestionTargetType];

export const SuggestionOperation = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  MERGE: "merge",
} as const;
export type SuggestionOperation = (typeof SuggestionOperation)[keyof typeof SuggestionOperation];

export const SuggestionSource = {
  USER: "user",
  AI: "ai",
  IMPORT: "import",
} as const;
export type SuggestionSource = (typeof SuggestionSource)[keyof typeof SuggestionSource];

export const SuggestionStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  NEEDS_EVIDENCE: "needs_evidence",
  WITHDRAWN: "withdrawn",
  SUPERSEDED: "superseded",
} as const;
export type SuggestionStatus = (typeof SuggestionStatus)[keyof typeof SuggestionStatus];

export const RejectionReason = {
  INSUFFICIENT_EVIDENCE: "insufficient_evidence",
  DUPLICATE: "duplicate",
  FACTUALLY_WRONG: "factually_wrong",
  OUT_OF_SCOPE: "out_of_scope",
  LOW_QUALITY: "low_quality",
  SPAM: "spam",
} as const;
export type RejectionReason = (typeof RejectionReason)[keyof typeof RejectionReason];

export const GraphEdgeClass = {
  CURATED: "curated",
  DERIVED: "derived",
  COMPUTED: "computed",
} as const;
export type GraphEdgeClass = (typeof GraphEdgeClass)[keyof typeof GraphEdgeClass];

export const ColorFormat = {
  COLOR: "color",
  BW: "bw",
  MIXED: "mixed",
} as const;
export type ColorFormat = (typeof ColorFormat)[keyof typeof ColorFormat];

export const Pane = {
  VISTA: "vista",
  HOMAGE: "homage",
  FOCUS: "focus",
} as const;
export type Pane = (typeof Pane)[keyof typeof Pane];

export const SelectionType = {
  FILM: "film",
  PERSON: "person",
  COLLECTION: "collection",
  PLACE: "place",
  PRECEPT: "precept",
  CONNECTION: "connection",
} as const;
export type SelectionType = (typeof SelectionType)[keyof typeof SelectionType];
