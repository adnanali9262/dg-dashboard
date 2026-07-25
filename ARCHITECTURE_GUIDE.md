# DG Dashboard Multi-Sheet Backend Architecture

## Overview

This architecture uses a single Google Spreadsheet with multiple worksheets, managed by a single generic Google Apps Script that handles all read/write operations.

### Architecture Diagram

```
┌─────────────────────────────────────────────┐
│     Google Spreadsheet Backend              │
├─────────────────────────────────────────────┤
│  ├─ Daily_Meter_Reading (sheet tab)        │
│  ├─ Fuel_Filling                           │
│  ├─ Repairs                                │
│  ├─ DG_Details                             │
│  ├─ Monthly_Report                         │
│  ├─ PM_Schedule                            │
│  ├─ Engineers                              │
│  └─ Settings                               │
└─────────────────────────────────────────────┘
           ↓ (via Google Apps Script)
┌─────────────────────────────────────────────┐
│  Generic Apps Script API                    │
│  - ?action=getData&sheet=SheetName          │
│  - ?action=appendData&sheet=SheetName       │
│  - ?action=updateData&sheet=SheetName&id=X  │
│  - ?action=getSheets                        │
└─────────────────────────────────────────────┘
           ↓ (JSON over HTTP)
┌─────────────────────────────────────────────┐
│  React Dashboard                            │
├─────────────────────────────────────────────┤
│  ├─ src/api/sheetAPI.js (helper functions) │
│  ├─ src/hooks/useSheetData.js (custom hooks)│
│  └─ Dashboard Components                   │
└─────────────────────────────────────────────┘
```

## Step 1: Set Up Google Sheets Structure

Create a Google Sheet with these worksheets (tabs):

| Sheet Name | Purpose | Key Columns |
|-----------|---------|-------------|
| Daily_Meter_Reading | Daily generator usage | date, site, dailyHours, hourMeter, fuelAvailable |
| Fuel_Filling | Fuel top-ups | id, date, site, liters, cost, engineer |
| Repairs | Repair records | id, date, site, issue, status, engineer, cost |
| DG_Details | Static DG info | id, dgName, capacity, engine, location, status |
| Monthly_Report | Monthly summaries | id, month, totalHours, totalFuel, sites |
| PM_Schedule | Preventive maintenance | id, date, site, task, completed, engineer |
| Engineers | Engineer database | id, name, phone, email, area |
| Settings | App configuration | key, value, description |

### Example Sheet Headers:

**Daily_Meter_Reading:**
```
Date | Site | Daily_Run_Hours | Total_Hour_Meter | Fuel_Available
```

**DG_Details:**
```
id | DG_Set_Name | Capacity_KVA | Engine | Alternator | Status | Location
```

## Step 2: Update Google Apps Script

1. Go to: https://script.google.com/macros/s/YOUR_SCRIPT_ID/edit
2. Delete all existing code
3. Copy the entire code from `GOOGLE_APPS_SCRIPT.gs` file
4. Click **Save** (Ctrl+S)
5. Click **Deploy** → **New deployment**
6. Type: **Web app**
7. Execute as: **your Google account**
8. Who has access: **Anyone**
9. Click **Deploy**
10. Copy the deployment URL (keep it for later)

## Step 3: Update React Code

### 1. Update sheetAPI.js

Replace the `SHEET_API_URL` with your new deployment URL:

```javascript
const SHEET_API_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
```

### 2. Use in React Components

```javascript
import { useDailyMeterReadings, useFuelFilling, useDGDetails } from "@/hooks/useSheetData";

export default function Dashboard() {
  // Load all sheets at once
  const { data: meterData, loading: meterLoading } = useDailyMeterReadings();
  const { data: fuelData, loading: fuelLoading } = useFuelFilling();
  const { data: dgData, loading: dgLoading } = useDGDetails();

  // Add new record
  const handleAddRepair = async (repairData) => {
    const result = await appendSheetRow("Repairs", repairData);
    if (result.success) {
      // Refresh data
    }
  };

  return (
    <div>
      {meterLoading ? <p>Loading...</p> : <p>Loaded {meterData.length} records</p>}
    </div>
  );
}
```

### 3. Generic Sheet Hook Usage

```javascript
import { useSheetData } from "@/hooks/useSheetData";

// Use any sheet dynamically
const { data, loading, error, append, update, refresh } = useSheetData("Repairs");

// Append new row
await append({ date: "2026-07-25", site: "Site A", issue: "pump failure" });

// Update existing row
await update(5, { status: "Resolved" });

// Refresh data
await refresh();
```

