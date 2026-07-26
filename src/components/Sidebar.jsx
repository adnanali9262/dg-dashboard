import {
  Wrench,
  Activity,
  LayoutDashboard,
} from "lucide-react";
import { COLORS } from "../styles/colors";

const NAV_ITEMS = [
  { key: "summary", label: "Summary of DGs", icon: LayoutDashboard },
  { key: "usage", label: "DG Usage and Fuel Balance", icon: Activity },
  { key: "repair", label: "DG Repair History", icon: Wrench },
];

function Logo() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 4px 22px",
        marginBottom: 14,
        borderBottom: `1px solid ${COLORS.panelEdge}`,
      }}
    >
      <img
        src="/ptcl-logo.png"
        alt="PTCL"
        style={{
          display: "block",
          width: "100%",
          maxWidth: 178,
          height: "auto",
          objectFit: "contain",
        }}
      />
    </div>
  );
}

export default function Sidebar({ active, onSelect }) {
  return (
    <aside
      style={{
        width: 248,
        background: `linear-gradient(180deg, #FFFFFF 0%, ${COLORS.panelSoft} 100%)`,
        borderRight: `1px solid ${COLORS.panelEdge}`,
        padding: "22px 16px",
        minHeight: "100vh",
        boxSizing: "border-box",
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        boxShadow: "6px 0 22px rgba(16,36,62,0.05)",
      }}
    >
      <Logo />

      <nav style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;

          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              style={{
                width: "100%",
                display: "flex",
                gap: 10,
                alignItems: "center",
                padding: "11px 12px",
                cursor: "pointer",
                border: `1px solid ${isActive ? COLORS.panelEdge : "transparent"}`,
                borderRadius: 8,
                background: isActive ? COLORS.blueSoft : "transparent",
                color: isActive ? COLORS.navy : COLORS.textDim,
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                textAlign: "left",
                boxShadow: isActive ? `inset 3px 0 0 ${COLORS.blue}` : "none",
              }}
            >
              <Icon size={16} />
              <span style={{ lineHeight: 1.25 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
