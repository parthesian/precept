"use client";

import { SuggestSpotlightForm } from "@/components/suggest/SuggestSpotlightForm";
import { useSelectionStore } from "@/stores/selection";

export function SpotlightTools({ filmId }: { filmId?: string }) {
  const { suggestMode, setSuggestMode } = useSelectionStore();

  return (
    <section style={{ marginTop: "var(--space-5)" }}>
      <label className="suggest-toggle">
        <input
          type="checkbox"
          checked={suggestMode}
          onChange={(e) => setSuggestMode(e.target.checked)}
        />
        Suggest mode (login required to publish)
      </label>
      <SuggestSpotlightForm defaultFilmId={filmId} />
    </section>
  );
}
