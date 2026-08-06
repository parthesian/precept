import type {
  CollectionKind,
  ColorFormat,
  ConfidenceTier,
  ConnectionType,
  EvidenceType,
  GraphEdgeClass,
  LocationRelationship,
  Pane,
  PlaceKind,
  PreceptCategory,
  PreceptRelationType,
  RoleType,
  SelectionType,
  SuggestionOperation,
  SuggestionSource,
  SuggestionStatus,
  SuggestionTargetType,
  UserRole,
} from "./enums.js";

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiEnvelope<T> {
  data?: T;
  meta?: Record<string, unknown>;
  errors?: ApiError[];
}

export interface Anchor {
  timecode_start?: string | null;
  timecode_end?: string | null;
  shot_description?: string | null;
  frame_ref?: string | null;
}

export interface SearchResult {
  id: string;
  type: SelectionType;
  slug: string;
  label: string;
  sublabel?: string | null;
  thumb?: string | null;
}

export interface GraphNode {
  id: string;
  type: SelectionType;
  slug: string;
  label: string;
  sublabel?: string | null;
  popularity_score?: number;
  thumb?: string | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  edge_class: GraphEdgeClass;
  connection_type?: ConnectionType | string;
  confidence_tier?: ConfidenceTier;
  title?: string;
  is_directed?: boolean;
  community_score?: number;
}

export interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Selection {
  type: SelectionType;
  id: string;
  slug: string;
}

export interface SharedUiState {
  query: string;
  selection: Selection | null;
  suggestMode: boolean;
  pane: Pane;
  filters: Record<string, unknown>;
}

export type {
  CollectionKind,
  ColorFormat,
  ConfidenceTier,
  ConnectionType,
  EvidenceType,
  GraphEdgeClass,
  LocationRelationship,
  Pane,
  PlaceKind,
  PreceptCategory,
  PreceptRelationType,
  RoleType,
  SelectionType,
  SuggestionOperation,
  SuggestionSource,
  SuggestionStatus,
  SuggestionTargetType,
  UserRole,
};
