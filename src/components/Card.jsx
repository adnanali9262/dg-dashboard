import { COLORS } from "../styles/colors";

export default function Card({ children, style, title, desc, right }) {
  return (
    <div
      style={{
        background: COLORS.panel,
        border: `1px solid ${COLORS.panelEdge}`,
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(15,42,71,0.05)",
        padding: "18px 18px 8px",
        marginBottom: 22,
        ...style,
      }}
    >

      {(title || right) && (
        <div
          style={{
            display:"flex",
            alignItems:"flex-start",
            justifyContent:"space-between",
            marginBottom: desc ? 2 : 10,
            gap:10,
            flexWrap:"wrap"
          }}
        >

          <div>
            {title && (
              <div
                style={{
                  fontSize:13,
                  fontWeight:600,
                  color:COLORS.navy
                }}
              >
                {title}
              </div>
            )}

            {desc && (
              <div
                style={{
                  fontSize:11.5,
                  color:COLORS.textDim,
                  marginTop:2
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
            fontSize:11.5,
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