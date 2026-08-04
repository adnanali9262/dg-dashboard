const API_URL =
  "https://script.google.com/macros/s/AKfycbwh-KObXX_5dNg98QE7ZUG3e3S3wX64F4p7qcCJIxEiKVemhfThvrbY6HTQUVLSYJ6aIA/exec";

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
const CP_SHEET_NAMES = ["CP Data", "CP_Data", "CP", "CPDATA"];
const FUEL_DATA_SHEET_NAMES = ["fuel data", "Fuel Data", "Fuel_Data", "FuelData", "FUEL DATA"];
const REPAIR_HISTORY_SHEET_NAMES = ["DG repair History", "DG Repair History", "DG_repair_History"];

const REPAIR_HISTORY_HEADERS = {
  exchangeName: "Exchange Name",
  dgNameCapacity: "DG name/Capacity",
  faultOccurrenceDate: "Fault occurance date",
  faultOccurrenceReading: "fault occurance M/R reading",
  faultDetail: "detail of fault",
  status: "resolution pending/in progress/Completed",
  faultClearanceDate: "Fault clearance date (if applicable)",
  faultClearanceReading: "fault clearance M/R reading  (if applicable)",
  responsibleType: "by vendor or PTCL ",
  vendorName: "(if vendor? its name)",
  ptclStaffName: "if PTCL staff ? its name",
};

const REPAIR_HISTORY_HEADER_ALIASES = {
  exchangeName: [
    "Exchange Name",
    "exchangeName",
    "Site",
    "site",
  ],
  dgNameCapacity: [
    "DG name/Capacity",
    "DG name / Capacity",
    "DG name /Capacity",
    "DG Name/Capacity",
    "DG Name / Capacity",
    "dgNameCapacity",
  ],
  faultOccurrenceDate: [
    "Fault occurance date",
    "fault occurance date",
    "Fault Occurance Date",
    "faultOccurrenceDate",
    "date",
    "Date",
  ],
  faultOccurrenceReading: [
    "fault occurance M/R reading",
    "Fault occurance M/R reading",
    "faultOccurrenceReading",
  ],
  faultDetail: [
    "detail of fault",
    "Detail of fault",
    "faultDetail",
    "issue",
  ],
  status: [
    "resolution pending/in progress/Completed",
    "Resolution pending / in progress / Completed",
    "status",
  ],
  faultClearanceDate: [
    "Fault clearance date (if applicable)",
    "Fault clearance date",
    "faultClearanceDate",
  ],
  faultClearanceReading: [
    "fault clearance M/R reading  (if applicable)",
    "Fault clearance M/R reading",
    "faultClearanceReading",
  ],
  responsibleType: [
    "by vendor or PTCL ",
    "By Vendor or PTCL",
    "responsibleType",
  ],
  vendorName: [
    "(if vendor? its name)",
    "Vendor name",
    "vendorName",
  ],
  ptclStaffName: [
    "if PTCL staff ? its name",
    "if PTCL staff ? its name)",
    "PTCL staff name",
    "ptclStaffName",
  ],
};

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
    const openingBalanceCol = getHeaderIndex(headers, [/opening\s*balance/i]);
    const startMeterCol = getHeaderIndex(headers, [/reading\s*of\s*hour\s*meter\s*at\s*start/i, /hour\s*meter.*start/i]);
    const consumptionCol = getHeaderIndex(headers, [
      /per\s*hour\s*fuel\s*consumption/i,
      /fuel\s*consumption/i,
      /consumption.*hour/i,
    ]);
    const toppingCol = getHeaderIndex(headers, [/cummulative\s*topping/i, /cumulative\s*topping/i, /topping/i]);

    if (siteCol === -1) {
      return [];
    }

    return data.slice(1).map((row) => ({
      site: row[siteCol],
      fuelBalance: fuelCol === -1 ? 0 : Number(row[fuelCol] || 0),
      openingBalance: openingBalanceCol === -1 ? 0 : Number(row[openingBalanceCol] || 0),
      startHourMeter: startMeterCol === -1 ? 0 : Number(row[startMeterCol] || 0),
      perHourFuelConsumption: consumptionCol === -1 ? 0 : Number(row[consumptionCol] || 0),
      cumulativeTopping: toppingCol === -1 ? 0 : Number(row[toppingCol] || 0),
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
    openingBalance: Number(
      row["Opening Balance of this month"] ||
      row.Opening_Balance_of_this_month ||
      row.openingBalance ||
      0
    ),
    startHourMeter: Number(
      row["Reading of Hour Meter at start of this month"] ||
      row.Reading_of_Hour_Meter_at_start_of_this_month ||
      row.startHourMeter ||
      0
    ),
    perHourFuelConsumption: Number(
      row.Per_Hour_Fuel_Consumption ||
      row.perHourFuelConsumption ||
      row["Per Hour Fuel Consumption"] ||
      row["Fuel Consumption"] ||
      0
    ),
    cumulativeTopping: Number(
      row["Cummulative topping in current month (if any)"] ||
      row["Cumulative topping in current month (if any)"] ||
      row.Cummulative_topping_in_current_month_if_any ||
      row.cumulativeTopping ||
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
  const normalizedMap = {};
  Object.keys(row || {}).forEach((key) => {
    const normalized = String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalized) {
      normalizedMap[normalized] = row[key];
    }
  });

  for (const alias of aliases) {
    const value = row?.[alias];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }

    const normalizedAlias = String(alias || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const normalizedValue = normalizedMap[normalizedAlias];
    if (normalizedValue !== undefined && normalizedValue !== null && String(normalizedValue).trim() !== "") {
      return String(normalizedValue).trim();
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

function parseCPRows(payload) {
  if (payload?.error) {
    throw new Error(payload.error);
  }

  const data = Array.isArray(payload) ? payload : payload?.data || payload?.value || [];
  if (!Array.isArray(data) || data.length === 0) return [];

  // If Apps Script already returns row objects, pass through as-is.
  if (!Array.isArray(data[0])) {
    return data;
  }

  // Convert 2D array to objects using row 1 as headers.
  const headers = data[0].map((header) => String(header || "").trim());
  return data.slice(1)
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell || "").trim() !== ""))
    .map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        if (header) item[header] = row[index];
      });
      return item;
    });
}

