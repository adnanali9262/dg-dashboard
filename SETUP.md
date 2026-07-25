# Quick Start: Multi-Sheet Backend Setup

## Files Created/Modified

✅ `GOOGLE_APPS_SCRIPT.gs` - Generic backend API  
✅ `src/api/sheetAPI.js` - React API helper functions  
✅ `src/hooks/useSheetData.js` - Custom React hooks  
✅ `ARCHITECTURE_GUIDE.md` - Complete setup documentation  
✅ `src/components/SummaryExample.jsx` - Example component  

## Implementation Steps (5 minutes)

### Step 1: Update Google Apps Script (1 min)

1. Open: https://script.google.com/macros/s/AKfycbz9-zDBNOWl5L1Ex_j1vpWwlshqU0TFsuLgUzttzqx8RoSpp9-7MZ7Xo1rVkeItaYKgNg/edit
2. Delete all existing code
3. Copy and paste the entire content from `GOOGLE_APPS_SCRIPT.gs`
4. Click **Save** (Ctrl+S)
5. Click **Deploy** > **New deployment** > **Web app** > **Deploy**
6. ✅ Keep the deployment URL (same as before)

### Step 2: Verify Google Sheets Structure (2 min)

Ensure your Google Sheets has these worksheet tabs:
- Daily_Meter_Reading ✅
- Fuel_Filling (create if missing)
- Repairs (create if missing)
- DG_Details ✅
- Monthly_Report (create if missing)
- PM_Schedule (create if missing)
- Engineers (create if missing)
- Settings (create if missing)

### Step 3: Update React Code (2 min)

Files are already created, just verify imports work:

```bash
npm install  # If needed
```

### Step 4: Test the API

```javascript
// In browser console or test file:
import { fetchSheetData } from "@/api/sheetAPI";
import { useDailyMeterReadings } from "@/hooks/useSheetData";

// Test fetch
const data = await fetchSheetData("Daily_Meter_Reading");
console.log(data); // Should show actual data

// Test hook
const { data, loading } = useDailyMeterReadings();
```

### Step 5: Update Dashboard

Replace your current Summary component with the new one that uses the hooks:

```javascript
import { useDailyMeterReadings, useDGDetails } from "@/hooks/useSheetData";

export default function Dashboard() {
  const meterReadings = useDailyMeterReadings();
  const dgDetails = useDGDetails();
  // Rest of component...
}
```

## Usage Examples

### Load Single Sheet
```javascript
import { useDailyMeterReadings } from "@/hooks/useSheetData";

const { data, loading, error, refresh, append, update } = useDailyMeterReadings();
```

### Load Multiple Sheets
```javascript
import { 
  useDailyMeterReadings, 
  useFuelFilling, 
  useRepairs 
} from "@/hooks/useSheetData";

export default function Dashboard() {
  const meter = useDailyMeterReadings();
  const fuel = useFuelFilling();
  const repairs = useRepairs();
  
  return (
    <div>
      <p>Meter readings: {meter.data.length}</p>
      <p>Fuel entries: {fuel.data.length}</p>
      <p>Repairs: {repairs.data.length}</p>
    </div>
  );
}
```

### Append New Row
```javascript
const { append } = useFuelFilling();

const handleAddFuel = async () => {
  const result = await append({
    Date: new Date().toISOString(),
    Site: "Site A",
    Liters: 500,
    Cost: 50000,
    Engineer: "Ahmed",
  });
  
  if (result.success) {
    console.log("✓ Fuel entry added");
  }
};
```

### Update Existing Row
```javascript
const { update } = useRepairs();

const handleResolveRepair = async (repairId) => {
  const result = await update(repairId, {
    Status: "Resolved",
    Completion_Date: new Date().toISOString(),
  });
  
  if (result.success) {
    console.log("✓ Repair updated");
  }
};
```

### Generic Hook (For Any Sheet)
```javascript
import { useSheetData } from "@/hooks/useSheetData";

// Load any sheet by name
const { data, append, update } = useSheetData("YourCustomSheet");
```

## Architecture Benefits

| Aspect | Benefit |
|--------|---------|
| **Single API** | One Google Apps Script for all sheets |
| **Scalability** | Add new sheets without code changes |
| **Reusability** | Same hooks work for any sheet |
| **Type Safety** | Clear data structure per sheet |
| **Testability** | Easy to test individual sheets |
| **Maintainability** | Clean separation of concerns |
| **Extensibility** | Ready for batteries, alarms, reports, assets |

## Next Steps

1. ✅ Deploy Google Apps Script
2. ✅ Create missing worksheet tabs in Google Sheets
3. ✅ Update your dashboard components to use the new hooks
4. ✅ Test with real data
5. ✅ Add new features (fuel management, repairs, etc.)

## Troubleshooting

**Issue:** Data shows as empty  
**Solution:** Verify worksheets have headers in first row

**Issue:** "Sheet not found" error  
**Solution:** Check exact sheet name matches (case-sensitive)

**Issue:** Still getting old data  
**Solution:** Hard refresh browser (Ctrl+Shift+R), check deployment was updated

**Issue:** Can't append/update data  
**Solution:** Verify column names in payload match headers exactly

## File Structure

```
dg-dashboard/
├── GOOGLE_APPS_SCRIPT.gs          ← Deploy this to Google
├── ARCHITECTURE_GUIDE.md          ← Full documentation
├── SETUP.md                       ← This file
└── src/
    ├── api/
    │   ├── sheetAPI.js            ← Generic API functions
    │   └── googleSheets.js        ← Legacy (for compatibility)
    ├── hooks/
    │   └── useSheetData.js        ← All custom hooks
    ├── components/
    │   └── SummaryExample.jsx     ← Example component
    └── pages/
```

## Support

For detailed information, see:
- `ARCHITECTURE_GUIDE.md` - Complete architecture & design
- `src/api/sheetAPI.js` - Inline documentation
- `src/hooks/useSheetData.js` - Hook definitions
- `src/components/SummaryExample.jsx` - Component example

Good luck! 🚀
