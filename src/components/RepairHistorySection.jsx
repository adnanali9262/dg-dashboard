import { useState } from "react";
import { Plus, Trash2, X, Pencil } from "lucide-react";
import Card from "./Card";
import { COLORS } from "../styles/colors";

const REPAIR_STATUSES = ["Pending", "In Progress", "Completed"];
const STATUS_COLORS = { Pending: COLORS.red, "In Progress": COLORS.amber, Completed: COLORS.green };
const RESPONSIBLE_OPTIONS = ["", "Vendor", "PTCL"];

const emptyForm = () => ({
  exchangeName: "",
  dgNameCapacity: "",
  faultOccurrenceDate: new Date().toISOString().slice(0, 10),
  faultOccurrenceReading: "",
  faultDetail: "",
  status: "Pending",
  faultClearanceDate: "",
  faultClearanceReading: "",
  responsibleType: "",
  vendorName: "",
  ptclStaffName: "",
});

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

export default function RepairHistorySection({ repairs, loading, siteNames, onAdd, onUpdate, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingRowNumber, setEditingRowNumber] = useState(0);
  const [submitting, setSubmitting] = useState(false);
 
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
 
  const startNewEntry = () => {
    setForm(emptyForm());
    setEditingRowNumber(0);
    setShowForm((s) => !s);
  };

  const startEdit = (entry) => {
    setForm({
      exchangeName: entry.exchangeName || entry.site || "",
      dgNameCapacity: entry.dgNameCapacity || "",
      faultOccurrenceDate: entry.faultOccurrenceDate || entry.date || "",
      faultOccurrenceReading: entry.faultOccurrenceReading || "",
      faultDetail: entry.faultDetail || entry.issue || "",
      status: entry.status || "Pending",
      faultClearanceDate: entry.faultClearanceDate || "",
      faultClearanceReading: entry.faultClearanceReading || "",
      responsibleType: entry.responsibleType || "",
      vendorName: entry.vendorName || "",
      ptclStaffName: entry.ptclStaffName || "",
    });
    setEditingRowNumber(Number(entry.rowNumber || 0));
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.exchangeName.trim() || !form.dgNameCapacity.trim() || !form.faultDetail.trim()) return;
    setSubmitting(true);
    try {
      if (editingRowNumber && onUpdate) {
        await onUpdate(editingRowNumber, form);
      } else {
        await onAdd({ ...form, id: Date.now().toString() });
      }
      setForm(emptyForm());
      setEditingRowNumber(0);
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };
 
  const sorted = [...repairs].sort((a, b) => {
    const left = a.faultOccurrenceDate || a.date || "";
    const right = b.faultOccurrenceDate || b.date || "";
    return left < right ? 1 : -1;
  });
 
  return (
    <>
      <Card
        style={{ marginBottom: 22 }}
        title="Log a repair"
        desc="Exchange, DG details, fault timing, resolution status, and responsible person"
        right={
          <button
            onClick={startNewEntry}
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
                list="dg-site-names" placeholder="Exchange Name" value={form.exchangeName}
                onChange={(e) => update("exchangeName", e.target.value)}
                style={inputStyle}
              />
              <datalist id="dg-site-names">
                {siteNames.map((n) => <option key={n} value={n} />)}
              </datalist>
              <input
                placeholder="DG name / Capacity"
                value={form.dgNameCapacity}
                onChange={(e) => update("dgNameCapacity", e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input type="date" value={form.faultOccurrenceDate} onChange={(e) => update("faultOccurrenceDate", e.target.value)} style={{ ...inputStyle, maxWidth: 180 }} />
              <input
                placeholder="Fault occurance M/R reading"
                type="number"
                value={form.faultOccurrenceReading}
                onChange={(e) => update("faultOccurrenceReading", e.target.value)}
                style={{ ...inputStyle, maxWidth: 220 }}
              />
              <select value={form.status} onChange={(e) => update("status", e.target.value)} style={{ ...inputStyle, maxWidth: 150, cursor: "pointer" }}>
                {REPAIR_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <textarea
              placeholder="Detail of fault" value={form.faultDetail} onChange={(e) => update("faultDetail", e.target.value)}
              rows={2} style={{ ...inputStyle, resize: "vertical" }}
            />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input type="date" value={form.faultClearanceDate} onChange={(e) => update("faultClearanceDate", e.target.value)} style={{ ...inputStyle, maxWidth: 180 }} />
              <input
                placeholder="Fault clearance M/R reading"
                type="number"
                value={form.faultClearanceReading}
                onChange={(e) => update("faultClearanceReading", e.target.value)}
                style={{ ...inputStyle, maxWidth: 220 }}
              />
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <select value={form.responsibleType} onChange={(e) => update("responsibleType", e.target.value)} style={{ ...inputStyle, maxWidth: 180, cursor: "pointer" }}>
                {RESPONSIBLE_OPTIONS.map((option) => <option key={option || "none"} value={option}>{option || "Select Vendor / PTCL (optional)"}</option>)}
              </select>
              {form.responsibleType === "Vendor" ? (
                <input
                  placeholder="Vendor name"
                  value={form.vendorName}
                  onChange={(e) => update("vendorName", e.target.value)}
                  style={inputStyle}
                />
              ) : (
                <input
                  placeholder="PTCL staff name"
                  value={form.ptclStaffName}
                  onChange={(e) => update("ptclStaffName", e.target.value)}
                  style={inputStyle}
                />
              )}
            </div>

            <div>
              <button type="submit" style={{
                border: "none", cursor: "pointer", background: COLORS.green, color: "#fff",
                borderRadius: 8, padding: "8px 16px", fontSize: 12.5, fontWeight: 600,
              }} disabled={submitting}>
                {submitting ? "Saving..." : editingRowNumber ? "Update entry" : "Save entry"}
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
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{r.exchangeName || r.site}</span>
                  <span style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'IBM Plex Mono', monospace" }}>{r.faultOccurrenceDate || r.date}</span>
                  <span style={{
                    fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
                    color: "#fff", background: STATUS_COLORS[r.status] || COLORS.textDim,
                  }}>
                    {r.status}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: COLORS.text, fontWeight: 600 }}>{r.dgNameCapacity || ""}</div>
                <div style={{ fontSize: 12.5, color: COLORS.text, marginTop: 4 }}>{r.faultDetail || r.issue}</div>
                <div style={{ fontSize: 11.5, color: COLORS.textDim, marginTop: 6, display: "grid", gap: 2 }}>
                  {(r.faultOccurrenceReading || r.faultOccurrenceReading === 0) ? <div>Fault occurance M/R reading: {r.faultOccurrenceReading}</div> : null}
                  {r.faultClearanceDate ? <div>Fault clearance date: {r.faultClearanceDate}</div> : null}
                  {(r.faultClearanceReading || r.faultClearanceReading === 0) ? <div>Fault clearance M/R reading: {r.faultClearanceReading}</div> : null}
                  {r.responsibleType ? (
                    <div>
                      By {r.responsibleType}: {r.responsibleType === "Vendor" ? (r.vendorName || "—") : (r.ptclStaffName || "—")}
                    </div>
                  ) : null}
                  {!r.responsibleType && (r.parts || r.cost) ? (
                    <div>
                      {r.parts ? `Parts: ${r.parts}` : ""}{r.parts && r.cost ? " · " : ""}{r.cost ? `PKR ${r.cost}` : ""}
                    </div>
                  ) : null}
                  {!r.responsibleType && !r.parts && !r.cost && r.dgNameCapacity == null && (r.issue || r.site) ? (
                    <div>Legacy entry</div>
                  ) : null}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => startEdit(r)} title="Edit"
                  style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }}
                >
                  <Pencil size={14} color={COLORS.textDim} />
                </button>
                <button
                  onClick={() => onDelete(r.id, r.rowNumber)} title="Delete"
                  style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }}
                >
                  <Trash2 size={14} color={COLORS.textDim} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
