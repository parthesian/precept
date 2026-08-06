interface Props {
  value: string;
}

export function AudioVisualBadge({ value }: Props) {
  const normalized = value.replaceAll("_", " ").toUpperCase();
  const notable = value === "contrasting" || value === "mickey_mousing";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        fontSize: "var(--text-xs)",
        fontFamily: "var(--font-mono)",
        color: notable ? "var(--text-primary)" : "var(--text-secondary)",
        padding: "2px 6px",
        borderLeft: `1px solid ${notable ? "var(--accent-dim)" : "var(--border-hover)"}`,
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <span aria-hidden="true">⟷</span>
      {normalized}
    </span>
  );
}
