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
} from "recharts";
import { ClipboardList, Activity } from "lucide-react";
import Card from "./Card";
import StatCard from "./StatCard";
import CustomTooltip from "./CustomTooltip";
import { COLORS } from "../styles/colors";
import { round2, shortLabel } from "../utils/dashboardUtils";

export default function PortableSection({
  portableSummary,
  msagLoading,
  msagError,
  portableByMSAG,
  portableByGenerator,
  portableTimelineRows,
  generatorColorMap,
}) {
  return (
    <>
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard
          icon={ClipboardList}
          label="PG Sites / Deployments"
          value={portableSummary.siteCount}
          sub={`${portableSummary.deploymentCount} deployments | ${portableSummary.monthLabel}`}
          tone="navy"
        />
        <StatCard icon={Activity} label="Total Fuel Consumed" value={portableSummary.fuelConsumed.toFixed(2)} sub="Litres" tone="blue" />
      </div>

      <Card title="MSAG-wise usage and fuel" desc="Highest to lowest by usage hours" style={{ marginBottom: 18 }}>
        {msagLoading ? (
          <div style={{ padding: "28px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>Loading MSAG Monthly data...</div>
        ) : msagError ? (
          <div style={{ padding: "28px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>{msagError}</div>
        ) : portableByMSAG.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(340, portableByMSAG.length * 26)}>
            <BarChart data={portableByMSAG} layout="vertical" margin={{ top: 8, right: 24, left: 10, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
              <YAxis type="category" dataKey="name" width={320} tickFormatter={(value) => shortLabel(value, 42)} tick={{ fill: COLORS.text, fontSize: 10.5, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} interval={0} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="left" wrapperStyle={{ paddingBottom: 8, fontSize: 12, fontFamily: "IBM Plex Sans" }} />
              <Bar dataKey="usageHours" name="Usage Hours" fill={COLORS.red} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                <LabelList dataKey="usageHours" position="right" formatter={(value) => `${round2(value)}h`} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
              </Bar>
              <Bar dataKey="fuelConsumption" name="Fuel Consumption (L)" fill={COLORS.blue} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                <LabelList dataKey="fuelConsumption" position="right" formatter={(value) => `${round2(value)}L`} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ padding: "28px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>No MSAG Monthly records found.</div>
        )}
      </Card>

      <Card title="Generator-wise usage and fuel" desc="Highest to lowest by usage hours" style={{ marginBottom: 18 }}>
        {portableByGenerator.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(280, portableByGenerator.length * 34)}>
            <BarChart data={portableByGenerator} layout="vertical" margin={{ top: 8, right: 24, left: 10, bottom: 0 }}>
              <CartesianGrid stroke={COLORS.panelEdge} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fill: COLORS.textDim, fontSize: 11, fontFamily: "IBM Plex Mono" }} axisLine={{ stroke: COLORS.panelEdge }} tickLine={false} />
              <YAxis type="category" dataKey="name" width={200} tick={{ fill: COLORS.text, fontSize: 11, fontFamily: "IBM Plex Sans" }} axisLine={false} tickLine={false} interval={0} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="left" wrapperStyle={{ paddingBottom: 8, fontSize: 12, fontFamily: "IBM Plex Sans" }} />
              <Bar dataKey="usageHours" name="Usage Hours" fill={COLORS.red} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                <LabelList dataKey="usageHours" position="right" formatter={(value) => `${round2(value)}h`} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
              </Bar>
              <Bar dataKey="fuelConsumption" name="Fuel Consumption (L)" fill={COLORS.blue} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                <LabelList dataKey="fuelConsumption" position="right" formatter={(value) => `${round2(value)}L`} style={{ fill: COLORS.text, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ padding: "28px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>No generator data found.</div>
        )}
      </Card>

      <Card title="Site vs Generator (Gantt-style)" desc="Runs mapped on day-of-month timeline" style={{ marginBottom: 0 }}>
        {portableTimelineRows.length > 0 ? (
          <div
            style={{
              borderRadius: 12,
              background: COLORS.panel,
              border: `1px solid ${COLORS.panelEdge}`,
              padding: "12px 14px",
              overflowX: "auto",
            }}
          >
            <div style={{ minWidth: 720 }}>
              <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", alignItems: "center", marginBottom: 8 }}>
                <div />
                <div style={{ position: "relative", height: 20 }}>
                  {[1, 10, 20, 31].map((day) => (
                    <span
                      key={`day-label-${day}`}
                      style={{
                        position: "absolute",
                        left: `${((day - 1) / 30) * 100}%`,
                        transform: "translateX(-50%)",
                        top: 0,
                        color: COLORS.textDim,
                        fontSize: 11,
                        fontFamily: "IBM Plex Mono",
                      }}
                    >
                      {day}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gap: 0 }}>
                {portableTimelineRows.map((row) => (
                  <div key={`timeline-${row.site}-${row.generator}`} style={{ display: "grid", gridTemplateColumns: "150px 1fr", alignItems: "center", minHeight: 50 }}>
                    <div style={{ color: COLORS.text, fontSize: 12.5, fontWeight: 600, paddingRight: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={row.label}>
                      {row.label}
                    </div>
                    <div style={{ position: "relative", height: 48, borderTop: `1px solid ${COLORS.panelEdge}`, borderBottom: `1px solid ${COLORS.panelEdge}` }}>
                      {row.points.map((point, index) => (
                        <span
                          key={`marker-${row.site}-${row.generator}-${point.day}-${index}`}
                          title={`${row.label} | Day ${point.day} | Usage ${point.usageHours}h | Fuel ${point.fuelConsumption}L`}
                          style={{
                            position: "absolute",
                            left: `${((point.day - 1) / 30) * 100}%`,
                            top: "50%",
                            transform: "translate(-50%, -50%)",
                            width: point.widthPx,
                            height: 14,
                            borderRadius: 2,
                            background: generatorColorMap.get(row.generator) || COLORS.blue,
                            boxShadow: "0 0 0 1px rgba(16,36,62,0.08) inset",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: "28px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>No site-generator usage data found.</div>
        )}
      </Card>
    </>
  );
}
