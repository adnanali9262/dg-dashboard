import { COLORS } from "../styles/colors";

export default function StatCard({ icon: Icon, label, value, sub, tone="red" }) {

  const tint =
    tone === "red" ? COLORS.red :
    tone === "green" ? COLORS.green :
    tone === "blue" ? COLORS.blue :
    COLORS.navy;

  return (
    <div
      style={{
        background: COLORS.panel,
        border:`1px solid ${COLORS.panelEdge}`,
        borderRadius:10,
        padding:"14px 16px",
        display:"flex",
        alignItems:"center",
        gap:12,
        minWidth:150,
        flex:1
      }}
    >

      <div
        style={{
          width:34,
          height:34,
          borderRadius:8,
          background:`${tint}18`,
          display:"flex",
          alignItems:"center",
          justifyContent:"center"
        }}
      >
        <Icon size={18} color={tint}/>
      </div>


      <div>

        <div
          style={{
            fontSize:20,
            fontWeight:600,
            color:COLORS.text
          }}
        >
          {value}
        </div>

        <div
          style={{
            fontSize:11.5,
            color:COLORS.textDim
          }}
        >
          {label}
          {sub && ` · ${sub}`}
        </div>

      </div>

    </div>
  );
}