import { z } from "zod";
import {
  CollectionKind,
  ColorFormat,
  ConfidenceTier,
  ConnectionType,
  EvidenceType,
  LocationRelationship,
  PlaceKind,
  PreceptCategory,
  PreceptRelationType,
  QUALIFYING_EVIDENCE_FOR_CONFIRMED,
  RejectionReason,
  RoleType,
  SuggestionOperation,
  SuggestionSource,
  SuggestionTargetType,
  UserRole,
} from "./enums.js";

export const apiEnvelopeSchema = z.object({
  data: z.unknown().optional(),
  meta: z.record(z.unknown()).optional(),
  errors: z
    .array(
      z.object({
        code: z.string(),
        message: z.string(),
        details: z.unknown().optional(),
      })
    )
    .optional(),
});

export const anchorSchema = z
  .object({
    timecode_start: z.string().nullable().optional(),
    timecode_end: z.string().nullable().optional(),
    shot_description: z.string().nullable().optional(),
    /** Reserved for a future legal frame path; ingest stays closed in v1. */
    frame_ref: z.string().nullable().optional(),
  })
  .nullable();

const wordCount = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

export const evidenceInputSchema = z.object({
  evidence_type: z.enum([
    EvidenceType.INTERVIEW,
    EvidenceType.COMMENTARY,
    EvidenceType.VIDEO_ESSAY,
    EvidenceType.BOOK,
    EvidenceType.ARTICLE,
    EvidenceType.SCREENSHOT_LINK,
    EvidenceType.TIMECODE_PAIR,
    EvidenceType.WIKI,
    EvidenceType.OTHER,
  ]),
  url: z.string().url().nullable().optional(),
  citation_text: z.string().min(1),
  excerpt: z
    .string()
    .optional()
    .nullable()
    .refine((v) => v == null || wordCount(v) <= 15, {
      message: "excerpt must be at most 15 words",
    }),
  page_or_timestamp: z.string().nullable().optional(),
});

export const connectionPayloadSchema = z.object({
  source_film_id: z.string().min(1),
  target_film_id: z.string().min(1),
  is_directed: z.boolean(),
  connection_type: z.enum([
    ConnectionType.HOMAGE,
    ConnectionType.SHOT_FOR_SHOT_QUOTATION,
    ConnectionType.VISUAL_MOTIF,
    ConnectionType.SHARED_TECHNIQUE,
    ConnectionType.SUBVERSION_PARODY,
    ConnectionType.NARRATIVE_STRUCTURE,
    ConnectionType.REMAKE_ADAPTATION,
    ConnectionType.AUDIOVISUAL_PARALLEL,
    ConnectionType.STATED_INFLUENCE,
    ConnectionType.CREW_LINEAGE,
    ConnectionType.SOUNDTRACK_REFERENCE,
  ]),
  confidence_tier: z.enum(["confirmed", "highly_likely", "proposed", "ai_suggested"]),
  title: z.string().min(1).max(200),
  rationale: z.string().min(1).max(2000),
  source_anchor: anchorSchema.optional(),
  target_anchor: anchorSchema.optional(),
  tags: z.array(z.string()).default([]),
  evidence: z.array(evidenceInputSchema).default([]),
});

export function assertConfirmedHasQualifyingEvidence(
  confidenceTier: string,
  evidence: Array<{ evidence_type: string }>
): void {
  if (confidenceTier !== "confirmed") return;
  const ok = evidence.some((e) =>
    (QUALIFYING_EVIDENCE_FOR_CONFIRMED as readonly string[]).includes(e.evidence_type)
  );
  if (!ok) {
    throw new Error(
      "confirmed confidence_tier requires at least one evidence item of type interview, commentary, book, or article"
    );
  }
}

export const suggestionCreateSchema = z.object({
  target_type: z.enum([
    SuggestionTargetType.CONNECTION,
    SuggestionTargetType.FILM_LOCATION,
    SuggestionTargetType.PLACE,
    SuggestionTargetType.PRECEPT,
    SuggestionTargetType.PRECEPT_RELATION,
    SuggestionTargetType.PRECEPT_EXAMPLE,
    SuggestionTargetType.FILM,
    SuggestionTargetType.PERSON,
    SuggestionTargetType.COLLECTION,
    SuggestionTargetType.SPOTLIGHT,
  ]),
  target_id: z.string().nullable().optional(),
  operation: z.enum([
    SuggestionOperation.CREATE,
    SuggestionOperation.UPDATE,
    SuggestionOperation.DELETE,
    SuggestionOperation.MERGE,
  ]),
  payload: z.record(z.unknown()),
  source: z
    .enum([SuggestionSource.USER, SuggestionSource.AI, SuggestionSource.IMPORT])
    .default(SuggestionSource.USER),
  ai_metadata: z
    .object({
      model: z.string().optional(),
      prompt_version: z.string().optional(),
      generated_at: z.string().optional(),
      raw_response: z.unknown().optional(),
      token_cost: z.number().optional(),
    })
    .nullable()
    .optional(),
  evidence: z.array(evidenceInputSchema).default([]),
  submitter_note: z.string().nullable().optional(),
  auto_approve: z.boolean().optional(),
});

export const voteSchema = z.object({
  target_type: z.string().min(1),
  target_id: z.string().min(1),
  value: z.union([z.literal(1), z.literal(-1)]),
});

export const flagSchema = z.object({
  target_type: z.string().min(1),
  target_id: z.string().min(1),
  reason: z.string().min(1),
  note: z.string().nullable().optional(),
});

export const rejectSuggestionSchema = z.object({
  rejection_reason: z.enum([
    RejectionReason.INSUFFICIENT_EVIDENCE,
    RejectionReason.DUPLICATE,
    RejectionReason.FACTUALLY_WRONG,
    RejectionReason.OUT_OF_SCOPE,
    RejectionReason.LOW_QUALITY,
    RejectionReason.SPAM,
  ]),
  review_note: z.string().nullable().optional(),
});

export const approveSuggestionSchema = z.object({
  review_note: z.string().nullable().optional(),
  edits: z.record(z.unknown()).optional(),
});

export {
  CollectionKind,
  ColorFormat,
  ConfidenceTier,
  ConnectionType,
  EvidenceType,
  LocationRelationship,
  PlaceKind,
  PreceptCategory,
  PreceptRelationType,
  RoleType,
  UserRole,
};
