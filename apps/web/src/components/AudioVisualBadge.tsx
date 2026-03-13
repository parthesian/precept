interface Props {
  value: string;
}

export function AudioVisualBadge({ value }: Props) {
  const notable = value === "contrasting" || value === "mickey_mousing";
  return (
    <span
      style={{
        fontSize: "0.75rem",
        borderRadius: 999,
        padding: "0.2rem 0.55rem",
        border: "1px solid #374151",
        background: notable ? "#1f2937" : "#111827",
      }}
    >
      {value}
    </span>
  );
}
