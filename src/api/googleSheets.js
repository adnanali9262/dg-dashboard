const API_URL =
  "https://script.google.com/macros/s/AKfycbwpLLfcMe-FdV8ytdwghq7rEivnvB5YQiHnu0uZGlaWn8HWGnqGNhuA7mufbU0yFsrX0A/exec";

const DAILY_METER_SHEET_NAMES = ["Daily Meter Readings", "Daily_Meter_Reading", "Daily Meter Reading"];

function parseDailyMeterRows(payload) {
  if (payload.error) return [];
  const data = Array.isArray(payload) ? payload : payload.value || payload.data || [];

  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  if (!Array.isArray(data[0])) {
    return data.map((row) => ({
      date: row.Date || row.date || "",
      site: row.Site || row.site || row.Exchange || "",
      dailyHours: Number(row.Daily_Run_Hours || row.dailyHours || row["Daily Run Hours"] || 0),
      hourMeter: Number(row.Total_Hour_Meter || row.hourMeter || row["Total Hour Meter"] || 0),
    }));
  }

  const headers = data[0];

  const dateCol = headers.indexOf("Date");
  const siteCol = headers.indexOf("Site");
  const dailyCol = headers.indexOf("Daily_Run_Hours");
  const meterCol = headers.indexOf("Total_Hour_Meter");

  if ([dateCol, siteCol, dailyCol, meterCol].some((col) => col === -1)) {
    throw new Error("Daily meter sheet is missing one of the required columns.");
  }

  return data.slice(1).map((row) => ({
    date: row[dateCol],
    site: row[siteCol],
    dailyHours: Number(row[dailyCol]),
    hourMeter: Number(row[meterCol]),
  }));
}

export async function getDailyMeterReadings() {
  for (const sheetName of DAILY_METER_SHEET_NAMES) {
    const response = await fetch(
      `${API_URL}?action=getData&sheet=${encodeURIComponent(sheetName)}`
    );

    if (!response.ok) continue;

    const rows = parseDailyMeterRows(await response.json()).filter((row) => row.site);
    if (rows.length > 0) return rows;
  }

  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error("Failed to load Google Sheet");
  }

  return parseDailyMeterRows(await response.json()).filter((row) => row.site);
}

export async function getSummaryData() {
  try {
    // Get daily meter readings data
    const meterData = await getDailyMeterReadings();
    
    if (!meterData || meterData.length === 0) {
      return [];
    }

    // Create a map of unique sites with their info
    const sitesMap = {};
    meterData.forEach(item => {
      if (item.site && !sitesMap[item.site]) {
        // Determine status from site name
        const isWorking = !/faulty/i.test(item.site);
        sitesMap[item.site] = {
          dgName: item.site,
          status: isWorking ? "Working" : "Faulty",
          engine: "Unknown",
          alternator: "Unknown",
          capacity: "Unknown",
          engineer: "Unknown",
        };
      }
    });

    const result = Object.values(sitesMap);
    console.log(`✓ getSummaryData loaded ${result.length} DG sites`);
    return result;
  } catch (error) {
    console.error("✗ Error in getSummaryData:", error);
    return [];
  }
}

const FUEL_BALANCE_SHEET_NAMES = ["Fuel Balance", "Fuel_Balance", "DG Fuel Balance", "Fuel"];
const PMR_SHEET_NAMES = ["PMR Tracking", "PMR_Tracking", "PMR"];

function getHeaderIndex(headers, patterns) {
  return headers.findIndex((header) => {
    const normalized = String(header || "").trim();
    return patterns.some((pattern) => pattern.test(normalized));
  });
}

