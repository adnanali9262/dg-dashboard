import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import Card from "./Card";
import { COLORS } from "../styles/colors";

const REPAIR_STATUSES = ["Pending", "In Progress", "Resolved"];
const STATUS_COLORS = { Pending: COLORS.red, "In Progress": COLORS.amber, Resolved: COLORS.green };

const inputStyle = {
  flex: 1,
  minWidth: 160,
  border: `1px solid ${COLORS.panelEdge}`,
  borderRadius: 8,
  padding: "8px 10px",
  fontFamily: "'IBM Plex Sans', sans-serif",
  fontSize: 12.5,
  background: COLORS.bg,
  color: COLORS.text,
  boxSizing: "border-box",
};

export default function RepairHistorySection({ repairs, loading, siteNames, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ site: "", date: new Date().toISOString().slice(0, 10), issue: "", parts: "", cost: "", status: "Pending" });
 
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
 
  const submit = (e) => {
    e.preventDefault();
    if (!form.site.trim() || !form.issue.trim()) return;
    onAdd({ ...form, id: Date.now().toString() });
    setForm({ site: "", date: new Date().toISOString().slice(0, 10), issue: "", parts: "", cost: "", status: "Pending" });
    setShowForm(false);
  };
 
  const sorted = [...repairs].sort((a, b) => (a.date < b.date ? 1 : -1));
 
  return (
    <>
      <Card
        style={{ marginBottom: 22 }}
        title="Log a repair"
        desc="Site, issue, parts used, and status"
        right={
          <button
            onClick={() => setShowForm((s) => !s)}
            style={{
              display: "flex", alignItems: "center", gap: 6, border: "none", cursor: "pointer",
              background: showForm ? COLORS.bg : COLORS.red, color: showForm ? COLORS.text : "#fff",
              borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 600,
            }}
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancel" : "New entry"}
          </button>
        }
      >
        {showForm && (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4, paddingBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                list="dg-site-names" placeholder="Exchange / site name" value={form.site}
                onChange={(e) => update("site", e.target.value)}
                style={inputStyle}
              />
              <datalist id="dg-site-names">
                {siteNames.map((n) => <option key={n} value={n} />)}
              </datalist>
              <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} style={{ ...inputStyle, maxWidth: 160 }} />
              <select value={form.status} onChange={(e) => update("status", e.target.value)} style={{ ...inputStyle, maxWidth: 150, cursor: "pointer" }}>
                {REPAIR_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <textarea
              placeholder="What went wrong?" value={form.issue} onChange={(e) => update("issue", e.target.value)}
              rows={2} style={{ ...inputStyle, resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input placeholder="Spare parts used (optional)" value={form.parts} onChange={(e) => update("parts", e.target.value)} style={inputStyle} />
              <input placeholder="Cost, PKR (optional)" type="number" value={form.cost} onChange={(e) => update("cost", e.target.value)} style={{ ...inputStyle, maxWidth: 160 }} />
            </div>
            <div>
              <button type="submit" style={{
                border: "none", cursor: "pointer", background: COLORS.green, color: "#fff",
                borderRadius: 8, padding: "8px 16px", fontSize: 12.5, fontWeight: 600,
              }}>
                Save entry
              </button>
            </div>
          </form>
        )}
      </Card>
 
      <Card title="Repair log" desc={loading ? "Loading…" : `${sorted.length} entr${sorted.length === 1 ? "y" : "ies"}`}>
        {!loading && sorted.length === 0 && (
          <div style={{ padding: "24px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
            No repairs logged yet — click "New entry" above to add one.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 10 }}>
          {sorted.map((r) => (
            <div key={r.id} style={{
              border: `1px solid ${COLORS.panelEdge}`, borderRadius: 10, padding: "10px 12px",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{r.site}</span>
                  <span style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'IBM Plex Mono', monospace" }}>{r.date}</span>
                  <span style={{
                    fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
                    color: "#fff", background: STATUS_COLORS[r.status] || COLORS.textDim,
                  }}>
                    {r.status}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: COLORS.text }}>{r.issue}</div>
                {(r.parts || r.cost) && (
                  <div style={{ fontSize: 11.5, color: COLORS.textDim, marginTop: 3 }}>
                    {r.parts ? `Parts: ${r.parts}` : ""}{r.parts && r.cost ? " · " : ""}{r.cost ? `PKR ${r.cost}` : ""}
                  </div>
                )}
              </div>
              <button
                onClick={() => onDelete(r.id)} title="Delete"
                style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, flexShrink: 0 }}
              >
                <Trash2 size={14} color={COLORS.textDim} />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
