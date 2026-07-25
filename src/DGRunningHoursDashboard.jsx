import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import { parseWorkbook } from "./services/excelParser";
import {
  Upload, Gauge, Fuel, AlertTriangle, ChevronDown, FolderOpen, Trash2, Check,
  Wrench, Activity, Plus, X, LayoutDashboard, Radio, ArrowRight, ClipboardList
} from "lucide-react";
 import Sidebar from "./components/Sidebar";
 import StatCard from "./components/StatCard";
import { getDailyMeterReadings } from "./api/googleSheets";

 import Card from "./components/Card";
import { COLORS } from "./styles/colors";
 import CustomTooltip from "./components/CustomTooltip";
import SiteSelect from "./components/SiteSelect";
import NoReportState from "./components/NoReportState";
import RepairHistorySection from "./components/RepairHistorySection";
import UploadSection from "./components/UploadSection";
import {
  storage,
  loadIndex,
  saveReport,
  deleteReport,
  loadRepairs,
  saveRepairs,
  reportKey
} from "./services/storage";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');`;
 
 
function isFaulty(name) {
  return /faulty/i.test(name || "");
}
 
// --- Parsing -----------------------------------------------------------
// Reads the "Daily Difference" (running hours) columns AND the "POL Filled"
// (fuel topped up) columns that sit alongside them in the same meter-reading
// template, so one upload feeds both the Usage and Fuel Balance sections.

 
// --- Derived series ------------------------------------------------------
function useDerived(parsed) {
  return useMemo(() => {
    if (!parsed) return null;
    const { days, sites } = parsed;
    const active = sites.filter((s) => !s.faulty);
 
    const daily = days.map((day, i) => {
      let sum = 0, n = 0;
      active.forEach((s) => {
        const v = s.readings[i];
        if (v !== null) { sum += v; n++; }
      });
      return { day: `D${day}`, totalHours: n ? Math.round(sum * 10) / 10 : null };
    });
 
    const totals = active.map((s) => {
      const vals = s.readings.filter((v) => v !== null);
      const sum = vals.reduce((a, b) => a + b, 0);
      return { name: s.name, total: Math.round(sum * 10) / 10, days: vals.length };
    }).sort((a, b) => b.total - a.total);
 
    const monthTotal = Math.round(totals.reduce((a, s) => a + s.total, 0) * 10) / 10;
    const faultyCount = sites.length - active.length;
 
    return { daily, totals, monthTotal, activeCount: active.length, faultyCount, siteNames: active.map((s) => s.name) };
  }, [parsed]);
}
 function useSheetSummary(sheetData) {
  return useMemo(() => {
    if (!sheetData || sheetData.length === 0) return null;

    const totalSites = new Set(
      sheetData.map(item => item.site)
    ).size;

    const latestBySite = {};

    sheetData.forEach(item => {
      const existing = latestBySite[item.site];

      if (!existing || new Date(item.date) > new Date(existing.date)) {
        latestBySite[item.site] = item;
      }
    });

    const latestReadings = Object.values(latestBySite);

    const lifetimeHours = latestReadings.reduce(
      (sum, item) => sum + (item.hourMeter || 0),
      0
    );

    const today = new Date().toISOString().split("T")[0];

    const todayHours = sheetData
      .filter(item =>
        item.date.startsWith(today)
      )
      .reduce(
        (sum, item) => sum + (item.dailyHours || 0),
        0
      );

    const monthlyHours = sheetData.reduce(
      (sum, item) => sum + (item.dailyHours || 0),
      0
    );

    const faultyDGs = sheetData.filter(item =>
      /faulty/i.test(item.site)
    ).length;

    const totalFuelAvailable = latestReadings.reduce(
      (sum, item) => sum + (item.fuelAvailable || 0),
      0
    );

    return {
      totalSites,
      lifetimeHours: Math.round(lifetimeHours),
      todayHours: Math.round(todayHours * 10) / 10,
      monthlyHours: Math.round(monthlyHours * 10) / 10,
      faultyDGs,
      totalFuelAvailable: Math.round(totalFuelAvailable * 10) / 10
    };

  }, [sheetData]);
}
function useFuelDerived(parsed) {
  return useMemo(() => {
    if (!parsed) return null;
    const { days, sites } = parsed;
    const active = sites.filter((s) => !s.faulty);
 
    const daily = days.map((day, i) => {
      let sum = 0, n = 0;
      active.forEach((s) => {
        const v = s.fuel[i];
        if (v !== null) { sum += v; n++; }
      });
      return { day: `D${day}`, totalFuel: n ? Math.round(sum * 10) / 10 : null };
    });
 
    const totals = active.map((s) => {
      const vals = s.fuel.filter((v) => v !== null);
      const sum = vals.reduce((a, b) => a + b, 0);
      return { name: s.name, total: Math.round(sum * 10) / 10, fills: vals.length };
    }).filter((s) => s.total > 0).sort((a, b) => b.total - a.total);
 
    const monthTotal = Math.round(totals.reduce((a, s) => a + s.total, 0) * 10) / 10;
 
    return { daily, totals, monthTotal, siteNames: active.map((s) => s.name) };
  }, [parsed]);
}
 
