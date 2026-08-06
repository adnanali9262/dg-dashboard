import React from "react";
import Card from "./Card";
import { COLORS } from "../styles/colors";
import { PMR_CATEGORY_BUCKETS, getPmDateStatus, formatPmDate } from "../utils/dashboardUtils";

export default function PmrSection({
  pmrLoading,
  pmrError,
  pmrSiteNames,
  thresholdCategories,
  updateThresholdValue,
  pmrSummary,
  categoryStatusSummaries,
  expandedExecutives,
  executiveSummaries,
  executiveCategoryStatusSummaries,
  toggleExecutive,
  getThresholdValue,
}) {
  return (
    <Card
      title="PMR tracking sites"
      desc="PMR sites grouped by executive and category"
      style={{ marginBottom: 0, background: "linear-gradient(135deg, #f9fbff 0%, #f3f7ff 100%)" }}
    >
      {pmrLoading ? (
        <div style={{ padding: "34px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
          Loading PMR tracking data from Google Sheets...
        </div>
      ) : pmrError ? (
        <div style={{ padding: "34px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
          {pmrError}
        </div>
      ) : pmrSiteNames.length > 0 ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ border: `1px solid ${COLORS.panelEdge}`, borderRadius: 14, background: "#ffffff", boxShadow: "0 6px 18px rgba(16,36,62,0.05)", padding: 12, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: COLORS.navy, textTransform: "uppercase", letterSpacing: 0.6, padding: "2px 2px 0" }}>
                Bahawalpur Rural
              </div>
              <div style={{ padding: "7px 8px", borderRadius: 10, background: "#fcfdff", border: `1px solid ${COLORS.panelEdge}`, display: "grid", gap: 6, minWidth: 240 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Thresholds (Days)
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {thresholdCategories.map((item) => (
                    <label key={`threshold-${item.category}`} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: COLORS.textDim, padding: "4px 6px", borderRadius: 8, border: `1px solid ${COLORS.panelEdge}`, background: "#ffffff" }}>
                      <span style={{ fontWeight: 700, color: COLORS.navy }}>{item.category}</span>
                      <input
                        type="number"
                        min="0"
                        max="90"
                        step="1"
                        value={item.value}
                        onChange={(event) => updateThresholdValue(item.category, event.target.value)}
                        style={{ width: 44, border: `1px solid ${COLORS.panelEdge}`, borderRadius: 6, padding: "3px 5px", fontSize: 10.5, color: COLORS.text, background: "#ffffff" }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
              {[
                { key: "done", label: "Done", total: pmrSummary.done, titleColor: "#0f5132", cardBg: "#f3fbf6", edge: "#bee7cd", cellBg: "#e8f7ee" },
                { key: "pending", label: "Pending", total: pmrSummary.pending, titleColor: "#8a1c3a", cardBg: "#fff5f8", edge: "#f0bfd0", cellBg: "#ffeaf0" },
                { key: "overdue", label: "Overdue", total: pmrSummary.overdue, titleColor: "#7a3e00", cardBg: "#fff8ef", edge: "#f0d1a8", cellBg: "#fff0db" },
                { key: "totalSites", label: "Total Sites", total: pmrSummary.done + pmrSummary.pending + pmrSummary.overdue, titleColor: "#143f75", cardBg: "#f2f7ff", edge: "#b9d3f4", cellBg: "#e8f1ff" },
              ].map((statusCard) => (
                <div
                  key={statusCard.key}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: statusCard.cardBg,
                    border: `1px solid ${statusCard.edge}`,
                    boxShadow: "0 4px 12px rgba(16,36,62,0.05)",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: statusCard.titleColor, textTransform: "uppercase", letterSpacing: 0.4 }}>
                      {statusCard.label}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: statusCard.titleColor, lineHeight: 1 }}>
                      {statusCard.total}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
                    {categoryStatusSummaries.map((item) => (
                      <div
                        key={`${statusCard.key}-${item.category}`}
                        style={{
                          background: statusCard.cellBg,
                          border: `1px solid ${statusCard.edge}`,
                          borderRadius: 8,
                          padding: "6px 7px",
                          display: "grid",
                          gap: 3,
                        }}
                      >
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: statusCard.titleColor, textTransform: "uppercase", letterSpacing: 0.2 }}>
                          {item.category}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: statusCard.titleColor, lineHeight: 1 }}>
                          {statusCard.key === "totalSites"
                            ? item.done + item.pending + item.overdue
                            : item[statusCard.key]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {pmrSiteNames.map((group) => {
            const isExpanded = expandedExecutives[group.executive] === true;
            const executiveSummary = executiveSummaries.find((item) => item.executive === group.executive) || { done: 0, pending: 0, overdue: 0 };
            const executiveCategorySummaries = executiveCategoryStatusSummaries.get(group.executive) || PMR_CATEGORY_BUCKETS.map((item) => ({ category: item.label, done: 0, pending: 0, overdue: 0 }));
            return (
              <div key={group.executive} style={{ display: "grid", gap: 10 }}>
                <div style={{ border: `1px solid ${COLORS.panelEdge}`, borderRadius: 12, background: "#ffffff", boxShadow: "0 6px 18px rgba(16,36,62,0.06)", padding: 10, display: "grid", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => toggleExecutive(group.executive)}
                    style={{
                      padding: "4px 4px 2px",
                      borderRadius: 8,
                      background: "transparent",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: COLORS.navy }}>
                        {`Executive: ${group.executive}`}
                      </div>
                    </div>
                    <div style={{ fontSize: 16, color: COLORS.navy, fontWeight: 700 }}>
                      {isExpanded ? "▾" : "▸"}
                    </div>
                  </button>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
                    {[
                      { key: "done", label: "Done", total: executiveSummary.done, titleColor: "#0f5132", cardBg: "#f3fbf6", edge: "#bee7cd", cellBg: "#e8f7ee" },
                      { key: "pending", label: "Pending", total: executiveSummary.pending, titleColor: "#8a1c3a", cardBg: "#fff5f8", edge: "#f0bfd0", cellBg: "#ffeaf0" },
                      { key: "overdue", label: "Overdue", total: executiveSummary.overdue, titleColor: "#7a3e00", cardBg: "#fff8ef", edge: "#f0d1a8", cellBg: "#fff0db" },
                      { key: "totalSites", label: "Total Sites", total: executiveSummary.done + executiveSummary.pending + executiveSummary.overdue, titleColor: "#143f75", cardBg: "#f2f7ff", edge: "#b9d3f4", cellBg: "#e8f1ff" },
                    ].map((statusCard) => (
                      <div
                        key={`${group.executive}-${statusCard.key}`}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          background: statusCard.cardBg,
                          border: `1px solid ${statusCard.edge}`,
                          boxShadow: "0 4px 12px rgba(16,36,62,0.05)",
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: statusCard.titleColor, textTransform: "uppercase", letterSpacing: 0.4 }}>
                            {statusCard.label}
                          </div>
                          <div style={{ fontSize: 22, fontWeight: 900, color: statusCard.titleColor, lineHeight: 1 }}>
                            {statusCard.total}
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
                          {executiveCategorySummaries.map((item) => (
                            <div
                              key={`${group.executive}-${statusCard.key}-${item.category}`}
                              style={{
                                background: statusCard.cellBg,
                                border: `1px solid ${statusCard.edge}`,
                                borderRadius: 8,
                                padding: "6px 7px",
                                display: "grid",
                                gap: 3,
                              }}
                            >
                              <div style={{ fontSize: 9.5, fontWeight: 700, color: statusCard.titleColor, textTransform: "uppercase", letterSpacing: 0.2 }}>
                                {item.category}
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 900, color: statusCard.titleColor, lineHeight: 1 }}>
                                {statusCard.key === "totalSites"
                                  ? item.done + item.pending + item.overdue
                                  : item[statusCard.key]}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {group.categories.map((categoryGroup) => {
                      const thresholdValue = getThresholdValue(categoryGroup.category);
                      const pendingCount = categoryGroup.sites.filter((entry) => !entry.pmDate).length;
                      const overdueCount = categoryGroup.sites.filter((entry) => {
                        const status = getPmDateStatus(entry.pmDate, thresholdValue);
                        return status.state === "overdue" || status.state === "pending";
                      }).length;
                      return (
                        <div key={categoryGroup.category} style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 250, flex: 1, padding: "12px", borderRadius: 14, background: "#ffffff", border: `1px solid ${COLORS.panelEdge}`, boxShadow: "0 4px 14px rgba(16,36,62,0.05)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 800, color: COLORS.navy, textTransform: "uppercase", letterSpacing: 0.4 }}>
                              {categoryGroup.category} ({categoryGroup.sites.length})
                            </div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "6px 0 2px", borderBottom: `1px solid ${COLORS.panelEdge}` }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#b23a5a" }}>Pending: {pendingCount}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.navy }}>Overdue: {overdueCount}</span>
                          </div>
                          <div style={{ display: "grid", gap: 8, marginTop: 2 }}>
                            {categoryGroup.sites.map((entry) => {
                              const statusStyle = getPmDateStatus(entry.pmDate, thresholdValue);
                              return (
                                <div
                                  key={entry.name}
                                  style={{
                                    padding: "10px 12px",
                                    borderRadius: 10,
                                    border: `1px solid ${COLORS.panelEdge}`,
                                    background: statusStyle.bg,
                                    color: COLORS.text,
                                    fontWeight: 700,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 10,
                                    alignItems: "center",
                                    boxShadow: "0 2px 8px rgba(16,36,62,0.03)",
                                  }}
                                >
                                  <span style={{ fontSize: 13 }}>{entry.name}</span>
                                  <span style={{ color: COLORS.textDim, fontSize: 11.5, fontWeight: 600 }}>
                                    {formatPmDate(entry.pmDate)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: "34px 0", textAlign: "center", color: COLORS.textDim, fontSize: 12.5 }}>
          No PMR site names were returned from the Google Sheet.
        </div>
      )}
    </Card>
  );
}
