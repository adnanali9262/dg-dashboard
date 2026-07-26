import { COLORS } from "../styles/colors";

export default function CustomTooltip({ active, payload, label, unit = "" }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: `1px solid ${COLORS.panelEdge}`,
        borderRadius: 8,
        boxShadow: COLORS.shadow,
        padding: "9px 12px",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 12,
        color: COLORS.text,
      }}
    >
      <div style={{ color: COLORS.textDim, marginBottom: 5 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, lineHeight: 1.45 }}>
          {p.name}: {p.value ?? "-"}{unit ? ` ${unit}` : ""}
        </div>
      ))}
    </div>
  );
}
