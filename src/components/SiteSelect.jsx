import { ChevronDown } from "lucide-react";
import { COLORS } from "../styles/colors";

export default function SiteSelect({ value, onChange, siteNames }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none", background: COLORS.bg, color: COLORS.text,
          border: `1px solid ${COLORS.panelEdge}`, borderRadius: 8, padding: "7px 30px 7px 12px",
          fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12.5, cursor: "pointer", minWidth: 220,
        }}
      >
        <option value="">Select a site…</option>
        {siteNames.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <ChevronDown size={14} color={COLORS.textDim} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
    </div>
  );
}
