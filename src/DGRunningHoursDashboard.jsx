import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import { parseWorkbook } from "./services/excelParser";
import {
  Gauge, Fuel,
  Wrench, Activity, LayoutDashboard, ClipboardList, Link2
} from "lucide-react";
 import Sidebar from "./components/Sidebar";
 import StatCard from "./components/StatCard";
import { getDailyMeterReadings, getSummaryData, getFuelBalanceData, getPMRTrackingData, getCPData, getFuelPerformanceData, getRepairHistoryData, appendRepairHistoryEntry, updateRepairHistoryEntry, getMSAGMonthlyData } from "./api/googleSheets";

 import Card from "./components/Card";
import { COLORS } from "./styles/colors";
 import CustomTooltip from "./components/CustomTooltip";
import SiteSelect from "./components/SiteSelect";
import NoReportState from "./components/NoReportState";
import RepairHistorySection from "./components/RepairHistorySection";
import SummarySection from "./components/SummarySection";
import UsageSection from "./components/UsageSection";
import PortableSection from "./components/PortableSection";
import PmrSection from "./components/PmrSection";
import ElectricitySection from "./components/ElectricitySection";
import FuelPerformanceSection from "./components/FuelPerformanceSection";
import {
  toLocalDateKey,
  normalizeSiteName,
  PMR_CATEGORY_BUCKETS,
  getPmrCategoryBucket,
  siteMatchKey,
  round2,
  getDayOfMonth,
  parsePortableDate,
  getPortableSiteLabel,
  getPmDateStatus,
  findSiteConsumption,
} from "./utils/dashboardUtils";
import {
  useFuelBalanceDerived,
  useDerived,
  useFuelDerived,
  useSheetSummary,
} from "./hooks/useDashboardDerived";
import {
  storage,
  loadIndex,
  saveReport,
  deleteReport,
  reportKey
} from "./services/storage";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');`;

