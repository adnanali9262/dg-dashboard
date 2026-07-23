import {
  Upload,
  Fuel,
  Wrench,
  Activity,
  LayoutDashboard,
  Radio
} from "lucide-react";

const COLORS = {
  navy: "#0F2A47",
  navySoft: "#17385C",
  red: "#C6303E",
  onNavyDim: "#9FB0C3"
};

const NAV_ITEMS = [
  { key: "summary", label: "Summary of DGs", icon: LayoutDashboard },
  { key: "usage", label: "DG Usage", icon: Activity },
  { key: "fuel", label: "DG Fuel Balance", icon: Fuel },
  { key: "repair", label: "DG Repair History", icon: Wrench },
  { key: "upload", label: "Upload Files", icon: Upload },
];

function Logo() {
  return (
    <div style={{
      display:"flex",
      alignItems:"center",
      gap:10,
      marginBottom:26
    }}>
      <Radio color="white"/>
      <div>
        <div style={{color:"white",fontWeight:700}}>
          PTCL
        </div>
        <div style={{color:COLORS.onNavyDim,fontSize:10}}>
          DG Operations
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({active,onSelect}) {
  return (
    <div style={{
      width:220,
      background:COLORS.navy,
      padding:"22px 14px",
      minHeight:"100vh"
    }}>

      <Logo />

      {NAV_ITEMS.map(item=>{
        const Icon=item.icon;

        return (
          <button
            key={item.key}
            onClick={()=>onSelect(item.key)}
            style={{
              width:"100%",
              display:"flex",
              gap:10,
              alignItems:"center",
              padding:"10px 12px",
              marginBottom:5,
              cursor:"pointer",
              border:"none",
              borderRadius:8,
              background:
                active===item.key
                ? COLORS.navySoft
                :"transparent",
              color:"white"
            }}
          >
            <Icon size={16}/>
            {item.label}
          </button>
        )
      })}

    </div>
  );
}