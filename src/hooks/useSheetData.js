/**
 * Custom React Hooks for Google Sheets Data Management
 * 
 * Provides reusable hooks to fetch, cache, and manage data from any worksheet
 */

import { useState, useCallback, useEffect } from "react";
import { fetchSheetData, appendSheetRow, updateSheetRow } from "../api/sheetAPI";

/**
 * Generic hook to manage sheet data
 * @param {string} sheetName - Name of the worksheet
 * @param {boolean} autoLoad - Whether to load data on mount
 * @returns {Object} - { data, loading, error, refresh, append, update }
 */
export function useSheetData(sheetName, autoLoad = true) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSheetData(sheetName);
      setData(result);
    } catch (err) {
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [sheetName]);

  const append = useCallback(
    async (rowData) => {
      try {
        await appendSheetRow(sheetName, rowData);
        await refresh();
        return { success: true };
      } catch (err) {
        setError(err.message);
        return { success: false, error: err.message };
      }
    },
    [sheetName, refresh]
  );

  const update = useCallback(
    async (id, updateData) => {
      try {
        await updateSheetRow(sheetName, id, updateData);
        await refresh();
        return { success: true };
      } catch (err) {
        setError(err.message);
        return { success: false, error: err.message };
      }
    },
    [sheetName, refresh]
  );

  useEffect(() => {
    if (autoLoad) {
      refresh();
    }
  }, [sheetName, autoLoad, refresh]);

  return { data, loading, error, refresh, append, update };
}

/**
 * Hook to manage multiple sheets at once
 * @param {Array<string>} sheetNames - Array of sheet names to load
 * @returns {Object} - { sheets, loading, error, refresh }
 */
export function useMultipleSheets(sheetNames) {
  const [sheets, setSheets] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = {};
      for (const sheetName of sheetNames) {
        results[sheetName] = await fetchSheetData(sheetName);
      }
      setSheets(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sheetNames]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sheets, loading, error, refresh };
}

/**
 * Hook for Daily Meter Readings sheet
 */
export function useDailyMeterReadings(autoLoad = true) {
  return useSheetData("Daily_Meter_Reading", autoLoad);
}

/**
 * Hook for Fuel Filling sheet
 */
export function useFuelFilling(autoLoad = true) {
  return useSheetData("Fuel_Filling", autoLoad);
}

/**
 * Hook for Repairs sheet
 */
export function useRepairs(autoLoad = true) {
  return useSheetData("Repairs", autoLoad);
}

/**
 * Hook for DG Details sheet
 */
export function useDGDetails(autoLoad = true) {
  return useSheetData("DG_Details", autoLoad);
}

/**
 * Hook for Monthly Report sheet
 */
export function useMonthlyReport(autoLoad = true) {
  return useSheetData("Monthly_Report", autoLoad);
}

/**
 * Hook for PM Schedule sheet
 */
export function usePMSchedule(autoLoad = true) {
  return useSheetData("PM_Schedule", autoLoad);
}

/**
 * Hook for Engineers sheet
 */
export function useEngineers(autoLoad = true) {
  return useSheetData("Engineers", autoLoad);
}

/**
 * Hook for Settings sheet
 */
export function useSettings(autoLoad = true) {
  return useSheetData("Settings", autoLoad);
}