function parseFuelBalanceRows(payload) {
  if (payload.error) {
    throw new Error(payload.error);
  }

  const data = Array.isArray(payload) ? payload : payload.data || payload.value || [];

  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  if (Array.isArray(data[0])) {
    const headers = data[0];
    const siteCol = getHeaderIndex(headers, [/^site$/i, /exchange/i, /dg\s*name/i, /name\s*of\s*exchange/i]);
    const fuelCol = getHeaderIndex(headers, [
      /^fuel[_\s-]*balance$/i,
      /fuel\s*available/i,
      /available\s*fuel/i,
      /balance.*lit/i,
    ]);
    const consumptionCol = getHeaderIndex(headers, [
      /per\s*hour\s*fuel\s*consumption/i,
      /fuel\s*consumption/i,
      /consumption.*hour/i,
    ]);

    if (siteCol === -1 || fuelCol === -1) {
      return [];
    }

    return data.slice(1).map((row) => ({
      site: row[siteCol],
      fuelBalance: Number(row[fuelCol] || 0),
      perHourFuelConsumption: consumptionCol === -1 ? 0 : Number(row[consumptionCol] || 0),
    }));
  }

  return data.map((row) => ({
    site: row.Site || row.site || row.Exchange || row.exchange || row.DG_Name || row["Name of Exchange"] || "",
    fuelBalance: Number(
      row.Fuel_Balance ||
      row.fuelBalance ||
      row["Fuel Balance"] ||
      row.Fuel_Available ||
      row["Fuel Available"] ||
      row.Available_Fuel ||
      0
    ),
    perHourFuelConsumption: Number(
      row.Per_Hour_Fuel_Consumption ||
      row.perHourFuelConsumption ||
      row["Per Hour Fuel Consumption"] ||
      row["Fuel Consumption"] ||
      0
    ),
  }));
}

export async function getFuelBalanceData() {
  try {
    for (const sheetName of FUEL_BALANCE_SHEET_NAMES) {
      const response = await fetch(
        `${API_URL}?action=getData&sheet=${encodeURIComponent(sheetName)}`
      );

      if (!response.ok) {
        continue;
      }

      const payload = await response.json();
      const rows = parseFuelBalanceRows(payload).filter((row) => row.site);

      if (rows.length > 0) {
        return rows;
      }
    }

    return [];
  } catch (error) {
    console.error("✗ Error in getFuelBalanceData:", error);
    return [];
  }
}

function getRowValue(row, aliases) {
  for (const alias of aliases) {
    const value = row?.[alias];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function parsePMRRows(payload) {
  if (payload.error) {
    throw new Error(payload.error);
  }

  const data = Array.isArray(payload) ? payload : payload.data || payload.value || [];
  if (!Array.isArray(data) || data.length === 0) return [];

  if (Array.isArray(data[0])) {
    const headers = data[0];
    const executiveCol = getHeaderIndex(headers, [/executive/i, /field\s*executive/i, /incharge/i, /owner/i]);
    const siteCol = getHeaderIndex(headers, [/site\s*name/i, /site/i, /exchange/i, /name/i, /location/i]);
    const typeCol = getHeaderIndex(headers, [/msag/i, /msan/i, /type/i, /category/i, /network/i]);
    const pmDateCol = getHeaderIndex(headers, [/pm\s*date/i, /date/i, /done\s*date/i, /completion/i, /completed/i]);

    return data.slice(1).map((row) => ({
      executive: executiveCol === -1 ? String(row[0] || "").trim() : String(row[executiveCol] || "").trim(),
      site: siteCol === -1 ? String(row[1] || "").trim() : String(row[siteCol] || "").trim(),
      type: typeCol === -1 ? String(row[2] || "").trim() : String(row[typeCol] || "").trim(),
      pmDate: pmDateCol === -1 ? String(row[3] || "").trim() : String(row[pmDateCol] || "").trim(),
      status: String((pmDateCol === -1 ? row[3] : row[pmDateCol]) || "").trim() ? "PM Done" : "Pending",
    })).filter((row) => row.executive || row.site);
  }

  return data.map((row) => {
    const pmDate = getRowValue(row, ["PM date", "PMDate", "PM_Date", "date", "Date", "PM Done Date", "Completion Date"]);
    return {
      executive: getRowValue(row, ["Executive", "executive", "Field Executive", "Field_Executive", "Engineer", "Owner"]),
      site: getRowValue(row, ["Site Name", "SiteName", "Site", "site", "Exchange", "exchange", "Name of Exchange", "Name", "Location"]),
      type: getRowValue(row, ["Category", "Type", "type", "Site Type", "Network Type"]),
      pmDate,
      status: pmDate ? "PM Done" : "Pending",
    };
  }).filter((row) => row.executive || row.site);
}

export async function getPMRTrackingData() {
  try {
    for (const sheetName of PMR_SHEET_NAMES) {
      const response = await fetch(
        `${API_URL}?action=getData&sheet=${encodeURIComponent(sheetName)}`
      );

      if (!response.ok) continue;
      const payload = await response.json();
      const rows = parsePMRRows(payload);
      if (rows.length > 0) return rows;
    }
    return [];
  } catch (error) {
    console.error("✗ Error in getPMRTrackingData:", error);
    return [];
  }
}
