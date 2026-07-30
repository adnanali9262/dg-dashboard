/**
 * GENERIC GOOGLE SHEETS API FOR MULTI-SHEET BACKEND
 * 
 * This Apps Script provides a generic API to read, write, and update data in any worksheet.
 * All worksheets are automatically converted to JSON using the first row as headers.
 * 
 * Usage:
 * - Read: ?action=getData&sheet=SheetName
 * - Write: ?action=appendData&sheet=SheetName (with POST body)
 * - Update: ?action=updateData&sheet=SheetName&id=rowId (with POST body)
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();

/**
 * Main entry point for GET/POST requests
 */
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

/**
 * Route requests based on action parameter
 */
function handleRequest(e) {
  try {
    const action = e.parameter.action || "getData";
    const sheetName = e.parameter.sheet || "Daily_Meter_Reading";
    
    switch (action) {
      case "getData":
        return handleGetData(sheetName);
      case "appendData":
        return handleAppendData(sheetName, e);
      case "updateData":
        return handleUpdateData(sheetName, e);
      case "deleteData":
        return handleDeleteData(sheetName, e);
      case "getSheets":
        return handleGetSheets();
      default:
        return jsonResponse({ error: "Unknown action: " + action }, 400);
    }
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

/**
 * GET: Fetch all data from a sheet as JSON
 */
function handleGetData(sheetName) {
  const sheet = getSheet(sheetName);
  if (!sheet) {
    return jsonResponse({ error: "Sheet not found: " + sheetName }, 404);
  }
  
  const data = sheetToJSON(sheet);
  return jsonResponse({ success: true, data: data, count: data.length });
}

/**
 * POST: Append new row to sheet
 */
function handleAppendData(sheetName, e) {
  const sheet = getSheet(sheetName);
  if (!sheet) {
    return jsonResponse({ error: "Sheet not found: " + sheetName }, 404);
  }
  
  const payload = JSON.parse(e.postData.contents);
  const headers = getHeaders(sheet);
  
  // Validate payload
  const row = [];
  for (let header of headers) {
    row.push(payload[header] || "");
  }
  
  sheet.appendRow(row);
  
  return jsonResponse({ 
    success: true, 
    message: "Row appended to " + sheetName,
    data: payload
  });
}

/**
 * POST: Update existing row in sheet
 */
function handleUpdateData(sheetName, e) {
  const sheet = getSheet(sheetName);
  if (!sheet) {
    return jsonResponse({ error: "Sheet not found: " + sheetName }, 404);
  }
  
  const payload = JSON.parse(e.postData.contents);
  const id = e.parameter.id;
  const rowNumber = Number(e.parameter.row || 0);

  if (rowNumber > 1) {
    const headers = getHeaders(sheet);
    for (let j = 0; j < headers.length; j++) {
      if (payload[headers[j]] !== undefined) {
        sheet.getRange(rowNumber, j + 1).setValue(payload[headers[j]]);
      }
    }

    return jsonResponse({
      success: true,
      message: "Row updated in " + sheetName,
      row: rowNumber,
      data: payload
    });
  }
  
  if (!id) {
    return jsonResponse({ error: "Missing 'id' parameter for update" }, 400);
  }
  
  const headers = getHeaders(sheet);
  const idIndex = headers.indexOf("id") + 1; // Convert to 1-based index
  
  if (idIndex === 0) {
    return jsonResponse({ error: "Sheet must have an 'id' column to update" }, 400);
  }
  
  const data = sheet.getDataRange().getValues();
  let rowFound = false;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex - 1] == id) {
      // Update row
      for (let j = 0; j < headers.length; j++) {
        if (payload[headers[j]] !== undefined) {
          sheet.getRange(i + 1, j + 1).setValue(payload[headers[j]]);
        }
      }
      rowFound = true;
      break;
    }
  }
  
  if (!rowFound) {
    return jsonResponse({ error: "Row with id " + id + " not found" }, 404);
  }
  
  return jsonResponse({ 
    success: true, 
    message: "Row updated in " + sheetName,
    data: payload
  });
}

function handleDeleteData(sheetName, e) {
  const sheet = getSheet(sheetName);
  if (!sheet) {
    return jsonResponse({ error: "Sheet not found: " + sheetName }, 404);
  }

  const rowNumber = Number(e.parameter.row || 0);
  if (rowNumber <= 1 || rowNumber > sheet.getLastRow()) {
    return jsonResponse({ error: "Missing or invalid 'row' parameter for delete" }, 400);
  }

  sheet.deleteRow(rowNumber);
  return jsonResponse({ success: true, message: "Row deleted from " + sheetName, row: rowNumber });
}

/**
 * GET: List all sheet names
 */
function handleGetSheets() {
  const sheets = SPREADSHEET.getSheets();
  const sheetNames = sheets.map(sheet => sheet.getName());
  return jsonResponse({ success: true, sheets: sheetNames });
}

/**
 * Get sheet by name
 */
function getSheet(sheetName) {
  const exactMatch = SPREADSHEET.getSheetByName(sheetName);
  if (exactMatch) return exactMatch;

  const normalizedName = sheetName.toString().trim().toLowerCase();
  return SPREADSHEET.getSheets().find((sheet) =>
    sheet.getName().toString().trim().toLowerCase() === normalizedName
  );
}

/**
 * Get headers from first row
 */
function getHeaders(sheet) {
  const firstRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return firstRow.map(header => header.toString().trim());
}

/**
 * Convert sheet to JSON array
 * Uses first row as headers
 */
function sheetToJSON(sheet) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(header => header.toString().trim());
  
  const jsonArray = [];
  for (let i = 1; i < data.length; i++) {
    // Skip empty rows
    if (data[i].every(cell => cell === "" || cell === null)) {
      continue;
    }
    
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    row.__rowNumber = i + 1;
    jsonArray.push(row);
  }
  
  return jsonArray;
}

/**
 * Helper: Return JSON response
 */
function jsonResponse(data, statusCode = 200) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
