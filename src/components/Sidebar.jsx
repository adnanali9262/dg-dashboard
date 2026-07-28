import {
  Wrench,
  Activity,
  LayoutDashboard,
  ClipboardList,
  Zap,
  Droplets,
  FileSpreadsheet,
  Mail,
} from "lucide-react";
import { COLORS } from "../styles/colors";
import ptclLogo from "../assets/ptcl-logo.png";

const NAV_ITEMS = [
  { key: "summary", label: "Summary of DGs", icon: LayoutDashboard },
  { key: "usage", label: "DG Usage and Fuel Balance", icon: Activity },
  { key: "pmr", label: "PMR Tracking", icon: ClipboardList },
  { key: "electricity", label: "Electricity Performance", icon: Zap },
  { key: "fuelperf", label: "Fuel Performance", icon: Droplets },
  { key: "repair", label: "DG Repair History", icon: Wrench },
  { key: "sheets", label: "Google Sheets", icon: FileSpreadsheet },
  { key: "contact", label: "Contact", icon: Mail },
];

function Logo() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 4px 20px",
        marginBottom: 14,
        borderBottom: `1px solid ${COLORS.panelEdge}`,
      }}
    >
      <div style={{ width: "100%", maxWidth: 190 }}>
        <img
          src={ptclLogo}
          alt="CO/FO Field Operations Dashboard"
          style={{
            display: "block",
            width: "100%",
            height: 58,
            objectFit: "contain",
          }}
        />
        <div
          style={{
            marginTop: 8,
            color: COLORS.navy,
            fontSize: 14,
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: 0,
            textAlign: "center",
          }}
        >
          CO/FO Bahawalpur Rural
        </div>
      </div>
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
