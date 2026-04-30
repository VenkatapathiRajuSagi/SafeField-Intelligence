export default function ConfidenceChart({ confidence, uncertainty }) {
  // Parse inputs safely
  const confVal = parseFloat(confidence) || 0;
  const uncerVal = parseFloat(uncertainty) || 0;

  const barStyle = (color1, color2, shadow) => ({
    background: `linear-gradient(to top, ${color1}, ${color2})`,
    boxShadow: `0 0 20px ${shadow}`,
  });

  return (
    <div className="confidence-container">
      <div className="confidence-row">
        
        {/* Confidence Column */}
        <div className="confidence-col">
          <div className="confidence-val" style={{ textShadow: "0 0 10px rgba(0,196,159,0.5)" }}>
            {confVal.toFixed(1)}%
          </div>
          <div 
            className="confidence-bar-wrapper" 
            style={{ 
              height: `${Math.min(100, confVal)}%`,
              ...barStyle("#00c49f", "#059669", "rgba(0,196,159,0.3)") 
            }}
          >
            <div className="shimmer-layer"></div>
          </div>
          <div className="confidence-label">Confidence</div>
        </div>

        {/* Uncertainty Column */}
        <div className="confidence-col">
          <div className="confidence-val" style={{ textShadow: "0 0 10px rgba(245,158,11,0.5)" }}>
            {uncerVal.toFixed(1)}%
          </div>
          <div 
            className="confidence-bar-wrapper" 
            style={{ 
              height: `${Math.min(100, uncerVal)}%`,
              ...barStyle("#f59e0b", "#d97706", "rgba(245,158,11,0.3)") 
            }}
          >
            <div className="shimmer-layer"></div>
          </div>
          <div className="confidence-label">Uncertainty</div>
        </div>

      </div>
    </div>
  );
}