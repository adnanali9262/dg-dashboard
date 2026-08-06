import React from "react";
import {
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
import { Fuel, Activity, ArrowUpRight, ArrowDownRight, RotateCcw } from "lucide-react";
import Card from "./Card";
import StatCard from "./StatCard";
import CustomTooltip from "./CustomTooltip";
import { COLORS } from "../styles/colors";
import { round2 } from "../utils/dashboardUtils";

export default function FuelPerformanceSection({
  selectedFuelSite,
  fuelSummary,
  fuelSiteTypeCounts,
  resetFuelFilters,
  selectedFuelManager,
  setSelectedFuelManager,
  fuelManagerOptions,
  selectedFuelExecutive,
  setSelectedFuelExecutive,
  fuelExecutiveOptions,
  selectedFuelMonth,
  setSelectedFuelMonth,
  fuelMonthOptions,
  selectedFuelSiteType,
  setSelectedFuelSiteType,
  fuelSiteTypeOptions,
  selectedFuelSiteValue,
  setSelectedFuelSite,
  fuelSiteOptions,
  topIncreasedFuelSites,
  topDecreasedFuelSites,
}) {
  return (
    <>
      <div className="electricity-layout">
        <div>
          <div className="electricity-topbar">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {selectedFuelSite !== "All" && (
                <div style={{ border: `1px solid ${COLORS.panelEdge}`, borderRadius: 999, background: "rgba(255,255,255,0.88)", padding: "6px 10px", fontSize: 11.5, color: COLORS.blue, fontWeight: 700, boxShadow: COLORS.shadowSoft }}>
                  Site: {selectedFuelSite}
                </div>
              )}
            </div>
          </div>

          <div className="electricity-shell" style={{ marginTop: 8 }}>
            <div style={{ display: "grid", gap: 10, minWidth: 0, marginTop: -2 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
                <StatCard icon={Fuel} label="Fuel 2025" value={Math.round(fuelSummary.fuel2025).toLocaleString("en-US")} tone="navy" compact />
                <StatCard icon={Fuel} label="Fuel 2026" value={Math.round(fuelSummary.fuel2026).toLocaleString("en-US")} tone="blue" compact />
                <StatCard
                  icon={fuelSummary.fuelDelta >= 0 ? ArrowDownRight : ArrowUpRight}
                  label="Inc/Dec Fuel"
                  value={`${fuelSummary.fuelDelta >= 0 ? "↓" : "↑"} ${Math.round(fuelSummary.fuelDelta).toLocaleString("en-US")}`}
                  sub={fuelSummary.fuelDelta >= 0 ? "Decrease (Good)" : "Increase (Bad)"}
                  tone={fuelSummary.fuelDelta >= 0 ? "green" : "red"}
                  valueColor={fuelSummary.fuelDelta >= 0 ? COLORS.green : COLORS.red}
                  compact
                />
                <StatCard
                  icon={fuelSummary.fuelDeltaPercent === null ? Activity : fuelSummary.fuelDeltaPercent >= 0 ? ArrowDownRight : ArrowUpRight}
                  label="Inc/Dec %"
                  value={fuelSummary.fuelDeltaPercent === null
                    ? "—"
                    : `${fuelSummary.fuelDeltaPercent >= 0 ? "↓" : "↑"} ${round2(fuelSummary.fuelDeltaPercent).toFixed(2)}%`}
                  sub={fuelSummary.fuelDeltaPercent === null ? "No 2025 baseline" : fuelSummary.fuelDeltaPercent >= 0 ? "Decrease (Good)" : "Increase (Bad)"}
                  tone={fuelSummary.fuelDeltaPercent === null
                    ? "navy"
                    : fuelSummary.fuelDeltaPercent >= 0
                      ? "green"
                      : "red"}
                  valueColor={fuelSummary.fuelDeltaPercent === null
                    ? COLORS.text
                    : fuelSummary.fuelDeltaPercent >= 0
                      ? COLORS.green
                      : COLORS.red}
                  compact
                />
              </div>
            </div>

            <aside className="electricity-panel" style={{ border: `1px solid ${COLORS.panelEdge}`, borderRadius: 14, background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(245,249,255,0.96) 100%)", padding: 8, boxShadow: "0 6px 14px rgba(16,36,62,0.05)", display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", whiteSpace: "nowrap", scrollbarWidth: "thin" }}>
                    {fuelSiteTypeCounts.length > 0 ? fuelSiteTypeCounts.map((item) => (
                      <div key={`fuel-site-type-inline-${item.siteType}`} style={{ border: `1px solid ${COLORS.panelEdge}`, borderRadius: 999, padding: "2px 8px", background: COLORS.panelSoft, display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: COLORS.navy }}>{item.siteType}</span>
                        <span style={{ fontSize: 10.5, fontWeight: 900, color: COLORS.blue, fontFamily: "IBM Plex Mono" }}>{item.count}</span>
                      </div>
                    )) : (
                      <span style={{ fontSize: 10.5, color: COLORS.textDim }}>No site types</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 900, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 0.45, whiteSpace: "nowrap" }}>
                    Filters
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetFuelFilters}
                  title="Reset all filters"
                  aria-label="Reset all filters"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: `1px solid ${COLORS.blueSoft}`,
                    background: "linear-gradient(180deg, #eff5ff 0%, #e2ecfb 100%)",
                    color: COLORS.navy,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: COLORS.shadowSoft,
                    padding: 0,
                  }}
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 140px))", justifyContent: "start", gap: 6 }}>
                {[
                  { label: "Manager", value: selectedFuelManager, onChange: setSelectedFuelManager, options: fuelManagerOptions },
                  { label: "Executive", value: selectedFuelExecutive, onChange: setSelectedFuelExecutive, options: fuelExecutiveOptions },
                  { label: "Month", value: selectedFuelMonth, onChange: setSelectedFuelMonth, options: fuelMonthOptions },
                  { label: "Site Type", value: selectedFuelSiteType, onChange: setSelectedFuelSiteType, options: fuelSiteTypeOptions },
                  { label: "Site", value: selectedFuelSiteValue, onChange: setSelectedFuelSite, options: fuelSiteOptions },
                ].map((filter) => (
                  <label key={filter.label} style={{ display: "grid", gap: 3, fontSize: 10.5, color: COLORS.textDim }}>
                    <span style={{ fontWeight: 700, color: COLORS.navy, lineHeight: 1 }}>{filter.label}</span>
                    <select
                      value={filter.value}
                      onChange={(event) => filter.onChange(event.target.value)}
                      style={{ border: `1px solid ${COLORS.panelEdge}`, borderRadius: 8, padding: "1px 8px", minHeight: 24, fontSize: 11.5, color: COLORS.text, background: "#ffffff", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)" }}
                    >
                      {filter.options.map((option) => (
                        <option key={`${filter.label.toLowerCase()}-${option}`} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>

            </aside>
          </div>
        </div>

        <div className="electricity-chart-grid">
          <Card title="Top 10 Sites - Increased Fuel (Bad)" desc="Month-paired comparison (2025 - 2026): negatives show increases">
            {topIncreasedFuelSites.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(260, topIncreasedFuelSites.length * 26)}>
                <BarChart data={topIncreasedFuelSites} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={180} tick={{ fill: COLORS.text, fontSize: 10.5, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
                  <ReferenceLine x={0} stroke={COLORS.panelEdge} />
                  <Tooltip content={<CustomTooltip unit="L" />} />
                  <Bar dataKey="fuel" name="Increase (Bad)" fill={COLORS.red} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="fuel" position="right" formatter={(value) => `${value}`} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding: "24px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
                No site fuel increases found for current filters.
              </div>
            )}
          </Card>

          <Card title="Top 10 Sites - Decreased Fuel (Good)" desc="Month-paired comparison (2025 - 2026): positives show decreases">
            {topDecreasedFuelSites.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(260, topDecreasedFuelSites.length * 26)}>
                <BarChart data={topDecreasedFuelSites} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={180} tick={{ fill: COLORS.text, fontSize: 10.5, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} />
                  <ReferenceLine x={0} stroke={COLORS.panelEdge} />
                  <Tooltip content={<CustomTooltip unit="L" />} />
                  <Bar dataKey="fuel" name="Decrease (Good)" fill={COLORS.green} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="fuel" position="right" formatter={(value) => `${value}`} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding: "24px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
                No site fuel decreases found for current filters.
              </div>
            )}
          </Card>
        </div>

      </div>
    </>
  );
}
