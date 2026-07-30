import { COLORS } from "../styles/colors";

export default function CustomTooltip({ active, payload, label, unit = "", tip = "" }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
        border: `1px solid ${COLORS.panelEdge}`,
        borderRadius: 10,
        boxShadow: COLORS.shadow,
        padding: "10px 13px",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 12,
        color: COLORS.text,
      }}
    >
      <div style={{ color: COLORS.navy, marginBottom: 6, fontWeight: 700 }}>{label}</div>
      {tip ? (
        <div style={{ color: COLORS.textDim, marginBottom: 6, lineHeight: 1.35 }}>
          {tip}
        </div>
      ) : null}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, lineHeight: 1.45 }}>
          {p.name}: {p.value ?? "-"}{unit ? ` ${unit}` : ""}
        </div>
      ))}
    </div>
  );
}
