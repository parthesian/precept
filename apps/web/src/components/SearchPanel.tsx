interface Props {
  onChange: (query: string) => void;
}

export function SearchPanel({ onChange }: Props) {
  return (
    <section style={{ border: "1px solid #1f2937", borderRadius: 12, padding: "0.85rem", background: "#111319" }}>
      <label style={{ display: "grid", gap: "0.45rem" }}>
        <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>Tag/Text Search</span>
        <input
          placeholder="shot_scale=close_up&setting=street"
          onChange={(e) => onChange(e.target.value)}
          style={{
            background: "#0b1220",
            border: "1px solid #374151",
            color: "#e5e7eb",
            borderRadius: 8,
            padding: "0.55rem 0.7rem",
          }}
        />
      </label>
    </section>
  );
}
