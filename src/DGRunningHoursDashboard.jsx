import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Legend,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import { parseWorkbook } from "./services/excelParser";
import {
  Gauge, Fuel, AlertTriangle, Check,
  Wrench, Activity, LayoutDashboard, Radio, ClipboardList, CalendarDays, Link2, ArrowUpRight, ArrowDownRight, RotateCcw
} from "lucide-react";
 import Sidebar from "./components/Sidebar";
 import StatCard from "./components/StatCard";
import { getDailyMeterReadings, getSummaryData, getFuelBalanceData, getPMRTrackingData, getCPData } from "./api/googleSheets";

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

const PMR_CATEGORY_BUCKETS = [
  { key: "solar", label: "Solar Sites" },
  { key: "exchange", label: "Exchange" },
  { key: "msag", label: "MSAG" },
];

function getPmrCategoryBucket(category) {
  const normalizedCategory = normalizeSiteName(category).toLowerCase();
  if (normalizedCategory.includes("solar")) return "solar";
  if (normalizedCategory.includes("msag")) return "msag";
  if (normalizedCategory.includes("exchange")) return "exchange";
  // Keep unexpected labels within the Exchange bucket so top cards remain fixed to 3 categories.
  return "exchange";
}

function siteMatchKey(name) {
  return normalizeSiteName(name).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function formatPmDate(value) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

function getPmDateStatus(pmDate, thresholdDays) {
  const today = new Date();
  const cutoffDate = new Date(today);
  cutoffDate.setDate(today.getDate() - Number(thresholdDays || 0));
  const normalizedCutoff = new Date(cutoffDate.getFullYear(), cutoffDate.getMonth(), cutoffDate.getDate());

  if (!pmDate) {
    return { bg: "#f9d8e2", text: COLORS.text, state: "pending" };
  }

  const parsedDate = new Date(pmDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return { bg: "#f9d8e2", text: COLORS.text, state: "pending" };
  }

  const normalizedDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
  if (normalizedDate < normalizedCutoff) {
    return { bg: "#f8c7da", text: COLORS.text, state: "overdue" };
  }
  if (normalizedDate.getTime() === normalizedCutoff.getTime()) {
    return { bg: "#ffffff", text: COLORS.text, state: "threshold" };
  }
  return { bg: "#dff6e8", text: COLORS.text, state: "healthy" };
}

function findSiteConsumption(fuelBalanceDerived, siteName) {
  if (!fuelBalanceDerived) return 0;
  const key = siteMatchKey(siteName);
  if (!key) return 0;
  return fuelBalanceDerived.consumptionBySite.get(key) || 0;
}

function useFuelBalanceDerived(fuelBalanceData) {
  return useMemo(() => {
    const totals = (Array.isArray(fuelBalanceData) ? fuelBalanceData : [])
      .map((item) => ({
        name: normalizeSiteName(item.name || item.site || item.siteName || item["Site Name"] || ""),
        fuelBalance: Number(item.fuelBalance ?? item.fuel_balance ?? item["Fuel Balance"] ?? 0) || 0,
        perHourFuelConsumption: Number(item.perHourFuelConsumption ?? item.per_hour_fuel_consumption ?? item["Per Hour Fuel Consumption"] ?? 0) || 0,
      }))
      .filter((site) => site.name)
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

function useDerived(parsed) {
  return useMemo(() => {
    if (!parsed || !Array.isArray(parsed.days) || !Array.isArray(parsed.sites)) {
      return null;
    }

    const daily = parsed.days.map((day, index) => {
      const totalHours = round2(
        parsed.sites.reduce((sum, site) => sum + (Number(site?.readings?.[index] ?? 0) || 0), 0)
      );
      return { day: `D${day}`, totalHours };
    });

    const totals = parsed.sites
      .map((site) => ({
        name: normalizeSiteName(site?.name || ""),
        total: round2((site?.readings || []).reduce((sum, value) => sum + (Number(value ?? 0) || 0), 0)),
      }))
      .filter((site) => site.name)
      .sort((a, b) => (b.total - a.total) || a.name.localeCompare(b.name));

    return {
      daily,
      totals,
      siteNames: totals.map((site) => site.name),
    };
  }, [parsed]);
}

function useFuelDerived(parsed) {
  return useMemo(() => {
    if (!parsed || !Array.isArray(parsed.days) || !Array.isArray(parsed.sites)) {
      return null;
    }

    const daily = parsed.days.map((day, index) => {
      const totalFuel = round2(
        parsed.sites.reduce((sum, site) => sum + (Number(site?.fuel?.[index] ?? 0) || 0), 0)
      );
      return { day: `D${day}`, totalFuel };
    });

    const totals = parsed.sites
      .map((site) => ({
        name: normalizeSiteName(site?.name || ""),
        total: round2((site?.fuel || []).reduce((sum, value) => sum + (Number(value ?? 0) || 0), 0)),
      }))
      .filter((site) => site.name && site.total > 0)
      .sort((a, b) => (b.total - a.total) || a.name.localeCompare(b.name));

    const monthTotal = round2(totals.reduce((sum, site) => sum + site.total, 0));

    return {
      daily,
      totals,
      monthTotal,
      siteNames: totals.map((site) => site.name),
    };
  }, [parsed]);
}

function useSheetSummary(sheetData) {
  return useMemo(() => {
    const rows = Array.isArray(sheetData) ? sheetData : [];
    if (rows.length === 0) return null;

    const names = new Set();
    let workingDGs = 0;

    rows.forEach((row, index) => {
      const siteName = normalizeSiteName(
        row?.site ||
        row?.name ||
        row?.exchange ||
        row?.["Exchange Name"] ||
        row?.["Site Name"] ||
        row?.["Exchange location"] ||
        `site-${index}`
      );

      if (siteName) names.add(siteName);

      const statusRaw = String(
        row?.status ||
        row?.dgStatus ||
        row?.["DG Status"] ||
        row?.working ||
        ""
      ).trim().toLowerCase();

      const isWorking = statusRaw
        ? (statusRaw.includes("working") || statusRaw === "ok" || statusRaw === "yes" || statusRaw === "true" || statusRaw === "1")
        : Number(row?.dailyHours || row?.runHours || row?.["Run Hours"] || 0) > 0;

      if (isWorking) workingDGs += 1;
    });

    const totalSites = names.size || rows.length;
    const faultyDGCount = Math.max(0, totalSites - workingDGs);

    return {
      totalSites,
      workingDGs,
      faultyDGCount,
    };
  }, [sheetData]);
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
  const [pmrData, setPmrData] = useState([]);
  const [pmrLoading, setPmrLoading] = useState(true);
  const [pmrError, setPmrError] = useState("");
  const [cpData, setCpData] = useState([]);
  const [cpLoading, setCpLoading] = useState(true);
  const [cpError, setCpError] = useState("");
  const [selectedCpManager, setSelectedCpManager] = useState("All");
  const [selectedCpExecutive, setSelectedCpExecutive] = useState("All");
  const [selectedCpMonth, setSelectedCpMonth] = useState("All");
  const [selectedCpSiteType, setSelectedCpSiteType] = useState("All");
  const [selectedCpSite, setSelectedCpSite] = useState("All");
  const [expandedExecutives, setExpandedExecutives] = useState({});
  const PMR_THRESHOLD_STORAGE_KEY = "pmr-category-thresholds";
  const [categoryThresholds, setCategoryThresholds] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = window.localStorage.getItem(PMR_THRESHOLD_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedSite, setSelectedSite] = useState("");
  const [selectedUsageDate, setSelectedUsageDate] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [savedReports, setSavedReports] = useState([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");
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

  // Load PMR tracking data from the Google Sheet
  getPMRTrackingData()
    .then((data) => {
      if (!cancelled) {
        console.log("✓ Google Sheets PMR Data loaded:", data?.length || 0, "records");
        setPmrData(data);
        setPmrLoading(false);
      }
    })
    .catch((err) => {
      console.error("✗ Failed to load PMR tracking data:", err);
      if (!cancelled) {
        setPmrError(err.message || "Could not load PMR tracking data.");
        setPmrLoading(false);
      }
    });

  getCPData()
    .then((data) => {
      if (!cancelled) {
        console.log("✓ Google Sheets CP Data loaded:", data?.length || 0, "records");
        setCpData(Array.isArray(data) ? data : []);
        setCpLoading(false);
      }
    })
    .catch((err) => {
      console.error("✗ Failed to load CP data:", err);
      if (!cancelled) {
        setCpError(err.message || "Could not load CP Data.");
        setCpLoading(false);
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

  const electricityRows = useMemo(() => {
    return cpData.map((row, index) => {
      const year = String(row.Year || row.year || "").trim();
      const units = Number(row.Units ?? row.units ?? 0) || 0;
      return {
        id: `${row["Reference No."] || row.Reference || index}`,
        manager: normalizeSiteName(row.Manager || row.manager || ""),
        executive: normalizeSiteName(row.Executive || row.executive || ""),
        site: normalizeSiteName(row["Exchange location"] || row.exchangeLocation || row.Site || row.site || ""),
        month: normalizeSiteName(row.Month || row.month || ""),
        siteType: normalizeSiteName(row["Site type"] || row.siteType || row.Type || ""),
        year,
        units,
      };
    });
  }, [cpData]);

  const cpManagerOptions = useMemo(() => {
    const options = new Set(electricityRows.map((row) => row.manager).filter(Boolean));
    return ["All", ...[...options].sort((a, b) => a.localeCompare(b))];
  }, [electricityRows]);

  const cpExecutiveOptions = useMemo(() => {
    const options = new Set(electricityRows.map((row) => row.executive).filter(Boolean));
    return ["All", ...[...options].sort((a, b) => a.localeCompare(b))];
  }, [electricityRows]);

  const cpMonthOptions = useMemo(() => {
    const options = new Set(electricityRows.map((row) => row.month).filter(Boolean));
    return ["All", ...[...options].sort((a, b) => a.localeCompare(b))];
  }, [electricityRows]);

  const cpSiteTypeOptions = useMemo(() => {
    const options = new Set(electricityRows.map((row) => row.siteType).filter(Boolean));
    return ["All", ...[...options].sort((a, b) => a.localeCompare(b))];
  }, [electricityRows]);

  const cpSiteOptions = useMemo(() => {
    const rowsBeforeSiteFilter = electricityRows.filter((row) => {
      if (selectedCpManager !== "All" && row.manager !== selectedCpManager) return false;
      if (selectedCpExecutive !== "All" && row.executive !== selectedCpExecutive) return false;
      if (selectedCpMonth !== "All" && row.month !== selectedCpMonth) return false;
      if (selectedCpSiteType !== "All" && row.siteType !== selectedCpSiteType) return false;
      return true;
    });

    const options = new Set(rowsBeforeSiteFilter.map((row) => row.site).filter(Boolean));
    return ["All", ...[...options].sort((a, b) => a.localeCompare(b))];
  }, [electricityRows, selectedCpManager, selectedCpExecutive, selectedCpMonth, selectedCpSiteType]);

  useEffect(() => {
    if (!cpSiteOptions.includes(selectedCpSite)) {
      setSelectedCpSite("All");
    }
  }, [cpSiteOptions, selectedCpSite]);

  const filteredElectricityRows = useMemo(() => {
    return electricityRows.filter((row) => {
      if (selectedCpManager !== "All" && row.manager !== selectedCpManager) return false;
      if (selectedCpExecutive !== "All" && row.executive !== selectedCpExecutive) return false;
      if (selectedCpMonth !== "All" && row.month !== selectedCpMonth) return false;
      if (selectedCpSiteType !== "All" && row.siteType !== selectedCpSiteType) return false;
      if (selectedCpSite !== "All" && row.site !== selectedCpSite) return false;
      return true;
    });
  }, [electricityRows, selectedCpManager, selectedCpExecutive, selectedCpMonth, selectedCpSiteType, selectedCpSite]);

  const electricitySummary = useMemo(() => {
    const monthTotals = new Map();
    filteredElectricityRows.forEach((row) => {
      const monthKey = row.month || "Unknown";
      if (!monthTotals.has(monthKey)) {
        monthTotals.set(monthKey, { y2025: 0, y2026: 0 });
      }
      const entry = monthTotals.get(monthKey);
      if (row.year === "2025") entry.y2025 += row.units;
      if (row.year === "2026") entry.y2026 += row.units;
    });

    const units2025 = [...monthTotals.values()].reduce((sum, item) => sum + item.y2025, 0);
    const units2026 = [...monthTotals.values()].reduce((sum, item) => sum + item.y2026, 0);

    // Top-card comparison basis requested: 2025 - 2026
    // Positive delta means units decreased in 2026 (good), negative means increased (bad).
    const unitsDelta = units2025 - units2026;
    const unitsDeltaPercent = units2025 === 0 ? null : (unitsDelta / units2025) * 100;

    return {
      units2025,
      units2026,
      unitsDelta,
      unitsDeltaPercent,
    };
  }, [filteredElectricityRows]);

  const siteTypeCounts = useMemo(() => {
    const byType = new Map();
    filteredElectricityRows.forEach((row) => {
      const type = row.siteType || "Unknown";
      if (!byType.has(type)) {
        byType.set(type, new Set());
      }
      if (row.site) {
        byType.get(type).add(row.site);
      }
    });

    return [...byType.entries()]
      .map(([siteType, sites]) => ({ siteType, count: sites.size }))
      .sort((a, b) => (b.count - a.count) || a.siteType.localeCompare(b.siteType));
  }, [filteredElectricityRows]);

  const siteDeltas = useMemo(() => {
    const siteMonthMap = new Map();

    filteredElectricityRows.forEach((row) => {
      const siteKey = row.site || "Unknown Site";
      if (!siteMonthMap.has(siteKey)) {
        siteMonthMap.set(siteKey, new Map());
      }

      const monthKey = row.month || "Unknown";
      const monthMap = siteMonthMap.get(siteKey);
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { y2025: 0, y2026: 0 });
      }

      const yearBucket = monthMap.get(monthKey);
      if (row.year === "2025") yearBucket.y2025 += row.units;
      if (row.year === "2026") yearBucket.y2026 += row.units;
    });

    return [...siteMonthMap.entries()].map(([site, monthMap]) => {
      // Site-level comparison basis aligned with top cards: 2025 - 2026
      const delta = [...monthMap.values()].reduce((sum, value) => sum + (value.y2025 - value.y2026), 0);
      return { site, delta: round2(delta) };
    });
  }, [filteredElectricityRows]);

  const topIncreasedSites = useMemo(() => {
    return siteDeltas
      .filter((item) => item.delta < 0)
      .sort((a, b) => (a.delta - b.delta) || a.site.localeCompare(b.site))
      .slice(0, 10)
      .map((item) => ({ name: item.site, units: round2(item.delta) }));
  }, [siteDeltas]);

  const topDecreasedSites = useMemo(() => {
    return siteDeltas
      .filter((item) => item.delta > 0)
      .sort((a, b) => (b.delta - a.delta) || a.site.localeCompare(b.site))
      .slice(0, 10)
      .map((item) => ({ name: item.site, units: round2(item.delta) }));
  }, [siteDeltas]);

  const resetElectricityFilters = useCallback(() => {
    setSelectedCpManager("All");
    setSelectedCpExecutive("All");
    setSelectedCpMonth("All");
    setSelectedCpSiteType("All");
    setSelectedCpSite("All");
  }, []);

  const pmrSiteNames = useMemo(() => {
    const entries = pmrData
      .map((item) => ({
        name: normalizeSiteName(item.site),
        executive: normalizeSiteName(item.executive),
        category: normalizeSiteName(item.type || item.category || "Uncategorized"),
        pmDate: item.pmDate || "",
      }))
      .filter((item) => item.name);

    const groupedByExecutive = new Map();
    entries.forEach((entry) => {
      const executive = entry.executive || "Unassigned";
      if (!groupedByExecutive.has(executive)) {
        groupedByExecutive.set(executive, new Map());
      }

      const categoryMap = groupedByExecutive.get(executive);
      const category = entry.category || "Uncategorized";
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }

      const existing = categoryMap.get(category);
      if (!existing.some((item) => item.name === entry.name)) {
        existing.push(entry);
      }
    });

    return [...groupedByExecutive.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([executive, categoryMap]) => ({
        executive,
        categories: [...categoryMap.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, sites]) => ({
            category,
            sites: sites.sort((a, b) => a.name.localeCompare(b.name)),
          })),
      }));
  }, [pmrData]);

  const executiveSummaries = useMemo(() => {
    return pmrSiteNames.map((group) => {
      const counts = group.categories.reduce(
        (acc, categoryGroup) => {
          const categoryKey = normalizeSiteName(categoryGroup.category);
          const thresholdValue = Number(categoryThresholds[categoryKey] ?? 90);
          categoryGroup.sites.forEach((entry) => {
            const status = getPmDateStatus(entry.pmDate, thresholdValue);
            if (status.state === "pending") {
              acc.pending += 1;
            } else if (status.state === "overdue") {
              acc.overdue += 1;
            } else {
              acc.done += 1;
            }
          });
          return acc;
        },
        { done: 0, pending: 0, overdue: 0 }
      );

      return {
        executive: group.executive,
        ...counts,
      };
    });
  }, [pmrSiteNames, categoryThresholds]);

  const executiveCategoryStatusSummaries = useMemo(() => {
    const summaryByExecutive = new Map();

    pmrSiteNames.forEach((group) => {
      const bucketCounts = PMR_CATEGORY_BUCKETS.reduce((acc, item) => {
        acc[item.key] = { done: 0, pending: 0, overdue: 0 };
        return acc;
      }, {});

      group.categories.forEach((categoryGroup) => {
        const categoryKey = normalizeSiteName(categoryGroup.category);
        const categoryBucket = getPmrCategoryBucket(categoryGroup.category);
        const thresholdValue = Number(categoryThresholds[categoryKey] ?? 90);

        categoryGroup.sites.forEach((entry) => {
          const status = getPmDateStatus(entry.pmDate, thresholdValue);
          if (status.state === "pending") {
            bucketCounts[categoryBucket].pending += 1;
          } else if (status.state === "overdue") {
            bucketCounts[categoryBucket].overdue += 1;
          } else {
            bucketCounts[categoryBucket].done += 1;
          }
        });
      });

      summaryByExecutive.set(
        group.executive,
        PMR_CATEGORY_BUCKETS.map((item) => ({
          category: item.label,
          done: bucketCounts[item.key].done,
          pending: bucketCounts[item.key].pending,
          overdue: bucketCounts[item.key].overdue,
        }))
      );
    });

    return summaryByExecutive;
  }, [pmrSiteNames, categoryThresholds]);

  const categoryStatusSummaries = useMemo(() => {
    const categoryMap = PMR_CATEGORY_BUCKETS.reduce((acc, item) => {
      acc[item.key] = { done: 0, pending: 0, overdue: 0 };
      return acc;
    }, {});

    pmrSiteNames.forEach((group) => {
      group.categories.forEach((categoryGroup) => {
        const categoryKey = normalizeSiteName(categoryGroup.category);
        const categoryBucket = getPmrCategoryBucket(categoryGroup.category);
        const thresholdValue = Number(categoryThresholds[categoryKey] ?? 90);
        const summary = categoryMap[categoryBucket];
        categoryGroup.sites.forEach((entry) => {
          const status = getPmDateStatus(entry.pmDate, thresholdValue);
          if (status.state === "pending") {
            summary.pending += 1;
          } else if (status.state === "overdue") {
            summary.overdue += 1;
          } else {
            summary.done += 1;
          }
        });
      });
    });

    return PMR_CATEGORY_BUCKETS.map((item) => ({
      category: item.label,
      done: categoryMap[item.key].done,
      pending: categoryMap[item.key].pending,
      overdue: categoryMap[item.key].overdue,
    }));
  }, [pmrSiteNames, categoryThresholds]);

  const pmrSummary = useMemo(() => {
    return categoryStatusSummaries.reduce(
      (acc, item) => ({
        done: acc.done + item.done,
        pending: acc.pending + item.pending,
        overdue: acc.overdue + item.overdue,
      }),
      { done: 0, pending: 0, overdue: 0 }
    );
  }, [categoryStatusSummaries]);

  useEffect(() => {
    if (!pmrSiteNames.length) return;

    setCategoryThresholds((prev) => {
      const next = { ...prev };
      let changed = false;

      pmrSiteNames.forEach((group) => {
        group.categories.forEach((categoryGroup) => {
          const categoryKey = normalizeSiteName(categoryGroup.category);
          if (!(categoryKey in next)) {
            next[categoryKey] = 90;
            changed = true;
          }
        });
      });

      return changed ? next : prev;
    });
  }, [pmrSiteNames]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PMR_THRESHOLD_STORAGE_KEY, JSON.stringify(categoryThresholds));
    } catch {
      // Ignore storage errors
    }
  }, [categoryThresholds]);

  const getThresholdValue = useCallback((category) => {
    const categoryKey = normalizeSiteName(category);
    return Number(categoryThresholds[categoryKey] ?? 90);
  }, [categoryThresholds]);

  const updateThresholdValue = useCallback((category, value) => {
    const categoryKey = normalizeSiteName(category);
    const parsedValue = Number.isNaN(Number(value)) ? 90 : Math.min(90, Math.max(0, Number(value)));
    setCategoryThresholds((prev) => ({ ...prev, [categoryKey]: parsedValue }));
  }, []);

  const thresholdCategories = useMemo(() => {
    const categoryMap = new Map();
    pmrSiteNames.forEach((group) => {
      group.categories.forEach((categoryGroup) => {
        const categoryLabel = categoryGroup.category;
        const categoryKey = normalizeSiteName(categoryLabel);
        if (!categoryMap.has(categoryKey)) {
          categoryMap.set(categoryKey, {
            category: categoryLabel,
            value: Number(categoryThresholds[categoryKey] ?? 90),
          });
        }
      });
    });

    return [...categoryMap.values()].sort((a, b) => a.category.localeCompare(b.category));
  }, [pmrSiteNames, categoryThresholds]);

  const toggleExecutive = useCallback((executive) => {
    setExpandedExecutives((prev) => ({
      ...prev,
      [executive]: !prev[executive],
    }));
  }, []);

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
    fuel: { title: "DG Usage and Fuel Balance", desc: "Daily run hours, estimated fuel consumed, and current fuel balance", icon: Fuel },
    pmr: { title: "PMR Tracking", desc: "Live site names from the PMR Tracking Google Sheet", icon: ClipboardList },
    repair: { title: "DG Repair History", desc: "Log and track generator repairs, spares used, and status", icon: Wrench },
    sheets: { title: "Google Sheets", desc: "Open the live workbook directly", icon: Link2 },
    electricity: { title: "Electricity Performance", desc: "", icon: Activity },
    fuelperf: { title: "Fuel Performance", desc: "Coming soon", icon: Fuel },
    contact: { title: "Contact", desc: "Coming soon", icon: ClipboardList },
  }[section] || {
    title: "Dashboard",
    desc: "",
    icon: LayoutDashboard,
  };
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
                  <BarChart data={selectedUsageData} layout="vertical" barCategoryGap={8} margin={{ top: 8, right: 56, left: 10, bottom: 0 }}>
                    <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={280} interval={0} tick={{ fill: COLORS.text, fontSize: 10.5, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
                    <Legend verticalAlign="top" align="left" iconType="circle" wrapperStyle={{ paddingBottom: 8, fontSize: 12, fontFamily: "'IBM Plex Sans', sans-serif" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="hours" name="Run hours" fill={COLORS.red} radius={[0, 4, 4, 0]} isAnimationActive={false} barSize={24}>
                      <LabelList dataKey="hours" position="right" formatter={(value) => `${value}h`} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                    </Bar>
                    <Bar dataKey="perHourFuelConsumption" name="Fuel consumption" fill={COLORS.amber} radius={[0, 4, 4, 0]} isAnimationActive={false} barSize={24}>
                      <LabelList dataKey="perHourFuelConsumption" position="right" formatter={(value) => `${value}L`} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                    </Bar>
                    <Bar dataKey="fuelConsumed" name="Fuel consumed" fill={COLORS.blue} radius={[0, 4, 4, 0]} isAnimationActive={false} barSize={24}>
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
 
        {section === "pmr" && (
          <Card
            title="PMR tracking sites"
            desc="PMR sites grouped by executive and category"
            style={{ marginBottom: 0, background: "linear-gradient(135deg, #f9fbff 0%, #f3f7ff 100%)" }}
          >
            {pmrLoading ? (
              <div style={{ padding: "34px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
                Loading PMR tracking data from Google Sheets...
              </div>
            ) : pmrError ? (
              <div style={{ padding: "34px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
                {pmrError}
              </div>
            ) : pmrSiteNames.length > 0 ? (
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ border: `1px solid ${COLORS.panelEdge}`, borderRadius: 14, background: "#ffffff", boxShadow: "0 6px 18px rgba(16,36,62,0.05)", padding: 12, display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.navy, textTransform: "uppercase", letterSpacing: 0.5, padding: "2px 2px 0" }}>
                      Bahawalpur Rural
                    </div>
                    <div style={{ padding: "7px 8px", borderRadius: 10, background: "#fcfdff", border: `1px solid ${COLORS.panelEdge}`, display: "grid", gap: 6, minWidth: 240 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 800, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 0.4 }}>
                        Thresholds (Days)
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {thresholdCategories.map((item) => (
                          <label key={`threshold-${item.category}`} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: COLORS.textDim, padding: "4px 6px", borderRadius: 8, border: `1px solid ${COLORS.panelEdge}`, background: "#ffffff" }}>
                            <span style={{ fontWeight: 700, color: COLORS.navy }}>{item.category}</span>
                            <input
                              type="number"
                              min="0"
                              max="90"
                              step="1"
                              value={item.value}
                              onChange={(event) => updateThresholdValue(item.category, event.target.value)}
                              style={{ width: 44, border: `1px solid ${COLORS.panelEdge}`, borderRadius: 6, padding: "3px 5px", fontSize: 10.5, color: COLORS.text, background: "#ffffff" }}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
                    {[
                      { key: "done", label: "Done", total: pmrSummary.done, titleColor: "#0f5132", cardBg: "#f3fbf6", edge: "#bee7cd", cellBg: "#e8f7ee" },
                      { key: "pending", label: "Pending", total: pmrSummary.pending, titleColor: "#8a1c3a", cardBg: "#fff5f8", edge: "#f0bfd0", cellBg: "#ffeaf0" },
                      { key: "overdue", label: "Overdue", total: pmrSummary.overdue, titleColor: "#7a3e00", cardBg: "#fff8ef", edge: "#f0d1a8", cellBg: "#fff0db" },
                      { key: "totalSites", label: "Total Sites", total: pmrSummary.done + pmrSummary.pending + pmrSummary.overdue, titleColor: "#143f75", cardBg: "#f2f7ff", edge: "#b9d3f4", cellBg: "#e8f1ff" },
                    ].map((statusCard) => (
                      <div
                        key={statusCard.key}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          background: statusCard.cardBg,
                          border: `1px solid ${statusCard.edge}`,
                          boxShadow: "0 4px 12px rgba(16,36,62,0.05)",
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: statusCard.titleColor, textTransform: "uppercase", letterSpacing: 0.4 }}>
                            {statusCard.label}
                          </div>
                          <div style={{ fontSize: 22, fontWeight: 900, color: statusCard.titleColor, lineHeight: 1 }}>
                            {statusCard.total}
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
                          {categoryStatusSummaries.map((item) => (
                            <div
                              key={`${statusCard.key}-${item.category}`}
                              style={{
                                background: statusCard.cellBg,
                                border: `1px solid ${statusCard.edge}`,
                                borderRadius: 8,
                                padding: "6px 7px",
                                display: "grid",
                                gap: 3,
                              }}
                            >
                              <div style={{ fontSize: 9.5, fontWeight: 700, color: statusCard.titleColor, textTransform: "uppercase", letterSpacing: 0.2 }}>
                                {item.category}
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 900, color: statusCard.titleColor, lineHeight: 1 }}>
                                {statusCard.key === "totalSites"
                                  ? item.done + item.pending + item.overdue
                                  : item[statusCard.key]}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {pmrSiteNames.map((group) => {
                  const isExpanded = expandedExecutives[group.executive] !== false;
                  const executiveSummary = executiveSummaries.find((item) => item.executive === group.executive) || { done: 0, pending: 0, overdue: 0 };
                  const executiveCategorySummaries = executiveCategoryStatusSummaries.get(group.executive) || PMR_CATEGORY_BUCKETS.map((item) => ({ category: item.label, done: 0, pending: 0, overdue: 0 }));
                  return (
                    <div key={group.executive} style={{ display: "grid", gap: 10 }}>
                      <div style={{ border: `1px solid ${COLORS.panelEdge}`, borderRadius: 12, background: "#ffffff", boxShadow: "0 6px 18px rgba(16,36,62,0.06)", padding: 10, display: "grid", gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => toggleExecutive(group.executive)}
                          style={{
                            padding: "4px 4px 2px",
                            borderRadius: 8,
                            background: "transparent",
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: COLORS.navy }}>
                              {group.executive}
                            </div>
                          </div>
                          <div style={{ fontSize: 16, color: COLORS.navy, fontWeight: 700 }}>
                            {isExpanded ? "▾" : "▸"}
                          </div>
                        </button>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
                          {[
                            { key: "done", label: "Done", total: executiveSummary.done, titleColor: "#0f5132", cardBg: "#f3fbf6", edge: "#bee7cd", cellBg: "#e8f7ee" },
                            { key: "pending", label: "Pending", total: executiveSummary.pending, titleColor: "#8a1c3a", cardBg: "#fff5f8", edge: "#f0bfd0", cellBg: "#ffeaf0" },
                            { key: "overdue", label: "Overdue", total: executiveSummary.overdue, titleColor: "#7a3e00", cardBg: "#fff8ef", edge: "#f0d1a8", cellBg: "#fff0db" },
                            { key: "totalSites", label: "Total Sites", total: executiveSummary.done + executiveSummary.pending + executiveSummary.overdue, titleColor: "#143f75", cardBg: "#f2f7ff", edge: "#b9d3f4", cellBg: "#e8f1ff" },
                          ].map((statusCard) => (
                            <div
                              key={`${group.executive}-${statusCard.key}`}
                              style={{
                                padding: "10px 12px",
                                borderRadius: 12,
                                background: statusCard.cardBg,
                                border: `1px solid ${statusCard.edge}`,
                                boxShadow: "0 4px 12px rgba(16,36,62,0.05)",
                                display: "grid",
                                gap: 8,
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: statusCard.titleColor, textTransform: "uppercase", letterSpacing: 0.4 }}>
                                  {statusCard.label}
                                </div>
                                <div style={{ fontSize: 22, fontWeight: 900, color: statusCard.titleColor, lineHeight: 1 }}>
                                  {statusCard.total}
                                </div>
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
                                {executiveCategorySummaries.map((item) => (
                                  <div
                                    key={`${group.executive}-${statusCard.key}-${item.category}`}
                                    style={{
                                      background: statusCard.cellBg,
                                      border: `1px solid ${statusCard.edge}`,
                                      borderRadius: 8,
                                      padding: "6px 7px",
                                      display: "grid",
                                      gap: 3,
                                    }}
                                  >
                                    <div style={{ fontSize: 9.5, fontWeight: 700, color: statusCard.titleColor, textTransform: "uppercase", letterSpacing: 0.2 }}>
                                      {item.category}
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 900, color: statusCard.titleColor, lineHeight: 1 }}>
                                      {statusCard.key === "totalSites"
                                        ? item.done + item.pending + item.overdue
                                        : item[statusCard.key]}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {isExpanded && (
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          {group.categories.map((categoryGroup) => {
                        const thresholdValue = getThresholdValue(categoryGroup.category);
                        const pendingCount = categoryGroup.sites.filter((entry) => !entry.pmDate).length;
                        const overdueCount = categoryGroup.sites.filter((entry) => {
                          const status = getPmDateStatus(entry.pmDate, thresholdValue);
                          return status.state === "overdue" || status.state === "pending";
                        }).length;
                        return (
                          <div key={categoryGroup.category} style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 250, flex: 1, padding: "12px", borderRadius: 14, background: "#ffffff", border: `1px solid ${COLORS.panelEdge}`, boxShadow: "0 4px 14px rgba(16,36,62,0.05)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 800, color: COLORS.navy, textTransform: "uppercase", letterSpacing: 0.4 }}>
                                {categoryGroup.category} ({categoryGroup.sites.length})
                              </div>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "6px 0 2px", borderBottom: `1px solid ${COLORS.panelEdge}` }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#b23a5a" }}>Pending: {pendingCount}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.navy }}>Overdue: {overdueCount}</span>
                            </div>
                            <div style={{ display: "grid", gap: 8, marginTop: 2 }}>
                              {categoryGroup.sites.map((entry) => {
                                const statusStyle = getPmDateStatus(entry.pmDate, thresholdValue);
                                return (
                                  <div
                                    key={entry.name}
                                    style={{
                                      padding: "10px 12px",
                                      borderRadius: 10,
                                      border: `1px solid ${COLORS.panelEdge}`,
                                      background: statusStyle.bg,
                                      color: COLORS.text,
                                      fontWeight: 700,
                                      display: "flex",
                                      justifyContent: "space-between",
                                      gap: 10,
                                      alignItems: "center",
                                      boxShadow: "0 2px 8px rgba(16,36,62,0.03)",
                                    }}
                                  >
                                    <span style={{ fontSize: 13 }}>{entry.name}</span>
                                    <span style={{ color: COLORS.textDim, fontSize: 11.5, fontWeight: 600 }}>
                                      {formatPmDate(entry.pmDate)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: "34px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
                No PMR site names were returned from the Google Sheet.
              </div>
            )}
          </Card>
        )}

        {section === "electricity" && (
          <>
            <div className="electricity-layout">
              <div>
                <div className="electricity-topbar">
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {selectedCpSite !== "All" && (
                      <div style={{ border: `1px solid ${COLORS.panelEdge}`, borderRadius: 999, background: "rgba(255,255,255,0.88)", padding: "6px 10px", fontSize: 11.5, color: COLORS.blue, fontWeight: 700, boxShadow: COLORS.shadowSoft }}>
                        Site: {selectedCpSite}
                      </div>
                    )}
                  </div>
                </div>

                <div className="electricity-shell" style={{ marginTop: 8 }}>
                  <div style={{ display: "grid", gap: 10, minWidth: 0, marginTop: -2 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
                      <StatCard icon={Activity} label="Units 2025" value={Math.round(electricitySummary.units2025).toLocaleString("en-US")} tone="navy" compact />
                      <StatCard icon={Gauge} label="Units 2026" value={Math.round(electricitySummary.units2026).toLocaleString("en-US")} tone="blue" compact />
                      <StatCard
                        icon={electricitySummary.unitsDelta >= 0 ? ArrowDownRight : ArrowUpRight}
                        label="Inc/Dec Units"
                        value={`${electricitySummary.unitsDelta >= 0 ? "↓" : "↑"} ${Math.round(electricitySummary.unitsDelta).toLocaleString("en-US")}`}
                        sub={electricitySummary.unitsDelta >= 0 ? "Decrease (Good)" : "Increase (Bad)"}
                        tone={electricitySummary.unitsDelta >= 0 ? "green" : "red"}
                        valueColor={electricitySummary.unitsDelta >= 0 ? COLORS.green : COLORS.red}
                        compact
                      />
                      <StatCard
                        icon={electricitySummary.unitsDeltaPercent === null ? Activity : electricitySummary.unitsDeltaPercent >= 0 ? ArrowDownRight : ArrowUpRight}
                        label="Inc/Dec %"
                        value={electricitySummary.unitsDeltaPercent === null
                          ? "—"
                          : `${electricitySummary.unitsDeltaPercent >= 0 ? "↓" : "↑"} ${round2(electricitySummary.unitsDeltaPercent).toFixed(2)}%`}
                        sub={electricitySummary.unitsDeltaPercent === null ? "No 2025 baseline" : electricitySummary.unitsDeltaPercent >= 0 ? "Decrease (Good)" : "Increase (Bad)"}
                        tone={electricitySummary.unitsDeltaPercent === null
                          ? "navy"
                          : electricitySummary.unitsDeltaPercent >= 0
                            ? "green"
                            : "red"}
                        valueColor={electricitySummary.unitsDeltaPercent === null
                          ? COLORS.text
                          : electricitySummary.unitsDeltaPercent >= 0
                            ? COLORS.green
                            : COLORS.red}
                        compact
                      />
                    </div>
                  </div>

                  <aside className="electricity-panel" style={{ border: `1px solid ${COLORS.panelEdge}`, borderRadius: 14, background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(245,249,255,0.96) 100%)", padding: 8, boxShadow: "0 6px 14px rgba(16,36,62,0.05)", display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", whiteSpace: "nowrap", scrollbarWidth: "thin" }}>
                          {siteTypeCounts.length > 0 ? siteTypeCounts.map((item) => (
                            <div key={`site-type-inline-${item.siteType}`} style={{ border: `1px solid ${COLORS.panelEdge}`, borderRadius: 999, padding: "2px 8px", background: COLORS.panelSoft, display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <span style={{ fontSize: 10.5, fontWeight: 800, color: COLORS.navy }}>{item.siteType}</span>
                              <span style={{ fontSize: 10.5, fontWeight: 900, color: COLORS.blue, fontFamily: "IBM Plex Mono" }}>{item.count}</span>
                            </div>
                          )) : (
                            <span style={{ fontSize: 10.5, color: COLORS.textDim }}>No site types</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11.5, fontWeight: 900, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 0.45, whiteSpace: "nowrap" }}>
                          Filters
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={resetElectricityFilters}
                        title="Reset all filters"
                        aria-label="Reset all filters"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          border: `1px solid ${COLORS.blueSoft}`,
                          background: "linear-gradient(180deg, #eff5ff 0%, #e2ecfb 100%)",
                          color: COLORS.navy,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          boxShadow: COLORS.shadowSoft,
                          padding: 0,
                        }}
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 140px))", justifyContent: "start", gap: 6 }}>
                      {[
                        { label: "Manager", value: selectedCpManager, onChange: setSelectedCpManager, options: cpManagerOptions },
                        { label: "Executive", value: selectedCpExecutive, onChange: setSelectedCpExecutive, options: cpExecutiveOptions },
                        { label: "Month", value: selectedCpMonth, onChange: setSelectedCpMonth, options: cpMonthOptions },
                        { label: "Site Type", value: selectedCpSiteType, onChange: setSelectedCpSiteType, options: cpSiteTypeOptions },
                        { label: "Site", value: selectedCpSite, onChange: setSelectedCpSite, options: cpSiteOptions },
                      ].map((filter) => (
                        <label key={filter.label} style={{ display: "grid", gap: 3, fontSize: 10.5, color: COLORS.textDim }}>
                          <span style={{ fontWeight: 700, color: COLORS.navy, lineHeight: 1 }}>{filter.label}</span>
                          <select
                            value={filter.value}
                            onChange={(event) => filter.onChange(event.target.value)}
                            style={{ border: `1px solid ${COLORS.panelEdge}`, borderRadius: 8, padding: "1px 8px", minHeight: 24, fontSize: 11.5, color: COLORS.text, background: "#ffffff", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)" }}
                          >
                            {filter.options.map((option) => (
                              <option key={`${filter.label.toLowerCase()}-${option}`} value={option}>{option}</option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>

                  </aside>
                </div>
              </div>

              <div className="electricity-chart-grid">
                <Card title="Top 10 Sites - Increased Units (Bad)" desc="Month-paired comparison (2025 - 2026): negatives show increases">
                  {topIncreasedSites.length > 0 ? (
                    <ResponsiveContainer width="100%" height={Math.max(260, topIncreasedSites.length * 26)}>
                      <BarChart data={topIncreasedSites} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                        <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
                        <YAxis type="category" dataKey="name" width={180} tick={{ fill: COLORS.text, fontSize: 10.5, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
                        <ReferenceLine x={0} stroke={COLORS.panelEdge} />
                        <Tooltip content={<CustomTooltip unit="units" />} />
                        <Bar dataKey="units" name="Increase (Bad)" fill={COLORS.red} radius={[0, 4, 4, 0]}>
                          <LabelList dataKey="units" position="right" formatter={(value) => `${value}`} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ padding: "24px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
                      No site increases found for current filters.
                    </div>
                  )}
                </Card>

                <Card title="Top 10 Sites - Decreased Units (Good)" desc="Month-paired comparison (2025 - 2026): positives show decreases">
                  {topDecreasedSites.length > 0 ? (
                    <ResponsiveContainer width="100%" height={Math.max(260, topDecreasedSites.length * 26)}>
                      <BarChart data={topDecreasedSites} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                        <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
                        <YAxis type="category" dataKey="name" width={180} tick={{ fill: COLORS.text, fontSize: 10.5, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
                        <ReferenceLine x={0} stroke={COLORS.panelEdge} />
                        <Tooltip content={<CustomTooltip unit="units" />} />
                        <Bar dataKey="units" name="Decrease (Good)" fill={COLORS.green} radius={[0, 4, 4, 0]}>
                          <LabelList dataKey="units" position="right" formatter={(value) => `${value}`} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ padding: "24px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
                      No site decreases found for current filters.
                    </div>
                  )}
                </Card>
              </div>

            </div>
          </>
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
        </div>
      </main>
    </div>
  );
}
