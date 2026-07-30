import { COLORS } from "../styles/colors";

export default function StatCard({ icon: Icon, label, value, sub, tone = "red", valueColor }) {
  const tint =
    tone === "red" ? COLORS.red :
    tone === "green" ? COLORS.green :
    tone === "blue" ? COLORS.blue :
    COLORS.navy;

  const resolvedValueColor = valueColor || COLORS.text;

  return (
    <div
      style={{
        background: `linear-gradient(180deg, ${COLORS.panel} 0%, ${COLORS.panelSoft} 100%)`,
        border: `1px solid ${COLORS.panelEdge}`,
        borderRadius: 14,
        boxShadow: COLORS.shadowSoft,
        padding: "16px 17px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        minWidth: 180,
        flex: "1 1 180px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: tint,
        }}
      />

      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${tint}18`,
          border: `1px solid ${tint}22`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={18} color={tint} />
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: resolvedValueColor,
            lineHeight: 1.05,
            letterSpacing: 0,
          }}
        >
          {value}
        </div>

        <div
          style={{
            fontSize: 11.75,
            color: COLORS.textDim,
            marginTop: 6,
            lineHeight: 1.25,
          }}
        >
          {label}
          {sub && ` - ${sub}`}
        </div>
      </div>
    </div>
  );
}
