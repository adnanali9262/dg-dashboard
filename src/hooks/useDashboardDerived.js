import { useMemo } from "react";
import { normalizeSiteName, siteMatchKey, round2 } from "../utils/dashboardUtils";

export function useFuelBalanceDerived(fuelBalanceData, meterData) {
  return useMemo(() => {
    const latestMeterBySite = new Map();
    (Array.isArray(meterData) ? meterData : []).forEach((item) => {
      const name = normalizeSiteName(item.site || item.name || "");
      const key = siteMatchKey(name);
      if (!key) return;

      const parsedDate = item.date ? new Date(item.date) : null;
      if (!parsedDate || Number.isNaN(parsedDate.getTime())) return;

      const hourMeter = Number(item.hourMeter ?? item.totalHourMeter ?? item["Total Hour Meter"] ?? 0) || 0;
      const previous = latestMeterBySite.get(key);
      if (!previous || parsedDate > previous.date) {
        latestMeterBySite.set(key, { date: parsedDate, hourMeter });
      }
    });

    const totals = (Array.isArray(fuelBalanceData) ? fuelBalanceData : [])
      .map((item) => {
        const name = normalizeSiteName(item.name || item.site || item.siteName || item["Site Name"] || item["Name of Exchange"] || "");
        const openingBalance = Number(item.openingBalance ?? item["Opening Balance of this month"] ?? 0) || 0;
        const cumulativeTopping = Number(item.cumulativeTopping ?? item["Cummulative topping in current month (if any)"] ?? item["Cumulative topping in current month (if any)"] ?? 0) || 0;
        const startHourMeter = Number(item.startHourMeter ?? item["Reading of Hour Meter at start of this month"] ?? 0) || 0;
        const perHourFuelConsumption = Number(item.perHourFuelConsumption ?? item.per_hour_fuel_consumption ?? item["Per Hour Fuel Consumption"] ?? 0) || 0;
        const latestMeter = latestMeterBySite.get(siteMatchKey(name));
        const latestHourMeter = latestMeter ? latestMeter.hourMeter : startHourMeter;
        const consumedFuel = Math.max(0, latestHourMeter - startHourMeter) * perHourFuelConsumption;
        const computedFuelBalance = round2((openingBalance + cumulativeTopping) - consumedFuel);

        return {
          name,
          openingBalance,
          cumulativeTopping,
          startHourMeter,
          latestHourMeter,
          fuelBalance: computedFuelBalance,
          perHourFuelConsumption,
        };
      })
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
  }, [fuelBalanceData, meterData]);
}

export function useDerived(parsed) {
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

export function useFuelDerived(parsed) {
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

export function useSheetSummary(sheetData) {
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
