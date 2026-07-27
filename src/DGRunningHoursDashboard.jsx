import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Legend,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import { parseWorkbook } from "./services/excelParser";
import {
  Gauge, Fuel, AlertTriangle, Check,
  Wrench, Activity, LayoutDashboard, Radio, ClipboardList, CalendarDays, Link2,
  ClipboardCheck, Zap, Droplets, FileSpreadsheet
} from "lucide-react";
 import Sidebar from "./components/Sidebar";
 import StatCard from "./components/StatCard";
import { getDailyMeterReadings, getSummaryData, getFuelBalanceData } from "./api/googleSheets";

 import Card from "./components/Card";
import { COLORS } from "./styles/colors";
 import CustomTooltip from "./components/CustomTooltip";
import SiteSelect from "./components/SiteSelect";
import NoReportState from "./components/NoReportState";
import RepairHistorySection from "./components/RepairHistorySection";
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
 
 
function toLocalDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeSiteName(name) {
  return String(name || "")
    .replace(/\s+/g, " ")
    .replace(/\s*\(\s*/g, " (")
    .replace(/\s*\)\s*/g, ")")
    .trim();
}

function siteMatchKey(name) {
  return normalizeSiteName(name).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function findSiteConsumption(fuelBalanceDerived, siteName) {
  if (!fuelBalanceDerived) return 0;

  const key = siteMatchKey(siteName);
  if (fuelBalanceDerived.consumptionBySite.has(key)) {
    return fuelBalanceDerived.consumptionBySite.get(key);
  }

  const match = fuelBalanceDerived.consumptionSites.find((site) => {
    return key.includes(site.key) || site.key.includes(key);
  });

  return match ? match.perHourFuelConsumption : 0;
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

    // Total DGs (unique DG names)
    const totalSites = sheetData.length;

    // Count working vs faulty DGs based on status field
    const workingDGs = sheetData.filter(item =>
      /working/i.test(item.status || "")
    ).length;
    
    const faultyDGCount = sheetData.filter(item =>
      /faulty/i.test(item.status || "")
    ).length;

    // Summary by capacity
    const capacityGroups = {};
    sheetData.forEach(item => {
      const capacity = item.capacity || "Unknown";
      capacityGroups[capacity] = (capacityGroups[capacity] || 0) + 1;
    });

    // Engine manufacturer summary
    const engineSummary = {};
    sheetData.forEach(item => {
      const engine = item.engine || "Unknown";
      engineSummary[engine] = (engineSummary[engine] || 0) + 1;
    });
    
    const topEngineManufacturer = Object.entries(engineSummary).sort((a, b) => b[1] - a[1])[0] || ["Unknown", 0];

    return {
      totalSites,
      lifetimeHours: 0,
      todayHours: 0,
      monthlyHours: 0,
      faultyDGs: faultyDGCount,
      totalFuelAvailable: 0,
      workingDGs,
      faultyDGCount,
      capacityGroups,
      topEngineManufacturer: topEngineManufacturer[0],
      topEngineCount: topEngineManufacturer[1]
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

// --- Derived series for the "Fuel Balance" Google Sheet --------------------
function useFuelBalanceDerived(fuelBalanceData) {
  return useMemo(() => {
    if (!fuelBalanceData || fuelBalanceData.length === 0) return null;

    const totals = fuelBalanceData
      .map((row) => ({
        name: normalizeSiteName(row.site || ""),
        fuelBalance: Number(row.fuelBalance || 0),
        perHourFuelConsumption: Number(row.perHourFuelConsumption || 0),
      }))
      .filter((s) => s.name)
      .sort((a, b) => b.fuelBalance - a.fuelBalance);

    const grandTotal = Math.round(totals.reduce((a, s) => a + s.fuelBalance, 0) * 100) / 100;
    const consumptionBySite = new Map();
    const consumptionSites = [];
    totals.forEach((site) => {
      const key = siteMatchKey(site.name);
      if (key) {
        consumptionBySite.set(key, site.perHourFuelConsumption);
        consumptionSites.push({ key, name: site.name, perHourFuelConsumption: site.perHourFuelConsumption });
      }
    });

    return {
      totals,
      grandTotal,
      consumptionBySite,
      consumptionSites,
      siteCount: totals.length,
      siteNames: totals.map((s) => s.name),
    };
  }, [fuelBalanceData]);
}
 
// --- Persistence (works inside claude.ai AND on a deployed Netlify site) --

 
// --- Shared UI pieces --------------------------------------------------
 

 

 


 
// Empty state shown on Usage / Fuel / Summary when no report is loaded yet.

 
// --- Sidebar -------------------------------------------------------------
 
function _Logo() {
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
  sheetSummary,
  meterDerived,
  fuelBalanceDerived
}) {
  const topSites = derived ? derived.totals.slice(0, 5) : [];
 
  return (
    <>
<div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>

  <StatCard 
    icon={Gauge} 
    label="Total DGs" 
    value={sheetSummary ? sheetSummary.totalSites : "—"} 
    tone="navy" 
  />

  <StatCard 
    icon={Activity} 
    label="Latest Daily Run Hours" 
    value={meterDerived ? meterDerived.latestDailyHours.toFixed(2) : "—"} 
    sub={meterDerived?.latestDate ? meterDerived.latestDate.toLocaleDateString("en-PK") : "Daily operation"}
    tone="red" 
  />

  <StatCard 
    icon={Activity} 
    label="Total Run Hours This Month" 
    value={meterDerived ? meterDerived.monthlyHours.toFixed(2) : "—"} 
    sub="Monthly total"
    tone="blue" 
  />

  <StatCard 
    icon={Fuel} 
    label="Total Fuel Available" 
    value={fuelBalanceDerived ? fuelBalanceDerived.grandTotal.toFixed(2) : "—"} 
    sub="All DGs (Litres)"
    tone="green" 
  />

  <StatCard 
    icon={Check} 
    label="DG Sets Working" 
    value={sheetSummary ? sheetSummary.workingDGs : "—"} 
    tone="green" 
  />

  <StatCard 
    icon={AlertTriangle} 
    label="DG Sets Faulty" 
    value={sheetSummary ? sheetSummary.faultyDGCount : "—"} 
    tone="red" 
  />

</div>
 
      {parsed && (
        <div className="dashboard-chart-grid">
          <Card title="Fleet-wide daily running hours" desc={`${parsed.monthLabel} — sum of all reporting sites`}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={derived.daily} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<CustomTooltip unit="hrs" />} />
                <ReferenceLine y={0} stroke={COLORS.panelEdge} />
                <Line type="monotone" dataKey="totalHours" name="Total hrs" stroke={COLORS.red} strokeWidth={2.2} dot={{ r: 3, fill: COLORS.red, strokeWidth: 0 }} connectNulls>
                  <LabelList dataKey="totalHours" position="top" formatter={(value) => value ?? ""} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                </Line>
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
                <Bar dataKey="total" name="Total hrs" fill={COLORS.navy} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  <LabelList dataKey="total" position="right" formatter={(value) => `${value}h`} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </>
  );
}
 
// --- Upload Files section ---------------------------------------------------
 

 
// --- Main app --------------------------------------------------------------
 
export default function DGRunningHoursDashboard() {
  const [section, setSection] = useState("summary");
  const [now, setNow] = useState(() => new Date());
 
  const [parsed, setParsed] = useState(null);
  const [sheetData, setSheetData] = useState([]);
  const [meterData, setMeterData] = useState([]);
  const [fuelBalanceData, setFuelBalanceData] = useState([]);
  const [fuelBalanceLoading, setFuelBalanceLoading] = useState(true);
  const [fuelBalanceError, setFuelBalanceError] = useState("");
  const [_error, _setError] = useState(null);
  const [_fileName, _setFileName] = useState("");
  const [_loading, _setLoading] = useState(false);
  const [selectedSite, setSelectedSite] = useState("");
  const [selectedUsageDate, setSelectedUsageDate] = useState("");
  const [_dragOver, _setDragOver] = useState(false);
  const [savedReports, setSavedReports] = useState([]);
  const [_savedLoading, _setSavedLoading] = useState(true);
  const [_saveStatus, _setSaveStatus] = useState("");
  const _inputRef = useRef(null);
 
  const [repairs, setRepairs] = useState([]);
  const [repairsLoading, setRepairsLoading] = useState(true);

useEffect(() => {
  const timer = window.setInterval(() => setNow(new Date()), 1000);
  return () => window.clearInterval(timer);
}, []);
 
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

  // NEW - Load both meter data and summary data from Google Sheets
  
  // Load daily meter readings
  getDailyMeterReadings()
    .then((data) => {
      if (!cancelled) {
        console.log("✓ Google Sheets Meter Data loaded:", data?.length || 0, "rows");
        setMeterData(data);
      }
    })
    .catch((err) => {
      console.error("✗ Failed to load meter data:", err);
    });

  // Load summary data
  getSummaryData()
    .then((data) => {
      if (!cancelled) {
        console.log("✓ Google Sheets Summary Data loaded:", data?.length || 0, "DGs");
        setSheetData(data);
      }
    })
    .catch((err) => {
      console.error("✗ Google Sheets Error:", err);
    });

  // Load Fuel Balance data from the "Fuel Balance" sheet
  getFuelBalanceData()
    .then((data) => {
      if (!cancelled) {
        console.log("✓ Google Sheets Fuel Balance Data loaded:", data?.length || 0, "sites");
        setFuelBalanceData(data);
        setFuelBalanceLoading(false);
      }
    })
    .catch((err) => {
      console.error("✗ Failed to load fuel balance data:", err);
      if (!cancelled) {
        setFuelBalanceError(err.message || "Could not load fuel balance data.");
        setFuelBalanceLoading(false);
      }
    });

  return () => {
    cancelled = true;
  };
}, []);
 
  const derived = useDerived(parsed);
  const fuelDerived = useFuelDerived(parsed);
  const fuelBalanceDerived = useFuelBalanceDerived(fuelBalanceData);
 const sheetSummary = useSheetSummary(sheetData);
 const meterDerived = useMemo(() => {
  if (!meterData || meterData.length === 0) {
    return null;
  }

  const today = new Date();
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const datedMeterData = meterData
    .map((item) => ({ ...item, parsedDate: item.date ? new Date(item.date) : null }))
    .filter((item) => item.parsedDate && !Number.isNaN(item.parsedDate.getTime()));

  const latestDate = datedMeterData.reduce((latest, item) => {
    return !latest || item.parsedDate > latest ? item.parsedDate : latest;
  }, null);

  const latestDateStr = latestDate ? latestDate.toISOString().split("T")[0] : "";
  
  // Calculate totals
  const totalRunHours = meterData.reduce(
    (sum, item) => sum + Number(item.dailyHours || 0),
    0
  );

  const latestDailyHours = datedMeterData
    .filter(item => item.parsedDate.toISOString().split("T")[0] === latestDateStr)
    .reduce((sum, item) => sum + Number(item.dailyHours || 0), 0);

  // This month's hours - simple approach: filter by month
  const monthlyHours = datedMeterData
    .filter(item => item.parsedDate >= thisMonthStart && item.parsedDate <= today)
    .reduce((sum, item) => sum + Number(item.dailyHours || 0), 0);

  const totalMeterReading = meterData.reduce(
    (sum, item) => sum + Number(item.hourMeter || 0),
    0
  );

  return {
    totalRunHours,
    latestDailyHours,
    latestDate,
    monthlyHours,
    totalMeterReading,
    siteCount: new Set(meterData.map((m) => normalizeSiteName(m.site)).filter(Boolean)).size
  };

}, [meterData]);
  const usageDateOptions = useMemo(() => {
    const dates = new Set();
    meterData.forEach((item) => {
      const key = toLocalDateKey(item.date);
      if (key) dates.add(key);
    });
    return [...dates].sort((a, b) => b.localeCompare(a));
  }, [meterData]);

useEffect(() => {
  if (!selectedUsageDate && usageDateOptions.length > 0) {
    setSelectedUsageDate(usageDateOptions[0]);
  }
}, [selectedUsageDate, usageDateOptions]);

  const selectedUsageData = useMemo(() => {
    if (!selectedUsageDate) return [];

    const usageBySite = new Map();

    meterData
      .filter((item) => toLocalDateKey(item.date) === selectedUsageDate)
      .forEach((item) => {
        const name = normalizeSiteName(item.site);
        if (!name) return;

        const previous = usageBySite.get(name) || { name, hours: 0, hourMeter: 0 };
        usageBySite.set(name, {
          name,
          hours: previous.hours + Number(item.dailyHours || 0),
          hourMeter: Number(item.hourMeter || previous.hourMeter || 0),
        });
      });

    return [...usageBySite.values()]
      .map((item) => {
        const perHourFuelConsumption = findSiteConsumption(fuelBalanceDerived, item.name);
        const hours = round2(item.hours);
        return {
          ...item,
          hours,
          perHourFuelConsumption,
          fuelConsumed: round2(hours * perHourFuelConsumption),
        };
      })
      .filter((item) => item.hours > 0)
      .sort((a, b) => (b.hours - a.hours) || a.name.localeCompare(b.name));
  }, [fuelBalanceDerived, meterData, selectedUsageDate]);

  const selectedUsageTotal = useMemo(() => {
    return Math.round(selectedUsageData.reduce((sum, item) => sum + item.hours, 0) * 100) / 100;
  }, [selectedUsageData]);

  const selectedFuelConsumedTotal = useMemo(() => {
    return round2(selectedUsageData.reduce((sum, item) => sum + item.fuelConsumed, 0));
  }, [selectedUsageData]);

  const selectedUsageLabel = selectedUsageDate
    ? new Date(`${selectedUsageDate}T00:00:00`).toLocaleDateString("en-PK", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

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
    summary: { title: "Summary of DGs", desc: "", icon: LayoutDashboard },
    usage: { title: "DG Usage and Fuel Balance", desc: "Daily run hours, estimated fuel consumed, and current fuel balance", icon: Activity },
    pmr: { title: "PMR Tracking", desc: "Section coming soon", icon: ClipboardCheck },
    electricity: { title: "Electricity Performance", desc: "Section coming soon", icon: Zap },
    fuelperf: { title: "Fuel Performance", desc: "Section coming soon", icon: Droplets },
    fuel: { title: "DG Usage and Fuel Balance", desc: "Daily run hours, estimated fuel consumed, and current fuel balance", icon: Fuel },
    repair: { title: "DG Repair History", desc: "Log and track generator repairs, spares used, and status", icon: Wrench },
    sheets: { title: "Google Sheets", desc: "Open the live workbook directly", icon: FileSpreadsheet },
  }[section];
  const HeaderIcon = sectionMeta.icon;
  const currentDate = now.toLocaleDateString("en-PK", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const currentTime = now.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
 
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "transparent", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{FONT_IMPORT}</style>
      <Sidebar active={section} onSelect={setSection} />
 
      <main style={{ flex: 1, minWidth: 0, color: COLORS.text, padding: "28px 32px 44px", boxSizing: "border-box" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 9,
              background: COLORS.panel,
              border: `1px solid ${COLORS.panelEdge}`,
              boxShadow: COLORS.shadowSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <HeaderIcon size={20} color={COLORS.red} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: 0, color: COLORS.navy, lineHeight: 1.15 }}>{sectionMeta.title}</h1>
          </div>
          <div style={{
            textAlign: "right",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            color: COLORS.textDim,
            whiteSpace: "nowrap",
            lineHeight: 1.45,
            background: COLORS.panel,
            border: `1px solid ${COLORS.panelEdge}`,
            borderRadius: 8,
            padding: "8px 11px",
            boxShadow: COLORS.shadowSoft,
          }}>
            <div>{currentDate}</div>
            <div style={{ color: COLORS.navy, fontWeight: 600 }}>{currentTime}</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: COLORS.textDim, marginBottom: 22, marginLeft: 50, maxWidth: 680, lineHeight: 1.35 }}>
          {(section === "usage" || section === "fuel") && parsed ? (parsed.title || "Parsed report") : sectionMeta.desc}
        </div>
 
        {section === "summary" && (
          <SummarySection
            parsed={parsed}
            derived={derived}
            sheetSummary={sheetSummary}
            meterDerived={meterDerived}
            fuelBalanceDerived={fuelBalanceDerived}
          />
        )}
 
        {section === "usage" && (
          <>
            <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
              <StatCard icon={Gauge} label="Sites reporting" value={meterDerived ? meterDerived.siteCount : "—"} tone="navy" />
              <StatCard icon={Activity} label="Selected date run hours" value={selectedUsageTotal.toFixed(2)} sub={selectedUsageLabel || "No date selected"} tone="red" />
              <StatCard icon={Fuel} label="Estimated fuel consumed" value={selectedFuelConsumedTotal.toFixed(2)} sub="Litres" tone="blue" />
              <StatCard icon={ClipboardList} label="DGs used on selected date" value={selectedUsageData.length} sub="" tone="green" />
              <StatCard icon={CalendarDays} label="Data available for days" value={usageDateOptions.length} tone="blue" />
            </div>

            <Card
              title="DG usage by site"
              desc="Sorted from highest usage to lowest for the selected date"
              style={{ marginBottom: 18 }}
              right={
                <select
                  value={selectedUsageDate}
                  onChange={(event) => setSelectedUsageDate(event.target.value)}
                  style={{
                    border: `1px solid ${COLORS.panelEdge}`,
                    borderRadius: 8,
                    padding: "8px 11px",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    color: COLORS.text,
                    background: COLORS.panelSoft,
                    minWidth: 150,
                    boxShadow: "0 1px 0 rgba(16,36,62,0.03)",
                  }}
                >
                  {usageDateOptions.map((date) => (
                    <option key={date} value={date}>
                      {new Date(`${date}T00:00:00`).toLocaleDateString("en-PK", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </option>
                  ))}
                </select>
              }
            >
              {usageDateOptions.length === 0 ? (
                <div style={{ padding: "34px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
                  Meter reading data is loading.
                </div>
              ) : selectedUsageData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={Math.max(300, selectedUsageData.length * 36)}>
                  <BarChart data={selectedUsageData} layout="vertical" barCategoryGap={10} barGap={4} margin={{ top: 8, right: 56, left: 10, bottom: 0 }}>
                    <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={280} interval={0} tick={{ fill: COLORS.text, fontSize: 10.5, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
                    <Legend verticalAlign="top" align="left" iconType="circle" wrapperStyle={{ paddingBottom: 8, fontSize: 12, fontFamily: "'IBM Plex Sans', sans-serif" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="hours" name="Run hours" fill={COLORS.red} radius={[0, 4, 4, 0]} isAnimationActive={false} barSize={18}>
                      <LabelList dataKey="hours" position="right" formatter={(value) => `${value}h`} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                    </Bar>
                    <Bar dataKey="perHourFuelConsumption" name="Fuel consumption" fill={COLORS.amber} radius={[0, 4, 4, 0]} isAnimationActive={false} barSize={18}>
                      <LabelList dataKey="perHourFuelConsumption" position="right" formatter={(value) => `${value}L`} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                    </Bar>
                    <Bar dataKey="fuelConsumed" name="Fuel consumed" fill={COLORS.blue} radius={[0, 4, 4, 0]} isAnimationActive={false} barSize={18}>
                      <LabelList dataKey="fuelConsumed" position="right" formatter={(value) => `${value}L`} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ padding: "34px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
                  No DG usage above zero for this date.
                </div>
              )}
            </Card>

            {/* Fuel Balance chart — sourced from the "Fuel Balance" Google Sheet */}
            <Card
              title="Fuel Balance by site"
              desc="Current fuel balance (litres) for all 32 sites, sorted highest to lowest"
              style={{ marginTop: 0, marginBottom: 0 }}
            >
              {fuelBalanceLoading ? (
                <div style={{ padding: "34px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
                  Fuel balance data is loading from the Google Sheet.
                </div>
              ) : fuelBalanceError ? (
                <div style={{ padding: "34px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
                  {fuelBalanceError}
                </div>
              ) : fuelBalanceDerived && fuelBalanceDerived.totals.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(320, fuelBalanceDerived.totals.length * 30)}>
                  <BarChart data={fuelBalanceDerived.totals} layout="vertical" margin={{ top: 8, right: 56, left: 10, bottom: 0 }}>
                    <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={280} interval={0} tick={{ fill: COLORS.text, fontSize: 10.5, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip unit="L" />} />
                    <Bar dataKey="fuelBalance" name="Fuel balance" fill={COLORS.blue} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                      <LabelList dataKey="fuelBalance" position="right" formatter={(value) => `${value}L`} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ padding: "34px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
                  No Fuel Balance sheet data found. The deployed Apps Script is currently returning Daily Meter Reading rows for this request.
                </div>
              )}
            </Card>
          </>
        )}

        {section === "__legacy_usage" && (
          derived ? (
            <>
              <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
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
            <NoReportState savedReports={savedReports} onLoad={loadSavedReport} onGoSheets={() => setSection("sheets")} />
          )
        )}
 
        {section === "fuel" && (
          fuelDerived ? (
            <>
              <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
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
            <NoReportState savedReports={savedReports} onLoad={loadSavedReport} onGoSheets={() => setSection("sheets")} />
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
 
        {section === "sheets" && (
          <Card title="Live Google Sheets" desc="Open the shared workbook directly in Google Sheets">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 13, color: COLORS.textDim, lineHeight: 1.5, maxWidth: 760 }}>
                Use this sheet for direct live updates. It contains the running data, fuel balance, and any edits that should appear in the dashboard.
              </div>
              <a
                href="https://docs.google.com/spreadsheets/d/1D34nuWkngNhA05O1O2t2nQ36wyLYo-FaCfEBpOxZS1o/edit?usp=sharing"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  width: "fit-content",
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: COLORS.blueSoft,
                  border: `1px solid ${COLORS.panelEdge}`,
                  color: COLORS.navy,
                  textDecoration: "none",
                  fontWeight: 700,
                  boxShadow: COLORS.shadowSoft,
                }}
              >
                <Link2 size={15} />
                Open Google Sheets
              </a>
            </div>
          </Card>
        )}

        {section === "pmr" && (
          <Card title="PMR Tracking" desc="Section coming soon">
            <div style={{ padding: "18px 0", color: COLORS.textDim, fontSize: 12.5 }}>
              Tell me what should go here and I’ll wire it in.
            </div>
          </Card>
        )}

        {section === "electricity" && (
          <Card title="Electricity Performance" desc="Section coming soon">
            <div style={{ padding: "18px 0", color: COLORS.textDim, fontSize: 12.5 }}>
              Tell me what should go here and I’ll wire it in.
            </div>
          </Card>
        )}

        {section === "fuelperf" && (
          <Card title="Fuel Performance" desc="Section coming soon">
            <div style={{ padding: "18px 0", color: COLORS.textDim, fontSize: 12.5 }}>
              Tell me what should go here and I’ll wire it in.
            </div>
          </Card>
        )}
        </div>
      </main>
    </div>
  );
}
