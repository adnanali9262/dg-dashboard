/**
 * Example: Updated DG Summary Component Using Multi-Sheet Architecture
 * 
 * This shows how to use the new generic sheet API and hooks
 */

import React, { useMemo } from "react";
import { useDailyMeterReadings, useDGDetails } from "../hooks/useSheetData";
import { Gauge, Activity, Fuel, AlertTriangle, Check, Wrench } from "lucide-react";
import StatCard from "./StatCard";
import Card from "./Card";
import { COLORS } from "../styles/colors";

export default function SummarySection() {
  // Load data from sheets
  const { data: meterReadings, loading: meterLoading, error: meterError } = useDailyMeterReadings();
  const { data: dgDetails, loading: dgLoading, error: dgError } = useDGDetails();

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (!meterReadings.length || !dgDetails.length) return null;

    // Total DGs count
    const totalDGs = dgDetails.length;

    // Count DGs by status
    const workingDGs = dgDetails.filter((dg) =>
      /working|active|operational/i.test(dg.Status || "")
    ).length;
    const faultyDGs = dgDetails.filter((dg) =>
      /faulty|down|offline/i.test(dg.Status || "")
    ).length;

    // Calculate run hours
    const latestReadings = {};
    meterReadings.forEach((reading) => {
      const site = reading.Site;
      if (!latestReadings[site] || new Date(reading.Date) > new Date(latestReadings[site].Date)) {
        latestReadings[site] = reading;
      }
    });

    const totalRunHours = Object.values(latestReadings).reduce(
      (sum, reading) => sum + (Number(reading.Daily_Run_Hours) || 0),
      0
    );

    // Calculate fuel available
    const totalFuel = Object.values(latestReadings).reduce(
      (sum, reading) => sum + (Number(reading.Fuel_Available) || 0),
      0
    );

    // Engine summary
    const engineSummary = {};
    dgDetails.forEach((dg) => {
      const engine = dg.Engine || "Unknown";
      engineSummary[engine] = (engineSummary[engine] || 0) + 1;
    });
    const topEngine = Object.entries(engineSummary).sort((a, b) => b[1] - a[1])[0] || ["Unknown", 0];

    // Capacity summary
    const capacityGroups = {};
    dgDetails.forEach((dg) => {
      const capacity = dg.Capacity_KVA || "Unknown";
      capacityGroups[capacity] = (capacityGroups[capacity] || 0) + 1;
    });

    return {
      totalDGs,
      workingDGs,
      faultyDGs,
      totalRunHours: Math.round(totalRunHours * 10) / 10,
      totalFuel: Math.round(totalFuel * 10) / 10,
      topEngine: topEngine[0],
      topEngineCount: topEngine[1],
      capacityGroups,
    };
  }, [meterReadings, dgDetails]);

  if (meterLoading || dgLoading) {
    return <div style={{ padding: "20px", textAlign: "center" }}>Loading dashboard data...</div>;
  }

  if (meterError || dgError) {
    return (
      <div style={{ padding: "20px", color: "red" }}>
        Error loading data: {meterError || dgError}
      </div>
    );
  }

  if (!summary) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: COLORS.textDim }}>
        No data available. Please upload data to Google Sheets.
      </div>
    );
  }

  return (
    <>
      {/* Summary Stats Row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        <StatCard
          icon={Gauge}
          label="Total DGs"
          value={summary.totalDGs}
          tone="navy"
        />

        <StatCard
          icon={Activity}
          label="Total Run Hours"
          value={summary.totalRunHours.toFixed(2)}
          sub="All DGs"
          tone="red"
        />

        <StatCard
          icon={Fuel}
          label="Total Fuel Available"
          value={summary.totalFuel.toFixed(2)}
          sub="Litres"
          tone="blue"
        />

        <StatCard
          icon={Check}
          label="DG Sets Working"
          value={summary.workingDGs}
          tone="green"
        />

        <StatCard
          icon={AlertTriangle}
          label="DG Sets Faulty"
          value={summary.faultyDGs}
          tone="red"
        />

        <StatCard
          icon={Wrench}
          label="Top Engine"
          value={summary.topEngine}
          sub={`${summary.topEngineCount} units`}
          tone="blue"
        />
      </div>

      {/* Charts Row */}
      <Card title="Fleet-wide Statistics" desc="Overall DG fleet summary">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Status Breakdown */}
          <div>
            <h4 style={{ marginTop: 0, marginBottom: 12, color: COLORS.text }}>Status Breakdown</h4>
            <div style={{ fontSize: 14 }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: COLORS.green, fontWeight: 600 }}>●</span> Working: {summary.workingDGs}
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: COLORS.red, fontWeight: 600 }}>●</span> Faulty: {summary.faultyDGs}
              </div>
              <div>
                <span style={{ color: COLORS.textDim, fontWeight: 600 }}>●</span> Total: {summary.totalDGs}
              </div>
            </div>
          </div>

          {/* Capacity Breakdown */}
          <div>
            <h4 style={{ marginTop: 0, marginBottom: 12, color: COLORS.text }}>Capacity Distribution</h4>
            <div style={{ fontSize: 14 }}>
              {Object.entries(summary.capacityGroups)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([capacity, count]) => (
                  <div key={capacity} style={{ marginBottom: 6 }}>
                    {capacity} KVA: <strong>{count}</strong>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
