interface Props {
  onChange: (query: string) => void;
}

export function SearchPanel({ onChange }: Props) {
  return (
    <section className="panel">
      <label style={{ display: "grid", gap: "0.45rem" }}>
        <span className="meta-line">Tag/Text Search</span>
        <input
          placeholder="shot_scale=close_up&setting=street"
          onChange={(e) => onChange(e.target.value)}
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            borderRadius: 2,
            padding: "0.55rem 0.7rem",
          }}
        />
      </label>
    </section>
  );
}
