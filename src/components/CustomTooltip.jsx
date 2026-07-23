export default function CustomTooltip({ active, payload, label, unit = "hrs" }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: "#FFFFFF", border: `1px solid ${COLORS.panelEdge}`, borderRadius: 8,
      boxShadow: "0 4px 14px rgba(15,42,71,0.12)",
      padding: "8px 12px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: COLORS.text,
    }}>
      <div style={{ color: COLORS.textDim, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {p.value ?? "—"} {unit}</div>
      ))}
    </div>
  );
}