export async function getCPData() {
  try {
    for (const sheetName of CP_SHEET_NAMES) {
      const response = await fetch(
        `${API_URL}?action=getData&sheet=${encodeURIComponent(sheetName)}`
      );

      if (!response.ok) continue;

      const payload = await response.json();
      const rows = parseCPRows(payload);
      if (rows.length > 0) return rows;
    }

    return [];
  } catch (error) {
    console.error("✗ Error in getCPData:", error);
    return [];
  }
}

function parseFuelPerformanceRows(payload) {
  if (payload?.error) {
    throw new Error(payload.error);
  }

  const data = Array.isArray(payload) ? payload : payload?.data || payload?.value || [];
  if (!Array.isArray(data) || data.length === 0) return [];

  // If Apps Script already returns row objects, pass through.
  if (!Array.isArray(data[0])) {
    return data;
  }

  const headers = data[0].map((header) => String(header || "").trim());
  return data.slice(1)
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell || "").trim() !== ""))
    .map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        if (header) item[header] = row[index];
      });
      return item;
    });
}

export async function getFuelPerformanceData() {
  try {
    for (const sheetName of FUEL_DATA_SHEET_NAMES) {
      const response = await fetch(
        `${API_URL}?action=getData&sheet=${encodeURIComponent(sheetName)}`
      );

      if (!response.ok) continue;

      const payload = await response.json();
      const rows = parseFuelPerformanceRows(payload);
      if (rows.length > 0) return rows;
    }

    return [];
  } catch (error) {
    console.error("✗ Error in getFuelPerformanceData:", error);
    return [];
  }
}

function normalizeRepairHistoryRow(row) {
  return {
    id: String(getRowValue(row, ["id", "ID", "Id"]) || row.__rowNumber || Date.now()),
    rowNumber: Number(row.__rowNumber || row.rowNumber || 0) || 0,
    exchangeName: getRowValue(row, REPAIR_HISTORY_HEADER_ALIASES.exchangeName),
    dgNameCapacity: getRowValue(row, REPAIR_HISTORY_HEADER_ALIASES.dgNameCapacity),
    faultOccurrenceDate: getRowValue(row, REPAIR_HISTORY_HEADER_ALIASES.faultOccurrenceDate),
    faultOccurrenceReading: getRowValue(row, REPAIR_HISTORY_HEADER_ALIASES.faultOccurrenceReading),
    faultDetail: getRowValue(row, REPAIR_HISTORY_HEADER_ALIASES.faultDetail),
    status: getRowValue(row, REPAIR_HISTORY_HEADER_ALIASES.status) || "Pending",
    faultClearanceDate: getRowValue(row, REPAIR_HISTORY_HEADER_ALIASES.faultClearanceDate),
    faultClearanceReading: getRowValue(row, REPAIR_HISTORY_HEADER_ALIASES.faultClearanceReading),
    responsibleType: getRowValue(row, REPAIR_HISTORY_HEADER_ALIASES.responsibleType),
    vendorName: getRowValue(row, REPAIR_HISTORY_HEADER_ALIASES.vendorName),
    ptclStaffName: getRowValue(row, REPAIR_HISTORY_HEADER_ALIASES.ptclStaffName),
  };
}

