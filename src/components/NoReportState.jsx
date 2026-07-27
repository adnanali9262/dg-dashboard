import Card from "./Card";
import { COLORS } from "../styles/colors";
import { Link2, ArrowRight } from "lucide-react";
export default function NoReportState({ savedReports, onLoad, onGoSheets }) {
  return (
    <Card style={{ marginBottom: 0 }}>
      <div style={{ padding: "18px 4px", textAlign: "center" }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.navy, marginBottom: 4 }}>No report loaded</div>
        <div style={{ fontSize: 12.5, color: COLORS.textDim, marginBottom: 16 }}>
          Open the live workbook in Google Sheets, or pick a previously saved month below.
        </div>
        {savedReports.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 16 }}>
            {savedReports.map((r) => (
              <button
                key={r.monthKey}
                onClick={() => onLoad(r.monthKey)}
                style={{
                  border: `1px solid ${COLORS.panelEdge}`, background: COLORS.bg, borderRadius: 20,
                  padding: "6px 14px", fontSize: 12.5, fontWeight: 500, cursor: "pointer", color: COLORS.text,
                }}
              >
                {r.monthLabel}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={onGoSheets}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, border: "none", cursor: "pointer",
            background: COLORS.red, color: "#fff", borderRadius: 8, padding: "9px 16px", fontSize: 12.5, fontWeight: 600,
          }}
        >
          <Link2 size={14} /> Open Google Sheets <ArrowRight size={13} />
        </button>
      </div>
    </Card>
  );
}
