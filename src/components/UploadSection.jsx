import { AlertTriangle, Check, Trash2, Upload } from "lucide-react";
import Card from "./Card";
import { COLORS } from "../styles/colors";


export default function UploadSection({
  fileName, loading, dragOver, setDragOver, inputRef, handleFile,
  saveStatus, savedReports, savedLoading, parsed, loadSavedReport, removeSavedReport, error,
}) {
  return (
    <>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current && inputRef.current.click()}
        style={{
          border: `1.5px dashed ${dragOver ? COLORS.red : COLORS.panelEdge}`,
          borderRadius: 12, padding: "26px 18px", cursor: "pointer",
          background: dragOver ? COLORS.redSoft : COLORS.panel,
          display: "flex", alignItems: "center", gap: 14, marginBottom: 22, transition: "all 0.15s",
        }}
      >
        <input
          ref={inputRef} type="file" accept=".xls,.xlsx" style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <div style={{
          width: 40, height: 40, borderRadius: 9, background: `${COLORS.red}18`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Upload size={20} color={COLORS.red} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {fileName ? fileName : "Drop the meter-reading file here, or click to browse"}
          </div>
          <div style={{ fontSize: 11.5, color: COLORS.textDim, marginTop: 2 }}>
            {loading ? "Reading…" : "Accepts .xls or .xlsx — parsed in your browser and saved for every section to use"}
          </div>
        </div>
      </div>
 
      {saveStatus && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.green, marginTop: -12, marginBottom: 18 }}>
          <Check size={13} /> {saveStatus}
        </div>
      )}
 
      {error && (
        <div style={{
          display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(198,48,62,0.08)",
          border: `1px solid ${COLORS.red}`, borderRadius: 10, padding: "12px 14px", marginBottom: 20,
        }}>
          <AlertTriangle size={17} color={COLORS.red} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: COLORS.text }}>{error}</div>
        </div>
      )}
 
      <Card title="Saved reports" desc="One month per file — click to load it into Usage, Fuel Balance and Summary" style={{ marginBottom: 0 }}>
        {savedLoading && <div style={{ padding: "16px 0", color: COLORS.textDim, fontSize: 12.5 }}>Loading…</div>}
        {!savedLoading && savedReports.length === 0 && (
          <div style={{ padding: "20px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
            Nothing saved yet — upload a file above to get started.
          </div>
        )}
        {!savedLoading && savedReports.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingBottom: 14 }}>
            {savedReports.map((r) => (
              <div
                key={r.monthKey}
                onClick={() => loadSavedReport(r.monthKey)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                  background: parsed && parsed.monthKey === r.monthKey ? COLORS.redSoft : COLORS.bg,
                  border: `1px solid ${parsed && parsed.monthKey === r.monthKey ? COLORS.red : COLORS.panelEdge}`,
                  borderRadius: 20, padding: "7px 10px 7px 14px", fontSize: 12.5, fontWeight: 500,
                }}
              >
                {r.monthLabel}
                {parsed && parsed.monthKey === r.monthKey && <span style={{ fontSize: 10.5, color: COLORS.red, fontWeight: 700 }}>ACTIVE</span>}
                <button
                  onClick={(e) => removeSavedReport(r.monthKey, e)}
                  title="Remove"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", border: "none",
                    background: "transparent", cursor: "pointer", padding: 4, borderRadius: "50%",
                  }}
                >
                  <Trash2 size={12} color={COLORS.textDim} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
