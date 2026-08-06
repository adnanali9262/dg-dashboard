import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Gauge, Fuel, Activity, ClipboardList, CalendarDays } from "lucide-react";
import Card from "./Card";
import StatCard from "./StatCard";
import CustomTooltip from "./CustomTooltip";
import { COLORS } from "../styles/colors";

export default function UsageSection({
  meterDerived,
  selectedUsageTotal,
  selectedUsageLabel,
  selectedFuelConsumedTotal,
  selectedUsageData,
  usageDateOptions,
  selectedUsageDate,
  setSelectedUsageDate,
  fuelBalanceChartData,
  lowFuelSitesCount,
  lowFuelThreshold,
  setLowFuelThreshold,
  fuelBalanceLoading,
  fuelBalanceError,
  fuelBalanceDerived,
}) {
  return (
    <>
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard icon={Gauge} label="Sites reporting" value={meterDerived ? meterDerived.siteCount : "—"} tone="navy" />
        <StatCard icon={Activity} label="Selected date run hours" value={selectedUsageTotal.toFixed(2)} sub={selectedUsageLabel || "No date selected"} tone="red" />
        <StatCard icon={Fuel} label="Estimated fuel consumed" value={selectedFuelConsumedTotal.toFixed(2)} sub="Litres" tone="blue" />
        <StatCard icon={ClipboardList} label="DGs used on selected date" value={selectedUsageData.length} sub="" tone="green" />
        <StatCard icon={CalendarDays} label="Data available for days" value={usageDateOptions.length} tone="blue" />
      </div>

      <Card
        title="DG usage by site"
        desc=""
        style={{ marginBottom: 18 }}
        right={
          <select
            value={selectedUsageDate}
            onChange={(event) => setSelectedUsageDate(event.target.value)}
            style={{
              border: `1px solid ${COLORS.panelEdge}`,
              borderRadius: 8,
              padding: "8px 11px",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              color: COLORS.text,
              background: COLORS.panelSoft,
              minWidth: 150,
              boxShadow: "0 1px 0 rgba(16,36,62,0.03)",
            }}
          >
            {usageDateOptions.map((date) => (
              <option key={date} value={date}>
                {new Date(`${date}T00:00:00`).toLocaleDateString("en-PK", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </option>
            ))}
          </select>
        }
      >
        {usageDateOptions.length === 0 ? (
          <div style={{ padding: "34px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
            Meter reading data is loading.
          </div>
        ) : selectedUsageData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={selectedUsageData} barCategoryGap={8} margin={{ top: 8, right: 20, left: 0, bottom: 42 }}>
              <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" interval={0} tickFormatter={(value) => (String(value).length > 14 ? `${String(value).slice(0, 14)}...` : String(value))} height={42} tick={{ fill: COLORS.text, fontSize: 10.5, fontFamily: "IBM Plex Sans" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
              <YAxis type="number" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} width={44} />
              <Legend verticalAlign="top" align="left" iconType="circle" wrapperStyle={{ paddingBottom: 8, fontSize: 12, fontFamily: "'IBM Plex Sans', sans-serif" }} />
              <Tooltip content={<CustomTooltip tip="Sorted from highest usage to lowest for the selected date" />} />
              <Bar dataKey="hours" name="Run hours" fill={COLORS.red} radius={[4, 4, 0, 0]} isAnimationActive={false} barSize={16}>
                <LabelList dataKey="hours" position="top" formatter={(value) => `${value}h`} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
              </Bar>
              <Bar dataKey="perHourFuelConsumption" name="Fuel consumption" fill={COLORS.amber} radius={[4, 4, 0, 0]} isAnimationActive={false} barSize={16}>
                <LabelList dataKey="perHourFuelConsumption" position="top" formatter={(value) => `${value}L`} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
              </Bar>
              <Bar dataKey="fuelConsumed" name="Fuel consumed" fill={COLORS.blue} radius={[4, 4, 0, 0]} isAnimationActive={false} barSize={16}>
                <LabelList dataKey="fuelConsumed" position="top" formatter={(value) => `${value}L`} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ padding: "34px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
            No DG usage above zero for this date.
          </div>
        )}
      </Card>

      <Card
        title="Fuel Balance by site"
        desc={fuelBalanceChartData.length ? `${lowFuelSitesCount} low-fuel site${lowFuelSitesCount === 1 ? "" : "s"} at or below ${lowFuelThreshold} L` : ""}
        style={{ marginTop: 0, marginBottom: 0 }}
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 11.5, color: COLORS.textDim, fontWeight: 700 }}>Low fuel alarm</span>
            <input
              type="number"
              min="0"
              step="10"
              value={lowFuelThreshold}
              onChange={(event) => {
                const value = Number(event.target.value);
                setLowFuelThreshold(Number.isFinite(value) && value >= 0 ? value : 0);
              }}
              style={{
                width: 84,
                border: `1px solid ${COLORS.panelEdge}`,
                borderRadius: 8,
                padding: "6px 8px",
                fontSize: 12,
                color: COLORS.text,
                background: "#fff",
                fontFamily: "IBM Plex Mono",
              }}
            />
            <span style={{ fontSize: 11.5, color: COLORS.textDim, fontFamily: "IBM Plex Mono" }}>L</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: COLORS.red, display: "inline-block" }} />
              <span style={{ fontSize: 11.5, color: COLORS.textDim }}>Low</span>
            </div>
          </div>
        }
      >
        {fuelBalanceLoading ? (
          <div style={{ padding: "34px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
            Fuel balance data is loading from the Google Sheet.
          </div>
        ) : fuelBalanceError ? (
          <div style={{ padding: "34px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
            {fuelBalanceError}
          </div>
        ) : fuelBalanceDerived && fuelBalanceDerived.totals.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(320, fuelBalanceChartData.length * 30)}>
            <BarChart data={fuelBalanceChartData} layout="vertical" margin={{ top: 8, right: 56, left: 10, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
              <YAxis type="category" dataKey="name" width={280} interval={0} tick={{ fill: COLORS.text, fontSize: 10.5, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="L" />} />
              <ReferenceLine x={lowFuelThreshold} stroke={COLORS.red} strokeDasharray="5 4" />
              <Bar dataKey="fuelBalance" name="Fuel balance" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {fuelBalanceChartData.map((entry) => (
                  <Cell key={`fuel-balance-cell-${entry.name}`} fill={entry.isLowFuel ? COLORS.red : COLORS.blue} />
                ))}
                <LabelList dataKey="fuelBalance" position="right" formatter={(value) => `${value}L`} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ padding: "34px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
            No Fuel Balance sheet data found. The deployed Apps Script is currently returning Daily Meter Reading rows for this request.
          </div>
        )}
      </Card>
    </>
  );
}