function toRepairHistoryPayload(entry) {
  const payload = {};
  const assignValue = (aliases, value) => {
    aliases.forEach((alias) => {
      payload[alias] = value;
    });
  };

  payload.id = String(entry.id || "");
  assignValue(REPAIR_HISTORY_HEADER_ALIASES.exchangeName, entry.exchangeName || "");
  assignValue(REPAIR_HISTORY_HEADER_ALIASES.dgNameCapacity, entry.dgNameCapacity || "");
  assignValue(REPAIR_HISTORY_HEADER_ALIASES.faultOccurrenceDate, entry.faultOccurrenceDate || "");
  assignValue(REPAIR_HISTORY_HEADER_ALIASES.faultOccurrenceReading, entry.faultOccurrenceReading || "");
  assignValue(REPAIR_HISTORY_HEADER_ALIASES.faultDetail, entry.faultDetail || "");
  assignValue(REPAIR_HISTORY_HEADER_ALIASES.status, entry.status || "Pending");
  assignValue(REPAIR_HISTORY_HEADER_ALIASES.faultClearanceDate, entry.faultClearanceDate || "");
  assignValue(REPAIR_HISTORY_HEADER_ALIASES.faultClearanceReading, entry.faultClearanceReading || "");
  assignValue(REPAIR_HISTORY_HEADER_ALIASES.responsibleType, entry.responsibleType || "");
  assignValue(REPAIR_HISTORY_HEADER_ALIASES.vendorName, entry.vendorName || "");
  assignValue(REPAIR_HISTORY_HEADER_ALIASES.ptclStaffName, entry.ptclStaffName || "");

  return payload;
}

export async function getRepairHistoryData() {
  try {
    for (const sheetName of REPAIR_HISTORY_SHEET_NAMES) {
      const response = await fetch(`${API_URL}?action=getData&sheet=${encodeURIComponent(sheetName)}`);
      if (!response.ok) continue;
      const payload = await response.json();
      const data = Array.isArray(payload) ? payload : payload?.data || payload?.value || [];
      if (Array.isArray(data) && data.length > 0) {
        return data.map(normalizeRepairHistoryRow);
      }
    }
    return [];
  } catch (error) {
    console.error("✗ Error in getRepairHistoryData:", error);
    return [];
  }
}

export async function appendRepairHistoryEntry(entry) {
  const payload = toRepairHistoryPayload(entry);
  const sheetName = REPAIR_HISTORY_SHEET_NAMES[0];
  try {
    const response = await fetch(`${API_URL}?action=appendData&sheet=${encodeURIComponent(sheetName)}`, {
      method: "POST",
      // Apps Script endpoints often reject preflighted JSON in browsers; text/plain avoids OPTIONS preflight.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error("Failed to append repair history entry.");
    }
    const result = await response.json();
    if (result?.error) throw new Error(result.error);
    return result;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Network error while saving. Please refresh and try again.");
    }
    throw error;
  }
}

export async function updateRepairHistoryEntry(entryId, entry) {
  if (!entryId) {
    throw new Error("Missing entry id for update.");
  }
  const payload = toRepairHistoryPayload(entry);
  const sheetName = REPAIR_HISTORY_SHEET_NAMES[0];
  try {
    const response = await fetch(`${API_URL}?action=updateData&sheet=${encodeURIComponent(sheetName)}&id=${encodeURIComponent(entryId)}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error("Failed to update repair history entry.");
    }
    const result = await response.json();
    if (result?.error) throw new Error(result.error);
    return result;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Network error while updating. Please refresh and try again.");
    }
    throw error;
  }
}

export async function deleteRepairHistoryEntry(rowNumber) {
  const sheetName = REPAIR_HISTORY_SHEET_NAMES[0];
  try {
    const response = await fetch(`${API_URL}?action=deleteData&sheet=${encodeURIComponent(sheetName)}&row=${encodeURIComponent(rowNumber)}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error("Failed to delete repair history entry.");
    }
    const result = await response.json();
    if (result?.error) throw new Error(result.error);
    return result;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Network error while deleting. Please refresh and try again.");
    }
    throw error;
  }
}
