import { COLORS } from "../styles/colors";

export default function Card({ children, style, title, desc, right }) {
  return (
    <div
      style={{
        background: COLORS.panel,
        border: `1px solid ${COLORS.panelEdge}`,
        borderRadius: 10,
        boxShadow: COLORS.shadowSoft,
        padding: "20px 20px 12px",
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
            marginBottom: desc ? 14 : 16,
            gap:14,
            flexWrap:"wrap"
          }}
        >

          <div>
            {title && (
              <div
                style={{
                  fontSize:14,
                  fontWeight:700,
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
                  fontSize:12,
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
            fontSize:12,
            color:COLORS.textDim,
            marginBottom:10
          }}
        >
          {desc}
        </div>
      )}

      {children}

    </div>
  );
}
