import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Gauge, Fuel, AlertTriangle, Check, Activity } from "lucide-react";
import StatCard from "./StatCard";
import Card from "./Card";
import CustomTooltip from "./CustomTooltip";
import { COLORS } from "../styles/colors";

export default function SummarySection({
  parsed,
  derived,
  sheetSummary,
  meterDerived,
  fuelBalanceDerived,
}) {
  const topSites = derived ? derived.totals.slice(0, 5) : [];

  return (
    <>
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard
          icon={Gauge}
          label="Total DGs"
          value={sheetSummary ? sheetSummary.totalSites : "—"}
          tone="navy"
        />

        <StatCard
          icon={Activity}
          label="Latest Daily Run Hours"
          value={meterDerived ? meterDerived.latestDailyHours.toFixed(2) : "—"}
          sub={meterDerived?.latestDate ? meterDerived.latestDate.toLocaleDateString("en-PK") : "Daily operation"}
          tone="red"
        />

        <StatCard
          icon={Activity}
          label="Total Run Hours This Month"
          value={meterDerived ? meterDerived.monthlyHours.toFixed(2) : "—"}
          sub="Monthly total"
          tone="blue"
        />

        <StatCard
          icon={Fuel}
          label="Total Fuel Available"
          value={fuelBalanceDerived ? fuelBalanceDerived.grandTotal.toFixed(2) : "—"}
          sub="All DGs (Litres)"
          tone="green"
        />

        <StatCard
          icon={Check}
          label="DG Sets Working"
          value={sheetSummary ? sheetSummary.workingDGs : "—"}
          tone="green"
        />

        <StatCard
          icon={AlertTriangle}
          label="DG Sets Faulty"
          value={sheetSummary ? sheetSummary.faultyDGCount : "—"}
          tone="red"
        />
      </div>

      {parsed && (
        <div className="dashboard-chart-grid">
          <Card title="Fleet-wide daily running hours" desc={`${parsed.monthLabel} — sum of all reporting sites`}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={derived.daily} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
                <YAxis tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<CustomTooltip unit="hrs" />} />
                <ReferenceLine y={0} stroke={COLORS.panelEdge} />
                <Line type="monotone" dataKey="totalHours" name="Total hrs" stroke={COLORS.red} strokeWidth={2.2} dot={{ r: 3, fill: COLORS.red, strokeWidth: 0 }} connectNulls>
                  <LabelList dataKey="totalHours" position="top" formatter={(value) => value ?? ""} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Top 5 sites by run hours" desc={parsed.monthLabel}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topSites} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
                <YAxis type="category" dataKey="name" width={200} tick={{ fill: COLORS.text, fontSize: 10.5, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip unit="hrs" />} />
                <Bar dataKey="total" name="Total hrs" fill={COLORS.navy} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  <LabelList dataKey="total" position="right" formatter={(value) => `${value}h`} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </>
  );
}
