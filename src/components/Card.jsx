import { COLORS } from "../styles/colors";

export default function Card({ children, style, title, desc, right }) {
  return (
    <div
      style={{
        background: `linear-gradient(180deg, ${COLORS.panel} 0%, ${COLORS.panelSoft} 100%)`,
        border: `1px solid ${COLORS.panelEdge}`,
        borderRadius: 14,
        boxShadow: COLORS.shadow,
        padding: "22px 22px 16px",
        marginBottom: 18,
        ...style,
      }}
    >

      {(title || right) && (
        <div
          style={{
            display:"flex",
            alignItems:"flex-start",
            justifyContent:"space-between",
            marginBottom: desc ? 16 : 18,
            gap:14,
            flexWrap:"wrap"
          }}
        >

          <div>
            {title && (
              <div
                style={{
                  fontSize:15,
                  fontWeight:800,
                  color:COLORS.navy,
                  lineHeight:1.25
                }}
              >
                {title}
              </div>
            )}

            {desc && (
              <div
                style={{
                  fontSize:12.5,
                  color:COLORS.textDim,
                  marginTop:4,
                  lineHeight:1.35
                }}
              >
                {desc}
              </div>
            )}

          </div>

          {right}

        </div>
      )}

      {!title && !right && desc && (
        <div
          style={{
            fontSize:12.5,
            color:COLORS.textDim,
            marginBottom:12
          }}
        >
          {desc}
        </div>
      )}

      {children}

    </div>
  );
}