// --- Persistence (works inside claude.ai AND on a deployed Netlify site) --
 
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
  const [msagMonthlyData, setMsagMonthlyData] = useState([]);
  const [msagLoading, setMsagLoading] = useState(true);
  const [msagError, setMsagError] = useState("");
  const [selectedCpManager, setSelectedCpManager] = useState("All");
  const [selectedCpExecutive, setSelectedCpExecutive] = useState("All");
  const [selectedCpMonth, setSelectedCpMonth] = useState("All");
  const [selectedCpSiteType, setSelectedCpSiteType] = useState("All");
  const [selectedCpSite, setSelectedCpSite] = useState("All");
  const [fuelPerfData, setFuelPerfData] = useState([]);
  const [fuelPerfLoading, setFuelPerfLoading] = useState(true);
  const [fuelPerfError, setFuelPerfError] = useState("");
  const [selectedFuelManager, setSelectedFuelManager] = useState("All");
  const [selectedFuelExecutive, setSelectedFuelExecutive] = useState("All");
  const [selectedFuelMonth, setSelectedFuelMonth] = useState("All");
  const [selectedFuelSiteType, setSelectedFuelSiteType] = useState("All");
  const [selectedFuelSite, setSelectedFuelSite] = useState("All");
  const [expandedExecutives, setExpandedExecutives] = useState({});
  const LOW_FUEL_THRESHOLD_STORAGE_KEY = "fuel-balance-low-alarm-threshold";
  const [lowFuelThreshold, setLowFuelThreshold] = useState(() => {
    if (typeof window === "undefined") return 200;
    try {
      const saved = window.localStorage.getItem(LOW_FUEL_THRESHOLD_STORAGE_KEY);
      const parsed = Number(saved);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 200;
    } catch {
      return 200;
    }
  });
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

  getRepairHistoryData().then((list) => {
    if (!cancelled) {
      setRepairs(list);
      setRepairsLoading(false);
    }
  }).catch(() => {
    if (!cancelled) {
      setRepairs([]);
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

  getFuelPerformanceData()
    .then((data) => {
      if (!cancelled) {
        console.log("✓ Google Sheets Fuel Performance Data loaded:", data?.length || 0, "records");
        setFuelPerfData(Array.isArray(data) ? data : []);
        setFuelPerfLoading(false);
      }
    })
    .catch((err) => {
      console.error("✗ Failed to load fuel performance data:", err);
      if (!cancelled) {
        setFuelPerfError(err.message || "Could not load Fuel Data.");
        setFuelPerfLoading(false);
      }
    });

  getMSAGMonthlyData()
    .then((data) => {
      if (!cancelled) {
        console.log("✓ MSAG Monthly data loaded:", data?.length || 0, "records");
        setMsagMonthlyData(Array.isArray(data) ? data : []);
        setMsagLoading(false);
      }
    })
    .catch((err) => {
      console.error("✗ Failed to load MSAG Monthly data:", err);
      if (!cancelled) {
        setMsagError(err.message || "Could not load MSAG Monthly data.");
        setMsagLoading(false);
      }
    });

  return () => {
    cancelled = true;
  };
}, []);
 
  const derived = useDerived(parsed);
  const fuelDerived = useFuelDerived(parsed);
  const fuelBalanceDerived = useFuelBalanceDerived(fuelBalanceData, meterData);
 const sheetSummary = useSheetSummary(sheetData);
 const meterDerived = useMemo(() => {
  if (!meterData || meterData.length === 0) {
    return null;
  }

  const datedMeterData = meterData
    .map((item) => ({ ...item, parsedDate: item.date ? new Date(item.date) : null }))
    .filter((item) => item.parsedDate && !Number.isNaN(item.parsedDate.getTime()));

  const latestDate = datedMeterData.reduce((latest, item) => {
    return !latest || item.parsedDate > latest ? item.parsedDate : latest;
  }, null);

  const latestDateStr = latestDate ? latestDate.toISOString().split("T")[0] : "";
  const latestMonthYear = latestDate ? latestDate.getFullYear() : null;
  const latestMonthIndex = latestDate ? latestDate.getMonth() : null;
  
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
    .filter(item => item.parsedDate.getFullYear() === latestMonthYear && item.parsedDate.getMonth() === latestMonthIndex)
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
        .sort((a, b) => (b.fuelConsumed - a.fuelConsumed) || (b.hours - a.hours) || a.name.localeCompare(b.name));
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

  const fuelPerformanceRows = useMemo(() => {
    return fuelPerfData.map((row, index) => {
      const year = String(row.Year || row.year || "").trim();
      const fuel = Number(
        row.Fuel ??
        row.fuel ??
        row["POL Consumed"] ??
        row["POL consumed"] ??
        row.POL_Consumed ??
        row["Fuel Used"] ??
        row["Fuel Consumed"] ??
        row["Fuel Filled"] ??
        row["POL Filled"] ??
        row["Fuel (L)"] ??
        row["Fuel Liters"] ??
        row["Fuel Litres"] ??
        row.Liters ??
        row.Litres ??
        0
      ) || 0;

      return {
        id: `${row["Reference No."] || row.Reference || index}`,
        manager: normalizeSiteName(row.Manager || row.manager || row["Senior Manager"] || ""),
        executive: normalizeSiteName(row.Executive || row.executive || row.AM || row["Area Manager"] || ""),
        site: normalizeSiteName(row["DG Set Name"] || row["DG set name"] || row["Exchange location"] || row.exchangeLocation || row.Site || row.site || ""),
        month: normalizeSiteName(row.Month || row.month || ""),
        siteType: normalizeSiteName(row["DG set Status Working/Faulty"] || row["Site type"] || row.siteType || row.Type || ""),
        year,
        fuel,
      };
    });
  }, [fuelPerfData]);

  const fuelManagerOptions = useMemo(() => {
    const options = new Set(fuelPerformanceRows.map((row) => row.manager).filter(Boolean));
    return ["All", ...[...options].sort((a, b) => a.localeCompare(b))];
  }, [fuelPerformanceRows]);

  const fuelExecutiveOptions = useMemo(() => {
    const options = new Set(fuelPerformanceRows.map((row) => row.executive).filter(Boolean));
    return ["All", ...[...options].sort((a, b) => a.localeCompare(b))];
  }, [fuelPerformanceRows]);

  const fuelMonthOptions = useMemo(() => {
    const options = new Set(fuelPerformanceRows.map((row) => row.month).filter(Boolean));
    return ["All", ...[...options].sort((a, b) => a.localeCompare(b))];
  }, [fuelPerformanceRows]);

  const fuelSiteTypeOptions = useMemo(() => {
    const options = new Set(fuelPerformanceRows.map((row) => row.siteType).filter(Boolean));
    return ["All", ...[...options].sort((a, b) => a.localeCompare(b))];
  }, [fuelPerformanceRows]);

  const fuelSiteOptions = useMemo(() => {
    const rowsBeforeSiteFilter = fuelPerformanceRows.filter((row) => {
      if (selectedFuelManager !== "All" && row.manager !== selectedFuelManager) return false;
      if (selectedFuelExecutive !== "All" && row.executive !== selectedFuelExecutive) return false;
      if (selectedFuelMonth !== "All" && row.month !== selectedFuelMonth) return false;
      if (selectedFuelSiteType !== "All" && row.siteType !== selectedFuelSiteType) return false;
      return true;
    });

    const options = new Set(rowsBeforeSiteFilter.map((row) => row.site).filter(Boolean));
    return ["All", ...[...options].sort((a, b) => a.localeCompare(b))];
  }, [fuelPerformanceRows, selectedFuelManager, selectedFuelExecutive, selectedFuelMonth, selectedFuelSiteType]);

  useEffect(() => {
    if (!fuelSiteOptions.includes(selectedFuelSite)) {
      setSelectedFuelSite("All");
    }
  }, [fuelSiteOptions, selectedFuelSite]);

  const filteredFuelRows = useMemo(() => {
    return fuelPerformanceRows.filter((row) => {
      if (selectedFuelManager !== "All" && row.manager !== selectedFuelManager) return false;
      if (selectedFuelExecutive !== "All" && row.executive !== selectedFuelExecutive) return false;
      if (selectedFuelMonth !== "All" && row.month !== selectedFuelMonth) return false;
      if (selectedFuelSiteType !== "All" && row.siteType !== selectedFuelSiteType) return false;
      if (selectedFuelSite !== "All" && row.site !== selectedFuelSite) return false;
      return true;
    });
  }, [fuelPerformanceRows, selectedFuelManager, selectedFuelExecutive, selectedFuelMonth, selectedFuelSiteType, selectedFuelSite]);

  const fuelSummary = useMemo(() => {
    const monthTotals = new Map();
    filteredFuelRows.forEach((row) => {
      const monthKey = row.month || "Unknown";
      if (!monthTotals.has(monthKey)) {
        monthTotals.set(monthKey, { y2025: 0, y2026: 0 });
      }
      const entry = monthTotals.get(monthKey);
      if (row.year === "2025") entry.y2025 += row.fuel;
      if (row.year === "2026") entry.y2026 += row.fuel;
    });

    const fuel2025 = [...monthTotals.values()].reduce((sum, item) => sum + item.y2025, 0);
    const fuel2026 = [...monthTotals.values()].reduce((sum, item) => sum + item.y2026, 0);

    // Keep the same basis as Electricity: 2025 - 2026
    const fuelDelta = fuel2025 - fuel2026;
    const fuelDeltaPercent = fuel2025 === 0 ? null : (fuelDelta / fuel2025) * 100;

    return {
      fuel2025,
      fuel2026,
      fuelDelta,
      fuelDeltaPercent,
    };
  }, [filteredFuelRows]);

  const fuelSiteTypeCounts = useMemo(() => {
    const byType = new Map();
    filteredFuelRows.forEach((row) => {
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
  }, [filteredFuelRows]);

  const fuelSiteDeltas = useMemo(() => {
    const siteMonthMap = new Map();

    filteredFuelRows.forEach((row) => {
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
      if (row.year === "2025") yearBucket.y2025 += row.fuel;
      if (row.year === "2026") yearBucket.y2026 += row.fuel;
    });

    return [...siteMonthMap.entries()].map(([site, monthMap]) => {
      const delta = [...monthMap.values()].reduce((sum, value) => sum + (value.y2025 - value.y2026), 0);
      return { site, delta: round2(delta) };
    });
  }, [filteredFuelRows]);

  const topIncreasedFuelSites = useMemo(() => {
    return fuelSiteDeltas
      .filter((item) => item.delta < 0)
      .sort((a, b) => (a.delta - b.delta) || a.site.localeCompare(b.site))
      .slice(0, 10)
      .map((item) => ({ name: item.site, fuel: round2(item.delta) }));
  }, [fuelSiteDeltas]);

  const topDecreasedFuelSites = useMemo(() => {
    return fuelSiteDeltas
      .filter((item) => item.delta > 0)
      .sort((a, b) => (b.delta - a.delta) || a.site.localeCompare(b.site))
      .slice(0, 10)
      .map((item) => ({ name: item.site, fuel: round2(item.delta) }));
  }, [fuelSiteDeltas]);

  const resetFuelFilters = useCallback(() => {
    setSelectedFuelManager("All");
    setSelectedFuelExecutive("All");
    setSelectedFuelMonth("All");
    setSelectedFuelSiteType("All");
    setSelectedFuelSite("All");
  }, []);

  const portableByMSAG = useMemo(() => {
    const grouped = new Map();
    (Array.isArray(msagMonthlyData) ? msagMonthlyData : []).forEach((row) => {
      const key = normalizeSiteName(row.msagRaw || row.msagName || "");
      if (!key) return;
      if (!grouped.has(key)) {
        grouped.set(key, { name: key, usageHours: 0, fuelConsumption: 0 });
      }
      const item = grouped.get(key);
      item.usageHours += Number(row.usageHours || 0);
      item.fuelConsumption += Number(row.fuelConsumption || 0);
    });

    return [...grouped.values()]
      .map((item) => ({
        ...item,
        usageHours: round2(item.usageHours),
        fuelConsumption: round2(item.fuelConsumption),
      }))
      .sort((a, b) => (b.usageHours - a.usageHours) || (b.fuelConsumption - a.fuelConsumption) || a.name.localeCompare(b.name));
  }, [msagMonthlyData]);

  const portableByGenerator = useMemo(() => {
    const grouped = new Map();
    (Array.isArray(msagMonthlyData) ? msagMonthlyData : []).forEach((row) => {
      const key = String(row.generator || "Unknown").trim() || "Unknown";
      if (!grouped.has(key)) {
        grouped.set(key, { name: key, usageHours: 0, fuelConsumption: 0 });
      }
      const item = grouped.get(key);
      item.usageHours += Number(row.usageHours || 0);
      item.fuelConsumption += Number(row.fuelConsumption || 0);
    });

    return [...grouped.values()]
      .map((item) => ({
        ...item,
        usageHours: round2(item.usageHours),
        fuelConsumption: round2(item.fuelConsumption),
      }))
      .sort((a, b) => (b.usageHours - a.usageHours) || (b.fuelConsumption - a.fuelConsumption) || a.name.localeCompare(b.name));
  }, [msagMonthlyData]);

  const portableGeneratorKeys = useMemo(() => {
    return portableByGenerator.map((item) => item.name);
  }, [portableByGenerator]);

  const portableTimelineRows = useMemo(() => {
    const bySiteGenerator = new Map();
    (Array.isArray(msagMonthlyData) ? msagMonthlyData : []).forEach((row) => {
      const site = normalizeSiteName(row.msagRaw || row.msagName || "");
      const generator = String(row.generator || "Unknown").trim() || "Unknown";
      const generatorNumber = Number(row.generatorNumber || 0);
      const day = getDayOfMonth(row.operationDate);
      const usageHours = Number(row.usageHours || 0);
      const fuelConsumption = Number(row.fuelConsumption || 0);

      if (!site) return;
      if (day < 1 || day > 31) return;

      const key = `${site}__${generator}`;
      if (!bySiteGenerator.has(key)) {
        bySiteGenerator.set(key, {
          site,
          generator,
          generatorNumber,
          label: getPortableSiteLabel(site, generatorNumber),
          totalUsage: 0,
          pointsByDay: new Map(),
        });
      }

      const item = bySiteGenerator.get(key);
      const existing = item.pointsByDay.get(day) || { day, usageHours: 0, fuelConsumption: 0 };
      existing.usageHours = round2(existing.usageHours + usageHours);
      existing.fuelConsumption = round2(existing.fuelConsumption + fuelConsumption);
      item.pointsByDay.set(day, existing);
      item.totalUsage = round2(item.totalUsage + usageHours);
    });

    return [...bySiteGenerator.values()]
      .map((row) => ({
        ...row,
        points: [...row.pointsByDay.values()]
          .sort((a, b) => a.day - b.day)
          .map((point) => ({
            ...point,
            // Keep markers compact but show longer runs with wider blocks.
            widthPx: Math.max(4, Math.min(14, Math.round(point.usageHours * 3))),
          })),
      }))
      .sort((a, b) => (b.totalUsage - a.totalUsage) || a.label.localeCompare(b.label));
  }, [msagMonthlyData]);

  const portableSummary = useMemo(() => {
    const rows = Array.isArray(msagMonthlyData) ? msagMonthlyData : [];
    const deployedSiteKeys = new Set();
    let fuelConsumed = 0;
    const monthKeys = new Set();

    rows.forEach((row) => {
      const siteName = normalizeSiteName(row.msagRaw || row.msagName || "");
      if (siteName) {
        deployedSiteKeys.add(siteMatchKey(siteName));
      }

      fuelConsumed += Number(row.fuelConsumption || 0);

      const parsedDate = parsePortableDate(row.operationDate);
      if (parsedDate) {
        monthKeys.add(`${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}`);
      }
    });

    const monthLabel = (() => {
      if (monthKeys.size === 0) return "Month not found";
      const sortedKeys = [...monthKeys].sort();
      const formatKey = (key) => {
        const [yearText, monthText] = key.split("-");
        const year = Number(yearText);
        const month = Number(monthText);
        return new Date(year, Math.max(0, month - 1), 1).toLocaleDateString("en-PK", {
          month: "long",
          year: "numeric",
        });
      };

      if (sortedKeys.length === 1) return formatKey(sortedKeys[0]);
      return `${formatKey(sortedKeys[0])} to ${formatKey(sortedKeys[sortedKeys.length - 1])}`;
    })();

    const balanceRows = (fuelBalanceDerived?.totals || []).filter((item) => deployedSiteKeys.has(siteMatchKey(item.name)));
    const roundedOpening = round2(balanceRows.reduce((sum, item) => sum + Number(item.openingBalance || 0), 0));
    const roundedClosing = round2(balanceRows.reduce((sum, item) => sum + Number(item.fuelBalance || 0), 0));
    const roundedConsumed = round2(fuelConsumed);

    return {
      siteCount: deployedSiteKeys.size,
      deploymentCount: rows.length,
      openingBalance: roundedOpening,
      closingBalance: roundedClosing,
      fuelConsumed: roundedConsumed,
      monthLabel,
    };
  }, [msagMonthlyData, fuelBalanceDerived]);

  const generatorColorMap = useMemo(() => {
    const palette = ["#174EA6", "#C5221F", "#0B8043", "#B06000", "#7E57C2", "#00838F", "#5D4037", "#546E7A"];
    const map = new Map();
    portableGeneratorKeys.forEach((key, index) => {
      map.set(key, palette[index % palette.length]);
    });
    return map;
  }, [portableGeneratorKeys]);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LOW_FUEL_THRESHOLD_STORAGE_KEY, String(lowFuelThreshold));
    } catch {
      // Ignore storage errors
    }
  }, [lowFuelThreshold]);

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

  const fuelBalanceChartData = useMemo(() => {
    if (!fuelBalanceDerived || !Array.isArray(fuelBalanceDerived.totals)) return [];
    return fuelBalanceDerived.totals.map((item) => ({
      ...item,
      isLowFuel: Number(item.fuelBalance || 0) <= Number(lowFuelThreshold || 0),
    }));
  }, [fuelBalanceDerived, lowFuelThreshold]);

  const lowFuelSitesCount = useMemo(() => {
    return fuelBalanceChartData.filter((item) => item.isLowFuel).length;
  }, [fuelBalanceChartData]);

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
 
  const addRepair = useCallback(async (entry) => {
    await appendRepairHistoryEntry(entry);
    const list = await getRepairHistoryData();
    setRepairs(list);
  }, []);
 
  const updateRepair = useCallback(async (entryId, entry) => {
    await updateRepairHistoryEntry(entryId, entry);
    const list = await getRepairHistoryData();
    setRepairs(list);
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
    portable: { title: "Portable Generators", desc: "MSAG Monthly usage and fuel analysis", icon: Fuel },
    pmr: { title: "PMR Tracking", desc: "Live site names from the PMR Tracking Google Sheet", icon: ClipboardList },
    repair: { title: "DG Repair History", desc: "Log and track generator repairs, spares used, and status", icon: Wrench },
    sheets: { title: "Google Sheets", desc: "Open the live workbook directly", icon: Link2 },
    electricity: { title: "Electricity Performance", desc: "", icon: Activity },
    fuelperf: { title: "Fuel Performance", desc: "", icon: Fuel },
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
  const hideSectionHeader = section === "electricity" || section === "fuelperf";
 
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "transparent", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{FONT_IMPORT}</style>
      <Sidebar active={section} onSelect={setSection} />
 
      <main style={{ flex: 1, minWidth: 0, color: COLORS.text, padding: "28px 32px 44px", boxSizing: "border-box" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {!hideSectionHeader && (
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
        )}
        {!hideSectionHeader && (
          <div style={{ fontSize: 13, color: COLORS.textDim, marginBottom: 22, marginLeft: 50, maxWidth: 680, lineHeight: 1.35 }}>
            {(section === "usage" || section === "fuel") && parsed ? (parsed.title || "Parsed report") : sectionMeta.desc}
          </div>
        )}
 
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
          <UsageSection
            meterDerived={meterDerived}
            selectedUsageTotal={selectedUsageTotal}
            selectedUsageLabel={selectedUsageLabel}
            selectedFuelConsumedTotal={selectedFuelConsumedTotal}
            selectedUsageData={selectedUsageData}
            usageDateOptions={usageDateOptions}
            selectedUsageDate={selectedUsageDate}
            setSelectedUsageDate={setSelectedUsageDate}
            fuelBalanceChartData={fuelBalanceChartData}
            lowFuelSitesCount={lowFuelSitesCount}
            lowFuelThreshold={lowFuelThreshold}
            setLowFuelThreshold={setLowFuelThreshold}
            fuelBalanceLoading={fuelBalanceLoading}
            fuelBalanceError={fuelBalanceError}
            fuelBalanceDerived={fuelBalanceDerived}
          />
        )}

        {section === "portable" && (
          <PortableSection
            portableSummary={portableSummary}
            msagLoading={msagLoading}
            msagError={msagError}
            portableByMSAG={portableByMSAG}
            portableByGenerator={portableByGenerator}
            portableTimelineRows={portableTimelineRows}
            generatorColorMap={generatorColorMap}
          />
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
          <PmrSection
            pmrLoading={pmrLoading}
            pmrError={pmrError}
            pmrSiteNames={pmrSiteNames}
            thresholdCategories={thresholdCategories}
            updateThresholdValue={updateThresholdValue}
            pmrSummary={pmrSummary}
            categoryStatusSummaries={categoryStatusSummaries}
            expandedExecutives={expandedExecutives}
            executiveSummaries={executiveSummaries}
            executiveCategoryStatusSummaries={executiveCategoryStatusSummaries}
            toggleExecutive={toggleExecutive}
            getThresholdValue={getThresholdValue}
          />
        )}

        {section === "electricity" && (
          <ElectricitySection
            selectedCpSite={selectedCpSite}
            electricitySummary={electricitySummary}
            siteTypeCounts={siteTypeCounts}
            resetElectricityFilters={resetElectricityFilters}
            selectedCpManager={selectedCpManager}
            setSelectedCpManager={setSelectedCpManager}
            cpManagerOptions={cpManagerOptions}
            selectedCpExecutive={selectedCpExecutive}
            setSelectedCpExecutive={setSelectedCpExecutive}
            cpExecutiveOptions={cpExecutiveOptions}
            selectedCpMonth={selectedCpMonth}
            setSelectedCpMonth={setSelectedCpMonth}
            cpMonthOptions={cpMonthOptions}
            selectedCpSiteType={selectedCpSiteType}
            setSelectedCpSiteType={setSelectedCpSiteType}
            cpSiteTypeOptions={cpSiteTypeOptions}
            selectedCpSiteValue={selectedCpSite}
            setSelectedCpSite={setSelectedCpSite}
            cpSiteOptions={cpSiteOptions}
            topIncreasedSites={topIncreasedSites}
            topDecreasedSites={topDecreasedSites}
          />
        )}

        {section === "fuelperf" && (
          <FuelPerformanceSection
            selectedFuelSite={selectedFuelSite}
            fuelSummary={fuelSummary}
            fuelSiteTypeCounts={fuelSiteTypeCounts}
            resetFuelFilters={resetFuelFilters}
            selectedFuelManager={selectedFuelManager}
            setSelectedFuelManager={setSelectedFuelManager}
            fuelManagerOptions={fuelManagerOptions}
            selectedFuelExecutive={selectedFuelExecutive}
            setSelectedFuelExecutive={setSelectedFuelExecutive}
            fuelExecutiveOptions={fuelExecutiveOptions}
            selectedFuelMonth={selectedFuelMonth}
            setSelectedFuelMonth={setSelectedFuelMonth}
            fuelMonthOptions={fuelMonthOptions}
            selectedFuelSiteType={selectedFuelSiteType}
            setSelectedFuelSiteType={setSelectedFuelSiteType}
            fuelSiteTypeOptions={fuelSiteTypeOptions}
            selectedFuelSiteValue={selectedFuelSite}
            setSelectedFuelSite={setSelectedFuelSite}
            fuelSiteOptions={fuelSiteOptions}
            topIncreasedFuelSites={topIncreasedFuelSites}
            topDecreasedFuelSites={topDecreasedFuelSites}
          />
        )}

        {section === "repair" && (
          <RepairHistorySection
            repairs={repairs}
            loading={repairsLoading}
            siteNames={derived ? derived.siteNames : []}
            onAdd={addRepair}
            onUpdate={updateRepair}
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