## Step 4: Folder Structure

```
src/
├── api/
│   ├── sheetAPI.js              ← Generic sheet API functions
│   ├── googleSheets.js          ← Keep for compatibility (legacy)
│   └── index.js                 ← Export all API functions
├── hooks/
│   ├── useSheetData.js          ← All custom hooks
│   └── index.js                 ← Export all hooks
├── components/
│   ├── Dashboard/
│   ├── MeterReading/
│   ├── FuelManagement/
│   ├── RepairTracking/
│   └── ...
├── pages/
├── styles/
├── App.jsx
└── main.jsx
```

## Step 5: Update Main Dashboard Component

```javascript
import React, { useEffect, useState } from "react";
import {
  useDailyMeterReadings,
  useFuelFilling,
  useRepairs,
  useDGDetails,
} from "@/hooks/useSheetData";

export default function DGRunningHoursDashboard() {
  const [section, setSection] = useState("summary");

  // Load all required sheets
  const meterReadings = useDailyMeterReadings();
  const fuelFilling = useFuelFilling();
  const repairs = useRepairs();
  const dgDetails = useDGDetails();

  // Calculate summary stats from meterReadings.data
  const summary = useMemo(() => {
    if (!meterReadings.data.length) return null;
    
    const totalDGs = new Set(meterReadings.data.map(r => r.Site)).size;
    const totalHours = meterReadings.data.reduce((sum, r) => sum + (r.Total_Hour_Meter || 0), 0);
    
    return { totalDGs, totalHours };
  }, [meterReadings.data]);

  if (meterReadings.loading) return <div>Loading dashboard...</div>;

  return (
    <div>
      <h1>DG Dashboard</h1>
      {section === "summary" && <SummaryPage summary={summary} />}
      {section === "fuel" && <FuelPage data={fuelFilling.data} />}
      {section === "repairs" && <RepairsPage data={repairs.data} />}
    </div>
  );
}
```

## Step 6: Adding New Sheets in the Future

To add a new worksheet (e.g., "Alarms"):

1. **Create sheet in Google Sheets** with proper headers
2. **Add hook in `useSheetData.js`:**
   ```javascript
   export function useAlarms(autoLoad = true) {
     return useSheetData("Alarms", autoLoad);
   }
   ```
3. **Use in component:**
   ```javascript
   import { useAlarms } from "@/hooks/useSheetData";
   const { data, append, update } = useAlarms();
   ```

**That's it!** No Google Apps Script changes needed.

## Testing

### Test 1: Fetch Data
```javascript
import { fetchSheetData } from "@/api/sheetAPI";

const data = await fetchSheetData("Daily_Meter_Reading");
console.log(data); // Should show array of objects
```

### Test 2: Append Data
```javascript
import { appendSheetRow } from "@/api/sheetAPI";

await appendSheetRow("Repairs", {
  id: 1,
  date: "2026-07-25",
  site: "Site A",
  issue: "Engine failure",
  status: "Open",
});
```

### Test 3: API Endpoints
```
GET:  /exec?action=getData&sheet=Daily_Meter_Reading
GET:  /exec?action=getSheets
POST: /exec?action=appendData&sheet=Repairs
POST: /exec?action=updateData&sheet=Repairs&id=5
```

## Benefits of This Architecture

✅ **Single API** - One Google Apps Script handles all sheets  
✅ **Scalable** - Add new sheets without code changes  
✅ **Reusable hooks** - Easy to use in any React component  
✅ **Type-safe** - Clear data structure for each sheet  
✅ **Generic operations** - Read, append, update work for any sheet  
✅ **Easy testing** - Test individual sheets independently  
✅ **Future-proof** - Can add batteries, alarms, assets, reports without touching Apps Script  

## File Locations

- **Google Apps Script**: `GOOGLE_APPS_SCRIPT.gs` (copy to Google Apps Script Editor)
- **React API Helper**: `src/api/sheetAPI.js`
- **React Hooks**: `src/hooks/useSheetData.js`
- **Usage Examples**: See this guide and component examples

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 404 error | Check deployment URL matches SHEET_API_URL |
| Sheet not found | Verify sheet name matches exactly (case-sensitive) |
| CORS error | Make sure Apps Script is deployed as "Web app" → "Anyone" |
| Empty data | Check first row contains headers |
| Append fails | Verify payload keys match column headers |
