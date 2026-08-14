
export function LumenLogo() {
  return (
    <div
      style={{
        backgroundColor: "transparent",
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
        width: "100%",
        margin: 0,
        fontFamily: "'Segoe UI', sans-serif",
        color: "#ffffff",
        textAlign: "left" as const,
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          padding: 0,
        }}
      >
        {/* ROSA NÁUTICA */}
        <svg
          className="nautical-star"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: "120px",
            height: "120px",
            display: "block",
            marginBottom: "8px",
            filter: "drop-shadow(0 0 25px rgba(0, 212, 255, 0.5))",
          }}
        >
          <defs>
            <radialGradient id="nauticalGrad" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#00d4ff" />
              <stop offset="55%" stopColor="#39ff14" />
              <stop offset="100%" stopColor="#bf00ff" />
            </radialGradient>

            <linearGradient
              id="pointGrad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#00d4ff" />
            </linearGradient>
          </defs>

          {/* Círculo exterior decorativo */}
          <circle
            cx="100"
            cy="100"
            r="95"
            fill="none"
            stroke="url(#nauticalGrad)"
            strokeWidth="2"
            opacity="0.6"
          />

          {/* Círculo interior */}
          <circle
            cx="100"
            cy="100"
            r="65"
            fill="none"
            stroke="url(#nauticalGrad)"
            strokeWidth="1.5"
            opacity="0.4"
          />

          {/* Puntos cardinales principales */}
          <polygon
            fill="url(#pointGrad)"
            points="100,15 107,85 100,75 93,85"
          />

          <polygon
            fill="url(#pointGrad)"
            points="100,185 93,115 100,125 107,115"
          />

          <polygon
            fill="url(#pointGrad)"
            points="185,100 115,93 125,100 115,107"
          />

          <polygon
            fill="url(#pointGrad)"
            points="15,100 85,107 75,100 85,93"
          />

          {/* Puntos intercardinales */}
          <polygon
            fill="#39ff14"
            points="155.36,44.64 110,90 105.36,94.64 110,100 155.36,54.64"
          />

          <polygon
            fill="#39ff14"
            points="155.36,155.36 110,110 105.36,105.36 110,100 155.36,145.36"
          />

          <polygon
            fill="#39ff14"
            points="44.64,155.36 90,110 94.64,105.36 100,110 54.64,155.36"
          />

          <polygon
            fill="#39ff14"
            points="44.64,44.64 90,90 94.64,94.64 100,90 54.64,44.64"
          />

          {/* Puntos secundarios */}
          <polygon
            fill="#bf00ff"
            opacity="0.8"
            points="120,25 108,88 105,85 108,82"
          />

          <polygon
            fill="#bf00ff"
            opacity="0.8"
            points="175,80 112,92 115,95 118,92"
          />

          <polygon
            fill="#bf00ff"
            opacity="0.8"
            points="175,120 118,108 115,105 112,108"
          />

          <polygon
            fill="#bf00ff"
            opacity="0.8"
            points="120,175 108,112 105,115 108,118"
          />

          <polygon
            fill="#bf00ff"
            opacity="0.8"
            points="80,175 92,112 95,115 98,118"
          />

          <polygon
            fill="#bf00ff"
            opacity="0.8"
            points="25,120 88,108 85,105 82,108"
          />

          <polygon
            fill="#bf00ff"
            opacity="0.8"
            points="25,80 88,92 85,95 82,92"
          />

          <polygon
            fill="#bf00ff"
            opacity="0.8"
            points="80,25 92,88 95,85 98,88"
          />

          {/* Centro brillante */}
          <circle
            cx="100"
            cy="100"
            r="12"
            fill="#ffffff"
            style={{
              filter: "drop-shadow(0 0 10px #00d4ff)",
            }}
          />

          <circle cx="100" cy="100" r="6" fill="#00d4ff" />

          {/* Letras cardinales */}
          <text
            x="100"
            y="12"
            fontFamily="Arial, sans-serif"
            fontSize="14"
            fontWeight="bold"
            fill="#ffffff"
            textAnchor="middle"
          >
            N
          </text>

          <text
            x="100"
            y="198"
            fontFamily="Arial, sans-serif"
            fontSize="14"
            fontWeight="bold"
            fill="#ffffff"
            textAnchor="middle"
          >
            S
          </text>

          <text
            x="192"
            y="105"
            fontFamily="Arial, sans-serif"
            fontSize="14"
            fontWeight="bold"
            fill="#ffffff"
            textAnchor="middle"
          >
            E
          </text>

          <text
            x="8"
            y="105"
            fontFamily="Arial, sans-serif"
            fontSize="14"
            fontWeight="bold"
            fill="#ffffff"
            textAnchor="middle"
          >
            W
          </text>

          {/* Letras intercardinales */}
          <text
            x="162"
            y="50"
            fontFamily="Arial, sans-serif"
            fontSize="10"
            fill="#39ff14"
            textAnchor="middle"
          >
            NE
          </text>

          <text
            x="162"
            y="158"
            fontFamily="Arial, sans-serif"
            fontSize="10"
            fill="#39ff14"
            textAnchor="middle"
          >
            SE
          </text>

          <text
            x="38"
            y="158"
            fontFamily="Arial, sans-serif"
            fontSize="10"
            fill="#39ff14"
            textAnchor="middle"
          >
            SW
          </text>

          <text
            x="38"
            y="50"
            fontFamily="Arial, sans-serif"
            fontSize="10"
            fill="#39ff14"
            textAnchor="middle"
          >
            NW
          </text>
        </svg>

        <div
          style={{
            fontSize: "30px",
            margin: 0,
            fontWeight: 300,
            letterSpacing: "2px",
          }}
        >
          Lumen
        </div>

        <div
          style={{
            fontSize: "16px",
            color: "#ffffff",
            margin: "2px 0 8px 0",
            textShadow: "0 0 10px #ffffff, 0 0 20px #00d4ff",
          }}
        >
          Note AI
        </div>

        <div
          style={{
            fontSize: "8px",
            color: "#00d4ff",
            textTransform: "uppercase",
            letterSpacing: "2px",
            fontWeight: 600,
            opacity: 0.8,
            lineHeight: 1.4,
          }}
        >
          Illuminate Insights. Empower Intelligent Action.
        </div>
      </div>
    </div>
  );
}
