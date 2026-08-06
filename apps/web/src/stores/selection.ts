"use client";

import { create } from "zustand";
import type { Pane, SelectionType } from "@precept/shared";

export type Selection = {
  type: SelectionType;
  id: string;
  slug: string;
  label?: string;
};

type Filters = {
  connectionTypes: string[];
  minConfidence: string | null;
  edgeClasses: Array<"curated" | "derived" | "computed">;
  sort: "score" | "popularity" | "chronological";
  locationRelationship: string | null;
  preceptCategory: string | null;
};

type State = {
  query: string;
  selection: Selection | null;
  suggestMode: boolean;
  pane: Pane;
  filters: Filters;
  highlightEdgeId: string | null;
  breadcrumb: Selection[];
  setQuery: (q: string) => void;
  setSelection: (sel: Selection | null, pushBreadcrumb?: boolean) => void;
  setSuggestMode: (on: boolean) => void;
  setPane: (pane: Pane) => void;
  setFilters: (patch: Partial<Filters>) => void;
  setHighlightEdgeId: (id: string | null) => void;
};

const defaultFilters: Filters = {
  connectionTypes: [],
  minConfidence: null,
  edgeClasses: ["curated"],
  sort: "score",
  locationRelationship: null,
  preceptCategory: null,
};

export const useSelectionStore = create<State>((set, get) => ({
  query: "",
  selection: null,
  suggestMode: false,
  pane: "homage",
  filters: defaultFilters,
  highlightEdgeId: null,
  breadcrumb: [],
  setQuery: (query) => set({ query }),
  setSelection: (selection, pushBreadcrumb = true) => {
    if (!selection) {
      set({ selection: null });
      return;
    }
    const crumb = get().breadcrumb;
    const next = pushBreadcrumb
      ? [...crumb.filter((c) => !(c.type === selection.type && c.id === selection.id)), selection].slice(-8)
      : crumb;
    set({ selection, breadcrumb: next });
  },
  setSuggestMode: (suggestMode) => set({ suggestMode }),
  setPane: (pane) => set({ pane }),
  setFilters: (patch) => set({ filters: { ...get().filters, ...patch } }),
  setHighlightEdgeId: (highlightEdgeId) => set({ highlightEdgeId }),
}));