// --- Persistence (works inside claude.ai AND on a deployed Netlify site) --

 
// --- Shared UI pieces --------------------------------------------------
 

 

 


 
// Empty state shown on Usage / Fuel / Summary when no report is loaded yet.

 
// --- Sidebar -------------------------------------------------------------
 
const NAV_ITEMS = [
  { key: "summary", label: "Summary of DGs", icon: LayoutDashboard },
  { key: "usage", label: "DG Usage", icon: Activity },
  { key: "fuel", label: "DG Fuel Balance", icon: Fuel },
  { key: "repair", label: "DG Repair History", icon: Wrench },
  { key: "upload", label: "Upload Files", icon: Upload },
];
 
function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px", marginBottom: 26 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 7, background: COLORS.red,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Radio size={18} color="#fff" />
      </div>
      <div>
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", letterSpacing: 0.4 }}>PTCL</div>
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 10, color: COLORS.onNavyDim, letterSpacing: 0.3, marginTop: -1 }}>DG Operations · BWN</div>
      </div>
    </div>
  );
}
 

// --- Summary section -------------------------------------------------------
 
function SummarySection({ 
  parsed, 
  derived, 
  fuelDerived,
  sheetSummary,
  meterDerived,
  repairs, 
  repairsLoading, 
  savedReports, 
  onGoUpload, 
  onLoad 
}) {
  const openRepairs = repairs.filter((r) => r.status !== "Resolved").length;
  const recentRepairs = [...repairs].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
  const topSites = derived ? derived.totals.slice(0, 5) : [];
 
  return (
    <>
<div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>

  <StatCard 
    icon={Gauge} 
    label="Total DGs" 
    value={sheetSummary ? sheetSummary.totalSites : "—"} 
    tone="navy" 
  />

  <StatCard 
    icon={Activity} 
    label="Total Run Hours Yesterday" 
    value={sheetSummary ? sheetSummary.todayHours.toFixed(2) : "—"} 
    sub="Daily operation"
    tone="red" 
  />

  <StatCard 
    icon={Activity} 
    label="Total Run Hours This Month" 
    value={sheetSummary ? sheetSummary.monthlyHours.toFixed(2) : "—"} 
    sub="Monthly total"
    tone="blue" 
  />

  <StatCard 
    icon={Fuel} 
    label="Total Fuel Available" 
    value={sheetSummary ? sheetSummary.totalFuelAvailable.toFixed(2) : "—"} 
    sub="All DGs (Litres)"
    tone="green" 
  />

</div>
 
      {!parsed ? (
        <NoReportState savedReports={savedReports} onLoad={onLoad} onGoUpload={onGoUpload} />
      ) : (
        <>
          <Card title="Fleet-wide daily running hours" desc={`${parsed.monthLabel} — sum of all reporting sites`}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={derived.daily} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<CustomTooltip unit="hrs" />} />
                <ReferenceLine y={0} stroke={COLORS.panelEdge} />
                <Line type="monotone" dataKey="totalHours" name="Total hrs" stroke={COLORS.red} strokeWidth={2.2} dot={{ r: 3, fill: COLORS.red, strokeWidth: 0 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </Card>
 
          <Card title="Top 5 sites by run hours" desc={parsed.monthLabel}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topSites} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
                <YAxis type="category" dataKey="name" width={200} tick={{ fill: COLORS.text, fontSize: 10.5, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip unit="hrs" />} />
                <Bar dataKey="total" name="Total hrs" fill={COLORS.navy} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
 
      <Card title="Recent repair activity" desc={repairsLoading ? "Loading…" : `${repairs.length} logged`} style={{ marginBottom: 0 }}>
        {!repairsLoading && recentRepairs.length === 0 && (
          <div style={{ padding: "16px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>No repairs logged yet.</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 10 }}>
          {recentRepairs.map((r) => (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              border: `1px solid ${COLORS.panelEdge}`, borderRadius: 8, padding: "8px 12px",
            }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 12.5 }}>{r.site}</span>
                <span style={{ fontSize: 11, color: COLORS.textDim, marginLeft: 8, fontFamily: "'IBM Plex Mono', monospace" }}>{r.date}</span>
              </div>
              <span style={{
                fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 12, color: "#fff", flexShrink: 0,
                background: r.status === "Resolved" ? COLORS.green : r.status === "In Progress" ? COLORS.amber : COLORS.red,
              }}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
 
// --- Repair History section ------------------------------------------------
 
const REPAIR_STATUSES = ["Pending", "In Progress", "Resolved"];
const STATUS_COLORS = { Pending: COLORS.red, "In Progress": COLORS.amber, Resolved: COLORS.green };
 

 
const inputStyle = {
  flex: 1, minWidth: 160, border: `1px solid ${COLORS.panelEdge}`, borderRadius: 8, padding: "8px 10px",
  fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12.5, background: COLORS.bg, color: COLORS.text,
  boxSizing: "border-box",
};
 
// --- Upload Files section ---------------------------------------------------
 

 
// --- Main app --------------------------------------------------------------
 
export default function DGRunningHoursDashboard() {
  const [section, setSection] = useState("summary");
 
  const [parsed, setParsed] = useState(null);
  const [sheetData, setSheetData] = useState([]);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedSite, setSelectedSite] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [savedReports, setSavedReports] = useState([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
  const inputRef = useRef(null);
 
  const [repairs, setRepairs] = useState([]);
  const [repairsLoading, setRepairsLoading] = useState(true);
 
useEffect(() => {
  let cancelled = false;

  // Existing code
  loadIndex().then((idx) => {
    if (!cancelled) {
      setSavedReports(idx);
      setSavedLoading(false);
    }
  });

  loadRepairs().then((list) => {
    if (!cancelled) {
      setRepairs(list);
      setRepairsLoading(false);
    }
  });

  // NEW - Load data from Google Sheets
  getDailyMeterReadings()
    .then((data) => {
      if (!cancelled) {
        console.log("Google Sheets Data:", data);
        setSheetData(data);
      }
    })
    .catch((err) => {
      console.error("Google Sheets Error:", err);
    });

  return () => {
    cancelled = true;
  };
}, []);
 
  const derived = useDerived(parsed);
  const fuelDerived = useFuelDerived(parsed);
 const sheetSummary = useSheetSummary(sheetData);
 const meterDerived = useMemo(() => {
  if (!sheetData || sheetData.length === 0) {
    return null;
  }

  const totalRunHours = sheetData.reduce(
    (sum, item) => sum + Number(item.dailyHours || 0),
    0
  );

  const totalMeterReading = sheetData.reduce(
    (sum, item) => sum + Number(item.hourMeter || 0),
    0
  );

  return {
    totalRunHours,
    totalMeterReading,
    siteCount: sheetData.length
  };

}, [sheetData]);
  const handleFile = useCallback((file) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setFileName(file.name);
    setSaveStatus("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const result = parseWorkbook(wb);
        setParsed(result);
        setSelectedSite("");
        saveReport(result)
          .then((idx) => { setSavedReports(idx); setSaveStatus(`Saved — ${result.monthLabel}`); })
          .catch(() => setSaveStatus("Parsed, but couldn't save for later (storage error)."));
      } catch (err) {
        setError(err.message || "Could not read this file.");
        setParsed(null);
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => { setError("Failed to read the file."); setLoading(false); };
    reader.readAsArrayBuffer(file);
  }, []);
 
  const loadSavedReport = useCallback(async (monthKey) => {
    setError(null);
    setSaveStatus("");
    try {
      const res = await storage.get(reportKey(monthKey));
      if (res && res.value) {
        setParsed(JSON.parse(res.value));
        setFileName("");
        setSelectedSite("");
      }
    } catch {
      setError("Couldn't load that saved report.");
    }
  }, []);
 
  const removeSavedReport = useCallback(async (monthKey, e) => {
    e.stopPropagation();
    try {
      const idx = await deleteReport(monthKey);
      setSavedReports(idx);
      setParsed((p) => (p && p.monthKey === monthKey ? null : p));
    } catch {
      setError("Couldn't remove that saved report.");
    }
  }, []);
 
  const addRepair = useCallback((entry) => {
    setRepairs((prev) => {
      const next = [entry, ...prev];
      saveRepairs(next).catch(() => {});
      return next;
    });
  }, []);
 
  const deleteRepair = useCallback((id) => {
    setRepairs((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveRepairs(next).catch(() => {});
      return next;
    });
  }, []);
 
  const siteSeries = useMemo(() => {
    if (!parsed || !selectedSite) return null;
    const site = parsed.sites.find((s) => s.name === selectedSite);
    if (!site) return null;
    return parsed.days.map((day, i) => ({ day: `D${day}`, hours: site.readings[i], fuel: site.fuel[i] }));
  }, [parsed, selectedSite]);
 
  const sectionMeta = {
    summary: { title: "Summary of DGs", desc: "Fleet-wide snapshot across usage, fuel and repairs", icon: LayoutDashboard },
    usage: { title: "DG Usage — Daily Meter Readings", desc: "Daily generator running hours per site", icon: Activity },
    fuel: { title: "DG Fuel Balance", desc: "Fuel (POL) topped up per site", icon: Fuel },
    repair: { title: "DG Repair History", desc: "Log and track generator repairs, spares used, and status", icon: Wrench },
    upload: { title: "Upload Files", desc: "Add a monthly meter-reading sheet, or manage what's saved", icon: Upload },
  }[section];
  const HeaderIcon = sectionMeta.icon;
 
  return (
    <div style={{ display: "flex", minHeight: "100%", background: COLORS.bg, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{FONT_IMPORT}</style>
      <Sidebar active={section} onSelect={setSection} />
 
      <div style={{ flex: 1, minWidth: 0, color: COLORS.text, padding: "22px 24px 40px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <HeaderIcon size={20} color={COLORS.red} />
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: 0.2, color: COLORS.navy }}>{sectionMeta.title}</h1>
        </div>
        <div style={{ fontSize: 12.5, color: COLORS.textDim, marginBottom: 20, marginLeft: 30 }}>
          {(section === "usage" || section === "fuel") && parsed ? (parsed.title || "Parsed report") : sectionMeta.desc}
        </div>
 
        {section === "summary" && (
          <SummarySection
  parsed={parsed}
  derived={derived}
  fuelDerived={fuelDerived}
  sheetSummary={sheetSummary}
  meterDerived={meterDerived}
            repairs={repairs} repairsLoading={repairsLoading}
            savedReports={savedReports} onGoUpload={() => setSection("upload")} onLoad={loadSavedReport}
          />
        )}
 
        {section === "usage" && (
          derived ? (
            <>
              <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
               <StatCard 
 icon={Gauge} 
 label="Sites reporting" 
 value={meterDerived ? meterDerived.siteCount : "—"} 
 tone="navy" 
/>

<StatCard 
 icon={Activity} 
 label="Daily Run Hours" 
 value={meterDerived ? meterDerived.totalRunHours.toFixed(2) : "—"} 
 tone="red" 
/>

<StatCard 
 icon={ClipboardList} 
 label="Total DG Hour Meter" 
 value={meterDerived ? meterDerived.totalMeterReading.toFixed(2) : "—"} 
 tone="green" 
/>
               
                      <StatCard icon={Gauge} label="Days covered" value={parsed.days.length} sub="this month" tone="navy" />
              </div>
 
              <Card title="Fleet-wide daily running hours" desc="Sum of all reporting sites' daily meter-reading difference, per day of the month">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={derived.daily} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
                    <YAxis tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} width={46} />
                    <Tooltip content={<CustomTooltip unit="hrs" />} />
                    <ReferenceLine y={0} stroke={COLORS.panelEdge} />
                    <Line type="monotone" dataKey="totalHours" name="Total hrs" stroke={COLORS.red} strokeWidth={2.2} dot={{ r: 3, fill: COLORS.red, strokeWidth: 0 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
 
              <Card title="Total run hours by site (this month)" desc="Ranked highest to lowest — pick a site below to see its daily trend">
                <ResponsiveContainer width="100%" height={Math.max(240, derived.totals.length * 20)}>
                  <BarChart data={derived.totals} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={210} tick={{ fill: COLORS.text, fontSize: 10.5, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip unit="hrs" />} />
                    <Bar dataKey="total" name="Total hrs" fill={COLORS.green} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
 
              <Card
                title="Site drill-down" desc="Daily running hours for one site" style={{ marginBottom: 0 }}
                right={<SiteSelect value={selectedSite} onChange={setSelectedSite} siteNames={derived.siteNames} />}
              >
                {siteSeries ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={siteSeries} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
                      <YAxis tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip content={<CustomTooltip unit="hrs" />} />
                      <Bar dataKey="hours" name="Hrs" fill={COLORS.red} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ padding: "30px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
                    Pick a site above to see its daily run-hours bars
                  </div>
                )}
              </Card>
            </>
          ) : (
            <NoReportState savedReports={savedReports} onLoad={loadSavedReport} onGoUpload={() => setSection("upload")} />
          )
        )}
 
        {section === "fuel" && (
          fuelDerived ? (
            <>
              <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
                <StatCard icon={Fuel} label="Sites with fuel entries" value={fuelDerived.totals.length} tone="blue" />
                <StatCard icon={Fuel} label="Fleet total fuel filled" value={`${fuelDerived.monthTotal} L`} sub="this month" tone="blue" />
                <StatCard icon={Gauge} label="Days covered" value={parsed.days.length} sub="this month" tone="navy" />
              </div>
 
              <Card title="Fleet-wide daily fuel filled" desc="Sum of POL filled (litres) across all sites, per day of the month">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={fuelDerived.daily} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
                    <YAxis tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} width={46} />
                    <Tooltip content={<CustomTooltip unit="L" />} />
                    <ReferenceLine y={0} stroke={COLORS.panelEdge} />
                    <Line type="monotone" dataKey="totalFuel" name="Fuel filled" stroke={COLORS.blue} strokeWidth={2.2} dot={{ r: 3, fill: COLORS.blue, strokeWidth: 0 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
 
              {fuelDerived.totals.length > 0 ? (
                <Card title="Total fuel filled by site (this month)" desc="Only sites with at least one fuel entry are shown">
                  <ResponsiveContainer width="100%" height={Math.max(200, fuelDerived.totals.length * 22)}>
                    <BarChart data={fuelDerived.totals} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={210} tick={{ fill: COLORS.text, fontSize: 10.5, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip unit="L" />} />
                      <Bar dataKey="total" name="Litres" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              ) : (
                <Card>
                  <div style={{ padding: "16px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
                    No fuel-filled entries found in this sheet for any site.
                  </div>
                </Card>
              )}
 
              <Card
                title="Site drill-down" desc="Daily fuel filled for one site" style={{ marginBottom: 0 }}
                right={<SiteSelect value={selectedSite} onChange={setSelectedSite} siteNames={derived ? derived.siteNames : fuelDerived.siteNames} />}
              >
                {siteSeries ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={siteSeries} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
                      <YAxis tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip content={<CustomTooltip unit="L" />} />
                      <Bar dataKey="fuel" name="Litres" fill={COLORS.blue} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ padding: "30px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
                    Pick a site above to see its daily fuel-filled bars
                  </div>
                )}
              </Card>
            </>
          ) : (
            <NoReportState savedReports={savedReports} onLoad={loadSavedReport} onGoUpload={() => setSection("upload")} />
          )
        )}
 
        {section === "repair" && (
          <RepairHistorySection
            repairs={repairs}
            loading={repairsLoading}
            siteNames={derived ? derived.siteNames : []}
            onAdd={addRepair}
            onDelete={deleteRepair}
          />
        )}
 
        {section === "upload" && (
          <UploadSection
            fileName={fileName} loading={loading} dragOver={dragOver} setDragOver={setDragOver}
            inputRef={inputRef} handleFile={handleFile} saveStatus={saveStatus}
            savedReports={savedReports} savedLoading={savedLoading} parsed={parsed}
            loadSavedReport={loadSavedReport} removeSavedReport={removeSavedReport} error={error}
          />
        )}
      </div>
    </div>
  );
}