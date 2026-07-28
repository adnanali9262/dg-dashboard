/**
 * Unified Google Sheets API Helper
 * 
 * This module provides a generic interface to interact with any worksheet
 * in the Google Sheet backend. All sheets are accessed through a single
 * Apps Script endpoint using action and sheet name parameters.
 */

const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbz9-zDBNOWl5L1Ex_j1vpWwlshqU0TFsuLgUzttzqx8RoSpp9-7MZ7Xo1rVkeItaYKgNg/exec";

/**
 * Fetch data from any worksheet
 * @param {string} sheetName - Name of the worksheet to fetch from
 * @returns {Promise<Array>} - Array of objects with headers as keys
 */
export async function fetchSheetData(sheetName) {
  try {
    const url = `${SHEET_API_URL}?action=getData&sheet=${encodeURIComponent(sheetName)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch ${sheetName}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    console.log(`✓ Loaded ${sheetName}:`, result.data);
    return result.data || [];
  } catch (error) {
    console.error(`✗ Error fetching ${sheetName}:`, error);
    return [];
  }
}

/**
 * Append a new row to a worksheet
 * @param {string} sheetName - Name of the worksheet
 * @param {Object} rowData - Object with keys matching column headers
 * @returns {Promise<Object>} - Response from server
 */
export async function appendSheetRow(sheetName, rowData) {
  try {
    const response = await fetch(SHEET_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "appendData",
        sheet: sheetName,
        ...rowData,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to append to ${sheetName}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    console.log(`✓ Row appended to ${sheetName}:`, rowData);
    return result;
  } catch (error) {
    console.error(`✗ Error appending to ${sheetName}:`, error);
    throw error;
  }
}

/**
 * Update an existing row in a worksheet
 * @param {string} sheetName - Name of the worksheet
 * @param {string|number} id - ID of the row to update
 * @param {Object} updateData - Object with keys matching column headers
 * @returns {Promise<Object>} - Response from server
 */
export async function updateSheetRow(sheetName, id, updateData) {
  try {
    const response = await fetch(`${SHEET_API_URL}?action=updateData&sheet=${encodeURIComponent(sheetName)}&id=${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update ${sheetName}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    console.log(`✓ Row updated in ${sheetName}:`, updateData);
    return result;
  } catch (error) {
    console.error(`✗ Error updating ${sheetName}:`, error);
    throw error;
  }
}

/**
 * Get list of all sheet names
 * @returns {Promise<Array>} - Array of sheet names
 */
export async function getAvailableSheets() {
  try {
    const response = await fetch(`${SHEET_API_URL}?action=getSheets`);

    if (!response.ok) {
      throw new Error(`Failed to get sheets: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    return result.sheets || [];
  } catch (error) {
    console.error("✗ Error getting sheets:", error);
    return [];
  }
}

/**
 * Filter sheet data locally
 * @param {Array} data - Array of objects
 * @param {Object} filters - Object with column:value pairs
 * @returns {Array} - Filtered array
 */
export function filterSheetData(data, filters) {
  return data.filter(row => {
    return Object.entries(filters).every(([key, value]) => {
      if (typeof value === 'string') {
        return row[key]?.toString().toLowerCase().includes(value.toLowerCase());
      }
      return row[key] === value;
    });
  });
}

/**
 * Sort sheet data locally
 * @param {Array} data - Array of objects
 * @param {string} column - Column to sort by
 * @param {string} order - "asc" or "desc"
 * @returns {Array} - Sorted array
 */
export function sortSheetData(data, column, order = "asc") {
  const sorted = [...data].sort((a, b) => {
    if (a[column] < b[column]) return order === "asc" ? -1 : 1;
    if (a[column] > b[column]) return order === "asc" ? 1 : -1;
    return 0;
  });
  return sorted;
}
