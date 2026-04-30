import "./Dashboard.css";
import { useEffect, useState } from "react";

import RiskChart from "./RiskChart";
import ConfidenceChart from "./ConfidenceChart";
import DetectionChart from "./DetectionChart";
import RiskGauge from "./RiskGauge";
import DailyAlertsChart from "./DailyAlertsChart";
import WeeklyRiskTrends from "./WeeklyRiskTrends";
import ZoneChart from "./ZoneChart";

const API_URL = "http://127.0.0.1:5000/status";

const ParticleField = () => {
  const particles = useState(() => Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 10}s`,
    duration: `${15 + Math.random() * 20}s`,
    size: `${1 + Math.random() * 3}px`
  })))[0];

  return (
    <div className="particle-container">
      {particles.map(p => (
        <div 
          key={p.id} 
          className="hud-particle" 
          style={{ 
            left: p.left, 
            animationDelay: p.delay, 
            "--duration": p.duration,
            width: p.size,
            height: p.size
          }} 
        />
      ))}
    </div>
  );
};

export default function Dashboard() {

  const [data, setData] = useState({
    snake_detected: false,
    fall_detected: false,
    inactivity: false,

    current_risk: "Low",
    future_risk: "Low",
    final_risk: "Low",

    confidence: 0,
    uncertainty: 0,

    last_alert_type: "None",
    last_alert_time: "N/A"
  });

  const [activeSection, setActiveSection] = useState("dashboard");
  const [lastUpdated, setLastUpdated] = useState("");
  const [riskHistory, setRiskHistory] = useState([]);
  const [alertHistory, setAlertHistory] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState({ daily: [], risk: [] });
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [backendConnected, setBackendConnected] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [config, setConfig] = useState({
    snake_threshold: 40,
    fall_threshold: 60,
    snake_verify_threshold: 60,
    active_zone: "Field A",
    modules: { snake: true, fall: true, inactivity: true, predictions: true }
  });

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isGlitching, setIsGlitching] = useState(false);
  const [lastRisk, setLastRisk] = useState("Low");

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/config")
      .then(res => res.json())
      .then(data => { if (!data.error) setConfig(data); })
      .catch(err => console.error("Config fetch error", err));
  }, []);

  useEffect(() => {

    const fetchData = async () => {
      try {

        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Connection Failure");
        const apiData = await res.json();
        
        if (!apiData) return;

        // 🚀 AGGRESSIVE PEAK-HOLD PERSISTENCE
        setData(prev => {
          // Determine if the incoming alert data is 'Valid' (not None/N/A)
          const incomingType = apiData.last_alert_type;
          const incomingTime = apiData.last_alert_time;
          
          const isNewValidType = incomingType && incomingType !== "None" && incomingType !== "N/A";
          const isNewValidTime = incomingTime && incomingTime !== "N/A" && incomingTime !== "None" && incomingTime !== null;

          // 🚀 Intelligence Peak-Hold Logic
          const isNewIncident = apiData.final_risk === "High" || apiData.snake_detected || apiData.fall_detected;

          return {
            ...prev,
            ...apiData,
            // 🛡️ THE PEAK HOLD: Only overwrite labels if the NEW data is valid.
            last_alert_type: isNewValidType ? incomingType : (prev.last_alert_type && prev.last_alert_type !== "None" ? prev.last_alert_type : "None"),
            last_alert_time: isNewValidTime ? incomingTime : (prev.last_alert_time && prev.last_alert_time !== "N/A" ? prev.last_alert_time : "N/A"),
            
            // 🛡️ Intelligence Persistence: Hold onto incident metrics indefinitely 
            final_risk: isNewIncident ? apiData.final_risk : (prev.final_risk !== "Low" ? prev.final_risk : apiData.final_risk),
            current_risk: isNewIncident ? apiData.current_risk : (prev.current_risk !== "Low" ? prev.current_risk : apiData.current_risk),
            future_risk: isNewIncident ? apiData.future_risk : (prev.future_risk !== "Low" ? prev.future_risk : apiData.future_risk),
            confidence: isNewIncident ? apiData.confidence : (prev.confidence !== "0" && prev.confidence !== 0 ? prev.confidence : apiData.confidence),
            uncertainty: isNewIncident ? apiData.uncertainty : (prev.uncertainty !== "0" && prev.uncertainty !== 0 ? prev.uncertainty : apiData.uncertainty),
            
            counterfactual: (isNewIncident && apiData.counterfactual) ? apiData.counterfactual : (prev.counterfactual && Object.keys(prev.counterfactual).length > 0 ? prev.counterfactual : apiData.counterfactual || {}),
            spatial_risk: (isNewIncident && apiData.spatial_risk) ? apiData.spatial_risk : (prev.spatial_risk && Object.keys(prev.spatial_risk).length > 0 ? prev.spatial_risk : apiData.spatial_risk || {})
          };
        });
        
        setLastUpdated(apiData.timestamp);
        setWeeklyStats(apiData.weekly_stats || { daily: [], risk: [] });

        /* -------- ALERT HISTORY -------- */

        if (apiData.alert_history && apiData.alert_history.length > 0) {
          setAlertHistory(apiData.alert_history);
          
          // 🚀 INITIAL LOAD FALLBACK: If current fields are empty, pull from most recent history
          setData(prev => {
            if (prev.last_alert_type === "None" || prev.last_alert_type === "N/A") {
                const latest = apiData.alert_history[0];
                return {
                    ...prev,
                    last_alert_type: latest.type || prev.last_alert_type,
                    last_alert_time: latest.time || prev.last_alert_time
                };
            }
            return prev;
          });

        } else if (apiData.last_alert_type && apiData.last_alert_type !== "None") {
          setAlertHistory(prev => {
            if (prev.length > 0 && prev[0].time === apiData.last_alert_time) return prev;
            return [{ type: apiData.last_alert_type, time: apiData.last_alert_time }, ...prev].slice(0, 5);
          });
        }

        /* -------- RISK HISTORY -------- */

        const riskMap = {
          Low: 0,
          Medium: 1,
          High: 2
        };

        const riskLevel = riskMap[apiData.final_risk] ?? 0;

        setRiskHistory(prev => {
          // 🚀 SESSION-BASED RESET (Backend Restart)
          const isNewSession = currentSessionId && apiData.session_id && currentSessionId !== apiData.session_id;
          if (isNewSession) {
            console.log("Monitoring session restarted. Wiping stale data.");
            return [{ time: new Date().toLocaleTimeString(), risk: riskLevel }];
          }

          // 🚀 REFRESH CHART ON NEW ALERT TRANSITION
          // If we were at Low (0) and now have ANY risk, clear history for a clean view
          const wasFlat = prev.length > 0 && prev.every(p => p.risk === 0);
          const isTransition = (wasFlat && riskLevel > 0) || (prev.length > 0 && prev[prev.length - 1].risk === 0 && riskLevel > 0);
          const base = isTransition ? [] : prev.slice(-30); // Show a bit more (30 points)
          
          return [
            ...base,
            {
              time: new Date().toLocaleTimeString(),
              risk: riskLevel
            }
          ];
        });

        // 🚀 SESSION-BASED RESET (Backend Restart)
        // We only reset the Risk History chart to give a fresh 'Timeline' view for the new session.
        // We do NOT wipe the Alert History (list of previous snakes) so they stay visible as requested.
        if (currentSessionId && apiData.session_id && currentSessionId !== apiData.session_id) {
            console.log("Monitoring session restarted. Refreshing live view.");
            setRiskHistory([]); 
        }
        setCurrentSessionId(apiData.session_id);
        setBackendConnected(true);

      } catch (err) {
        setBackendConnected(false);
        // 🚀 AUTO-RESET ON DISCONNECT
        // If we lose connection, clear all 'Detected' states so we don't show stale alerts
        setData(prev => ({
          ...prev,
          snake_detected: false,
          fall_detected: false,
          inactivity: false,
          final_risk: "Low",
          current_risk: "Low",
          confidence: 0
        }));
        console.error("Backend not reachable");
      }
    };

    fetchData();

    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);

  }, []);


  // 🧊 3D TILT EFFECT & GLITCH TRIGGER
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    if (data.final_risk === "High" && lastRisk !== "High") {
       setIsGlitching(true);
       setTimeout(() => setIsGlitching(false), 500);
    }
    setLastRisk(data.final_risk);
  }, [data.final_risk]); // Removed lastRisk to stop infinite loop

  const getTiltStyle = (intensity = 1) => ({
    transform: `rotateY(${mousePos.x * 5 * intensity}deg) rotateX(${-mousePos.y * 5 * intensity}deg)`,
    transformStyle: "preserve-3d"
  });

  return (

    <div className="layout">
      
      {/* ATMOSPHERIC LAYERS */}
      <ParticleField />
      <div className="vignette-overlay" />

      {/* LEFT NAVIGATION RAIL */}

      <aside className="rail">

        <div className="logo">🐍</div>

        {["dashboard", "alerts", "analytics", "system", "settings"].map(section => (

          <div
            key={section}
            className={`rail-item ${activeSection === section ? "active" : ""}`}
            onClick={() => setActiveSection(section)}
          >
            {section.charAt(0).toUpperCase() + section.slice(1)}
          </div>

        ))}

        <div className="rail-footer" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{
               background: 'transparent', 
               border: '1px solid var(--border-light)', 
               color: 'var(--text-active)', 
               cursor: 'pointer', 
               fontSize: '20px', 
               padding: '8px', 
               borderRadius: '50%',
               transition: 'all 0.3s'
            }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div style={{ color: backendConnected ? '#00c49f' : '#ef4444', fontWeight: 'bold' }}>
            ● {backendConnected ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>

      </aside>


      {/* MAIN DASHBOARD */}

      <div className={`dashboard ${isGlitching ? "glitch-active" : ""}`}>

        <h1 className="title">
          🛡️ SafeField <span>Intelligence</span>
        </h1>


        {/* ================= DASHBOARD ================= */}

        {activeSection === "dashboard" && (
          <div className="wide" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>

            {/* HEADER ROW */}
            <div className={`card ${data.status_ok ? "" : "animate-inact"}`} style={{ 
              gridColumn: 'span 6', 
              animationDelay: '0.1s', 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between", 
              padding: "20px", 
              background: "linear-gradient(90deg, rgba(15,23,42,0.8), rgba(2,6,23,0.9))", 
              borderLeft: "4px solid #00c49f", 
              boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
              ...getTiltStyle(0.6)
            }}>
              <div>
                <h3 style={{ margin: 0, color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Core Connectivity</h3>
                <div style={{ color: "#f8fafc", fontSize: "20px", fontWeight: "bold", marginTop: "4px" }}>System Health</div>
              </div>
              <div style={{ 
                background: backendConnected ? "rgba(0,196,159,0.1)" : "rgba(220,38,38,0.1)", 
                color: backendConnected ? "#00c49f" : "#ef4444", 
                padding: "6px 14px", 
                borderRadius: "20px", 
                fontWeight: "bold", 
                fontSize: "14px", 
                border: backendConnected ? "1px solid rgba(0,196,159,0.3)" : "1px solid rgba(220,38,38,0.3)", 
                boxShadow: backendConnected ? "0 0 15px rgba(0,196,159,0.2)" : "0 0 15px rgba(220,38,38,0.2)" 
              }}>
                ● {backendConnected ? "ONLINE" : "DISCONNECTED"}
              </div>
            </div>

            <div className="card" style={{ 
              gridColumn: 'span 6', 
              animationDelay: '0.2s', 
              position: 'relative', 
              overflow: 'hidden', 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between", 
              padding: "20px", 
              background: "linear-gradient(90deg, rgba(15,23,42,0.8), rgba(2,6,23,0.9))", 
              borderLeft: "4px solid #a855f7", 
              boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
              ...getTiltStyle(0.6)
            }}>
              {/* Scanline effect */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'linear-gradient(to right, transparent, rgba(168,85,247,0.5), transparent)', animation: 'scanLine 3s linear infinite' }}></div>
              <div>
                <h3 style={{ margin: 0, color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>AI Engine Mode</h3>
                <div style={{ color: "#f8fafc", fontSize: "20px", fontWeight: "bold", marginTop: "4px" }}>Vision Pipeline</div>
              </div>
              <div style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7", padding: "6px 14px", borderRadius: "20px", fontWeight: "bold", fontSize: "14px", border: "1px solid rgba(168,85,247,0.3)", boxShadow: "0 0 15px rgba(168,85,247,0.2)" }}>
                LIVE INFERENCE
              </div>
            </div>

            {/* LIVE TELEMETRY FEED */}
            <div className="card chart wide" style={{ 
               gridColumn: 'span 12', 
               animationDelay: '0.3s', 
               background: "rgba(15,23,42,0.6)", 
               padding: "24px",
               ...getTiltStyle(0.2)
            }}>
              <div style={{ marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, color: "#f8fafc", fontSize: "18px" }}>Live Telemetry Feed</h3>
                  <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>
                    {backendConnected ? (data.system_mode || "Real-time AI diagnostics") : "⚠️ BACKEND OFFLINE - RESTART APP.PY"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: data.snake_detected ? "#ef4444" : data.fall_detected ? "#f59e0b" : data.inactivity ? "#38bdf8" : "#334155", display: "block" }}></span>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#334155", display: "block" }}></span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
                
                {/* Snake */}
                <div className={`detect-item ${data.snake_detected ? "animate-snake" : ""}`} style={{ background: data.snake_detected ? "rgba(220,38,38,0.15)" : "rgba(255,255,255,0.02)", border: data.snake_detected ? "1px solid rgba(220,38,38,0.4)" : "1px solid rgba(255,255,255,0.05)", padding: "20px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "20px", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", transform: data.snake_detected ? "scale(1.02)" : "scale(1)" }}>
                  <div style={{ fontSize: "36px", filter: data.snake_detected ? "drop-shadow(0 0 10px rgba(220,38,38,0.8))" : "grayscale(100%) opacity(0.3)" }}>🐍</div>
                  <div>
                    <div style={{ color: "#f8fafc", fontSize: "16px", fontWeight: "bold" }}>Venomous Reptile</div>
                    <div style={{ color: data.snake_detected ? "#ff4d4d" : "#64748b", fontSize: "14px", fontWeight: "bold", marginTop: "4px" }}>
                      {data.snake_detected ? "SNAKE DETECTED" : "Standby"}
                    </div>
                  </div>
                </div>

                {/* Fall */}
                <div className={`detect-item ${data.fall_detected ? "animate-fall" : ""}`} style={{ background: data.fall_detected ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.02)", border: data.fall_detected ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.05)", padding: "20px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "20px", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", transform: data.fall_detected ? "scale(1.02)" : "scale(1)" }}>
                  <div style={{ fontSize: "36px", filter: data.fall_detected ? "drop-shadow(0 0 10px rgba(245,158,11,0.8))" : "grayscale(100%) opacity(0.3)" }}>🧍</div>
                  <div>
                    <div style={{ color: "#f8fafc", fontSize: "16px", fontWeight: "bold" }}>Kinematic Fall</div>
                    <div style={{ color: data.fall_detected ? "#f59e0b" : "#64748b", fontSize: "14px", fontWeight: "bold", marginTop: "4px" }}>
                      {data.fall_detected ? "DETECTED" : "Standby"}
                    </div>
                  </div>
                </div>

                {/* Inactivity */}
                <div className={`detect-item ${data.inactivity ? "animate-inact" : ""}`} style={{ background: data.inactivity ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.02)", border: data.inactivity ? "1px solid rgba(56,189,248,0.4)" : "1px solid rgba(255,255,255,0.05)", padding: "20px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "20px", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", transform: data.inactivity ? "scale(1.02)" : "scale(1)" }}>
                  <div style={{ fontSize: "36px", filter: data.inactivity ? "drop-shadow(0 0 10px rgba(56,189,248,0.8))" : "grayscale(100%) opacity(0.3)" }}>⏱</div>
                  <div>
                    <div style={{ color: "#f8fafc", fontSize: "16px", fontWeight: "bold" }}>Prolonged Inactivity</div>
                    <div style={{ color: data.inactivity ? "#38bdf8" : "#64748b", fontSize: "14px", fontWeight: "bold", marginTop: "4px" }}>
                      {data.inactivity ? "DETECTED" : "Standby"}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ALERT TRIANGULATION */}
            <div className="card chart wide" style={{ 
               gridColumn: 'span 12', 
               background: "rgba(15,23,42,0.6)", 
               padding: "24px", 
               marginBottom: "20px",
               position: 'relative',
               overflow: 'hidden',
               ...getTiltStyle(0.3)
            }}>
              <div className="hud-scan-overlay"></div>
              <div style={{ marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "12px" }}>
                <h3 style={{ margin: 0, color: "#f8fafc", fontSize: "18px" }}>Last Intelligence Packet</h3>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>Event vector metadata</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
                <div style={{ display: "flex", gap: "15px", alignItems: "center", background: "rgba(0,0,0,0.2)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.02)" }}>
                   <div style={{ background: "rgba(255,255,255,0.05)", padding: "14px", borderRadius: "10px", fontSize: "20px", boxShadow: "inset 0 2px 5px rgba(0,0,0,0.5)" }}>📍</div>
                   <div>
                     <div style={{ color: "#94a3b8", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>Registered Zone</div>
                     <div style={{ color: "#f8fafc", fontSize: "18px", fontWeight: "bold", marginTop: "2px" }}>Field A</div>
                   </div>
                </div>
                <div style={{ display: "flex", gap: "15px", alignItems: "center", background: "rgba(0,0,0,0.2)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.02)" }}>
                   <div style={{ background: "rgba(255,255,255,0.05)", padding: "14px", borderRadius: "10px", fontSize: "20px", boxShadow: "inset 0 2px 5px rgba(0,0,0,0.5)" }}>🚨</div>
                   <div>
                     <div style={{ color: "#94a3b8", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>Event Classification</div>
                     <div style={{ color: "#f8fafc", fontSize: "18px", fontWeight: "bold", marginTop: "2px" }}>{data.last_alert_type || "None"}</div>
                   </div>
                </div>
                <div style={{ display: "flex", gap: "15px", alignItems: "center", background: "rgba(0,0,0,0.2)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.02)" }}>
                   <div style={{ background: "rgba(255,255,255,0.05)", padding: "14px", borderRadius: "10px", fontSize: "20px", boxShadow: "inset 0 2px 5px rgba(0,0,0,0.5)" }}>⏰</div>
                   <div>
                     <div style={{ color: "#94a3b8", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>Timestamp Sync</div>
                     <div style={{ color: "#f8fafc", fontSize: "18px", fontWeight: "bold", marginTop: "2px" }}>{data.last_alert_time || "--:--:--"}</div>
                   </div>
                </div>
              </div>
            </div>


            {/* HERO RISK PANEL */}

            {/* HERO RISK PANEL */}
            <div className="card hero wide" style={{ 
                gridColumn: 'span 12',
                background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(2, 6, 23, 0.95))",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                boxShadow: "0 0 30px rgba(56, 189, 248, 0.05)",
                padding: "24px",
                overflow: 'hidden',
                ...getTiltStyle(0.1)
            }}>
               <div className="hud-scan-overlay" style={{ opacity: 0.2 }}></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, color: "#f8fafc", fontSize: "22px", letterSpacing: "1px" }}>AI Risk Intelligence</h3>
                <span style={{ background: "rgba(220,38,38,0.2)", color: "#ff4d4d", padding:"4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold", border: "1px solid rgba(220,38,38,0.5)" }}>
                  ACTIVE MONITORING
                </span>
              </div>

              <div style={{ padding: "10px 0" }}>
                <RiskGauge risk={data.final_risk} />
              </div>

              <div style={{ textAlign: "center", marginTop: "-20px", marginBottom: "25px" }}>
                <div style={{ fontSize: "14px", color: "#94a3b8", letterSpacing: "2px", marginBottom: "5px" }}>COMPUTED THREAT LEVEL</div>
                <div style={{ 
                    color: data.final_risk === "High" ? "#ef4444" : data.final_risk === "Medium" ? "#f59e0b" : "#38bdf8",
                    fontSize: "38px", 
                    fontWeight: "900", 
                    textTransform: "uppercase", 
                    letterSpacing: "4px",
                    textShadow: data.final_risk === "High" ? "0 0 25px rgba(239,68,68,0.6)" : data.final_risk === "Medium" ? "0 0 25px rgba(245,158,11,0.6)" : "0 0 25px rgba(56,189,248,0.6)",
                }}>
                  {data.final_risk}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
                   <div style={{ color: "#94a3b8", fontSize: "11px", fontWeight: "bold" }}>CURRENT RISK BASELINE</div>
                   <div style={{ color: "#f8fafc", fontSize: "16px", fontWeight: "bold", marginTop: "4px" }}>{data.current_risk}</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
                   <div style={{ color: "#94a3b8", fontSize: "11px", fontWeight: "bold" }}>PREDICTIVE FUTURE RISK</div>
                   <div style={{ color: "#f8fafc", fontSize: "16px", fontWeight: "bold", marginTop: "4px" }}>{data.future_risk}</div>
                </div>
                <div style={{ background: "rgba(0,196,159,0.05)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(0,196,159,0.2)", textAlign: "center" }}>
                   <div style={{ color: "#00c49f", fontSize: "11px", fontWeight: "bold" }}>ENGINE CONFIDENCE</div>
                   <div style={{ color: "#00c49f", fontSize: "20px", fontWeight: "bold", marginTop: "4px" }}>{data.confidence}%</div>
                </div>
                <div style={{ background: "rgba(245,158,11,0.05)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(245,158,11,0.2)", textAlign: "center" }}>
                   <div style={{ color: "#f59e0b", fontSize: "11px", fontWeight: "bold" }}>CALCULATED UNCERTAINTY</div>
                   <div style={{ color: "#f59e0b", fontSize: "20px", fontWeight: "bold", marginTop: "4px" }}>{data.uncertainty}%</div>
                </div>
              </div>
            </div>


            {/* RISK & CONFIDENCE DUAL VIEW */}
            <div className="card chart" style={{ 
               gridColumn: 'span 6', 
               animationDelay: '0.5s', 
               padding: "20px",
               ...getTiltStyle(0.4)
            }}>
              <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, color: "#f8fafc", fontSize: "16px" }}>Risk Evolution</h3>
                  <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "12px" }}>Dynamic hazard probability</p>
                </div>
                <span style={{ fontSize: "11px", background: "rgba(56,189,248,0.1)", color: "#38bdf8", padding: "4px 10px", borderRadius: "12px", border: "1px solid rgba(56,189,248,0.2)" }}>LIVE FEED</span>
              </div>
              <RiskChart history={riskHistory} />
            </div>

            <div className="card chart" style={{ 
               gridColumn: 'span 6', 
               animationDelay: '0.6s', 
               padding: "20px",
               ...getTiltStyle(0.4)
            }}>
              <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, color: "#f8fafc", fontSize: "16px" }}>Inference Stability</h3>
                  <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "12px" }}>Confidence vs Uncertainty</p>
                </div>
                <span style={{ fontSize: "11px", background: "rgba(0,196,159,0.1)", color: "#00c49f", padding: "4px 10px", borderRadius: "12px", border: "1px solid rgba(0,196,159,0.2)" }}>VISION ENGINE</span>
              </div>
              <ConfidenceChart confidence={data.confidence} uncertainty={data.uncertainty} />
            </div>

            {/* LAST UPDATED */}
            <div className="card wide" style={{ 
               gridColumn: 'span 12', 
               animationDelay: '0.7s', 
               padding: "15px", 
               display: "flex", 
               justifyContent: "center", 
               alignItems: "center", 
               background: "rgba(15,23,42,0.4)", 
               marginTop: "-10px",
               ...getTiltStyle(0.1)
            }}>
              <span style={{ color: "#94a3b8", fontSize: "13px", textTransform: "uppercase", letterSpacing: "1px", marginRight: "15px" }}>Last Intelligence Sync:</span>
              <span className="value time" style={{ color: "#f8fafc", fontSize: "18px", fontWeight: "bold" }}>{lastUpdated}</span>
              <div style={{ color: "#00c49f", fontSize: "11px", fontWeight: "bold", marginLeft: "25px", padding: "3px 10px", background: "rgba(0,196,159,0.1)", borderRadius: "10px", border: "1px solid rgba(0,196,159,0.3)" }}>SECURE CONNECTION</div>
            </div>

          </div>
        )}

        {/* ================= SYSTEM ================= */}

        {activeSection === "system" && (
          <div className="wide" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
            
            {/* Header Title */}
            <div style={{ gridColumn: 'span 12', marginBottom: "-10px", paddingBottom: "15px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
               <h2 style={{ margin: 0, color: "#f8fafc", fontSize: "28px", fontWeight: "700", letterSpacing: "0.5px" }}>
                 ⚙️ Core Infrastructure
               </h2>
               <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: "14px" }}>
                 Hardware telemetry, neural engine diagnostics, and active sub-modules.
               </p>
            </div>

            {/* Hardware Telemetry */}
            <div className="card" style={{ gridColumn: 'span 8', background: "rgba(15,23,42,0.6)", padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, color: "#f8fafc", fontSize: "18px" }}>Hardware Telemetry</h3>
                <span style={{ fontSize: "11px", color: "#00c49f", background: "rgba(0,196,159,0.1)", padding: "4px 10px", borderRadius: "12px", border: "1px solid rgba(0,196,159,0.3)" }}>● OPTIMAL</span>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", padding: "16px", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <span style={{ color: "#94a3b8", fontSize: "13px", fontWeight: "bold" }}>CPU Status</span>
                   <span style={{ color: "#f8fafc", fontWeight: "bold" }}>Normal</span>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", padding: "16px", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <span style={{ color: "#94a3b8", fontSize: "13px", fontWeight: "bold" }}>System Latency</span>
                   <span style={{ color: "#f8fafc", fontWeight: "bold" }}>120 ms</span>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", padding: "16px", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <span style={{ color: "#94a3b8", fontSize: "13px", fontWeight: "bold" }}>Camera Feed</span>
                   <span style={{ color: "#00c49f", fontWeight: "bold", textShadow: "0 0 10px rgba(0,196,159,0.5)" }}>Streaming</span>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", padding: "16px", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                   <span style={{ color: "#94a3b8", fontSize: "13px", fontWeight: "bold" }}>Model State</span>
                   <span style={{ color: "#f59e0b", fontWeight: "bold" }}>Weighted</span>
                </div>
              </div>
            </div>

            {/* Diagnostic Core */}
            <div className="card" style={{ gridColumn: 'span 4', background: "rgba(15,23,42,0.6)", padding: "24px" }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#f8fafc", fontSize: "18px" }}>Diagnostic Core</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>
                  <span style={{ color: "#94a3b8", fontSize: "13px" }}>AI Confidence</span>
                  <span style={{ color: "#38bdf8", fontWeight: "bold" }}>{data.confidence}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>
                  <span style={{ color: "#94a3b8", fontSize: "13px" }}>Calculated Uncertainty</span>
                  <span style={{ color: "#f59e0b", fontWeight: "bold" }}>{data.uncertainty}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>
                  <span style={{ color: "#94a3b8", fontSize: "13px" }}>Current Risk Profile</span>
                  <span style={{ color: data.current_risk.toLowerCase() === "high" ? "#ef4444" : "#f8fafc", fontWeight: "bold" }}>{data.current_risk}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8", fontSize: "13px" }}>Predictive Trajectory</span>
                  <span style={{ color: "#f8fafc", fontWeight: "bold" }}>{data.future_risk}</span>
                </div>
              </div>
            </div>

            {/* Sub-module Routing */}
            <div className="card wide" style={{ gridColumn: 'span 12', padding: "24px" }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#f8fafc", fontSize: "18px" }}>Active Neural Sub-Modules</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "15px" }}>
                {[
                  { name: "Snake Detection", color: "#00c49f" },
                  { name: "Fall Detection", color: "#00c49f" },
                  { name: "Inactivity Monitor", color: "#00c49f" },
                  { name: "Risk Prediction", color: "#00c49f" },
                  { name: "Counterfactual Engine", color: "#a855f7" }
                ].map((mod, idx) => (
                  <div key={idx} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "16px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                    <div style={{ width: "100%", height: "3px", background: mod.color, position: "absolute", top: 0, left: 0, boxShadow: `0 0 10px ${mod.color}` }}></div>
                    <div style={{ color: "#f8fafc", fontSize: "13px", fontWeight: "bold", marginTop: "5px" }}>{mod.name}</div>
                    <div style={{ color: mod.color, fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", marginTop: "8px", letterSpacing: "1px" }}>Running</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ================= ALERTS ================= */}

        {activeSection === "alerts" && (

          <div className="card wide" style={{ display: "flex", gap: "20px" }}>
            
            <div style={{ flex: 1 }}>
              <h3>AI Alert Timeline</h3>

              {alertHistory.length === 0 ? (
                <p style={{ color: "#94a3b8", fontStyle: "italic" }}>No alerts detected yet.</p>
              ) : (
                <div className="alert-timeline-container">
                  <ul className="alert-timeline">
                    {alertHistory.map((alert, index) => {
                      let icon = "🔵";
                      if (alert.type === "Snake") icon = "🔴";
                      if (alert.type === "Fall") icon = "🟡";

                      return (
                        <li 
                          key={index} 
                          className={`alert ${alert.type.toLowerCase()}`}
                          onClick={() => setSelectedAlert(alert)}
                          style={{ cursor: "pointer" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{ fontSize: "20px" }}>{icon}</div>
                            <div>
                              <div className="alert-type">{alert.type} Alert</div>
                              <div className="alert-time">{alert.time}</div>
                            </div>
                          </div>
                          <div style={{ 
                            fontSize: "12px", 
                            color: "#38bdf8", 
                            background: "rgba(56,189,248,0.1)", 
                            padding: "4px 8px", 
                            borderRadius: "12px",
                            fontWeight: "bold"
                          }}>
                            View ➔
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {selectedAlert && (
              <div className="alert-details-card" style={{ flex: 1, padding: "16px", borderRadius: "12px", border: "1px solid #334155", maxWidth: "450px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h4 style={{ margin: 0, color: "#f8fafc", fontSize: "16px", fontWeight: "700" }}>Incident Report</h4>
                    <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: "12px" }}>System Snapshot Evidence</p>
                  </div>
                  <button 
                    onClick={() => setSelectedAlert(null)} 
                    style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", fontSize: "12px", cursor: "pointer", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "0.2s" }}
                    onMouseOver={(e) => e.target.style.background = "rgba(255,255,255,0.2)"}
                    onMouseOut={(e) => e.target.style.background = "rgba(255,255,255,0.1)"}
                  >
                    ✖
                  </button>
                </div>
                
                <div style={{ marginTop: "16px", display: "flex", gap: "16px", background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "10px", fontWeight: "bold", letterSpacing: "0.5px" }}>CLASSIFICATION</span>
                    <div style={{ fontWeight: "bold", color: "#38bdf8", fontSize: "14px", marginTop: "2px" }}>{selectedAlert.type.toUpperCase()}</div>
                  </div>
                  <div style={{ width: "1px", background: "rgba(255,255,255,0.1)" }}></div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "10px", fontWeight: "bold", letterSpacing: "0.5px" }}>TIMESTAMP</span>
                    <div style={{ fontWeight: "normal", color: "#e2e8f0", fontSize: "14px", marginTop: "2px" }}>{selectedAlert.time}</div>
                  </div>
                </div>

                {selectedAlert.image ? (
                  <div style={{ marginTop: "16px", position: "relative" }}>
                    <div style={{ position: "absolute", top: "8px", left: "8px", background: "rgba(220, 38, 38, 0.9)", color: "white", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", letterSpacing: "0.5px", backdropFilter: "blur(4px)", zIndex: 10 }}>CONFIRMED</div>
                    <img 
                      src={`http://127.0.0.1:5000/${selectedAlert.image}`} 
                      alt="Historic Snapshot" 
                      style={{ width: "100%", maxHeight: "250px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 6px 15px rgba(0,0,0,0.3)", objectFit: "cover", display: "block" }} 
                    />
                  </div>
                ) : (
                  <div style={{ marginTop: "16px", padding: "20px", textAlign: "center", background: "rgba(0,0,0,0.2)", border: "1px dashed rgba(148,163,184,0.3)", borderRadius: "8px", color: "#64748b", fontSize: "12px" }}>
                    <div style={{ fontSize: "18px", marginBottom: "4px" }}>📷</div>
                    No visual evidence captured
                  </div>
                )}
              </div>
            )}

          </div>

        )}

        {/* ================= ANALYTICS ================= */}

        {activeSection === "analytics" && (
          <div className="wide" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
            
            {/* Header Section */}
            <div className="wide" style={{ marginBottom: "10px", paddingBottom: "15px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <h2 style={{ margin: 0, color: "#f8fafc", fontSize: "28px", fontWeight: "700", letterSpacing: "0.5px" }}>
                📊 Analytics Suite
              </h2>
              <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: "14px" }}>
                Macro-level system intelligence, historical trends, and risk taxonomy.
              </p>
            </div>

            {/* Executive KPI Cards Row */}
            <div className="wide" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "10px" }}>
              <div className="card" style={{ padding: "20px", background: "linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))", border: "1px solid rgba(148,163,184,0.1)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "bold", letterSpacing: "1px" }}>TOTAL DETECTIONS</span>
                <span style={{ color: "#f8fafc", fontSize: "32px", fontWeight: "800", marginTop: "10px", textShadow: "0 0 10px rgba(255,255,255,0.2)" }}>
                  {weeklyStats.daily.reduce((sum, d) => sum + (d.Snake || 0) + (d.Fall || 0) + (d.Inactivity || 0), 0)}
                </span>
              </div>
              <div className="card" style={{ padding: "20px", background: "linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))", border: "1px solid rgba(148,163,184,0.1)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "bold", letterSpacing: "1px" }}>AVG CONFIDENCE</span>
                <span style={{ color: "#00c49f", fontSize: "32px", fontWeight: "800", marginTop: "10px", textShadow: "0 0 10px rgba(0,196,159,0.4)" }}>
                  {data.confidence ? `${data.confidence}%` : "92%"}
                </span>
              </div>
              <div className="card" style={{ padding: "20px", background: "linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))", border: "1px solid rgba(148,163,184,0.1)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "bold", letterSpacing: "1px" }}>CRITICAL INCIDENTS</span>
                <span style={{ color: "#ff4d4d", fontSize: "32px", fontWeight: "800", marginTop: "10px", textShadow: "0 0 10px rgba(255,77,77,0.4)" }}>
                  {weeklyStats.daily.reduce((sum, d) => sum + (d.Snake || 0) + (d.Fall || 0), 0)}
                </span>
              </div>
              <div className="card" style={{ padding: "20px", background: "linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))", border: "1px solid rgba(148,163,184,0.1)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "bold", letterSpacing: "1px" }}>THREAT LEVEL</span>
                <span style={{ color: data.final_risk === "High" ? "#ff4d4d" : data.final_risk === "Medium" ? "#f59e0b" : "#38bdf8", fontSize: "32px", fontWeight: "800", marginTop: "10px" }}>
                  {data.final_risk}
                </span>
              </div>
            </div>
            
            {/* Real-time Row */}
            <div className="card chart" style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: "16px" }}>Risk Evolution</h3>
                <span style={{ fontSize: "11px", background: "rgba(56,189,248,0.1)", color: "#38bdf8", padding: "4px 10px", borderRadius: "12px", border: "1px solid rgba(56,189,248,0.2)" }}>LIVE FEED</span>
              </div>
              <div style={{ flex: 1 }}>
                <RiskChart history={riskHistory} />
              </div>
            </div>

            <div className="card chart" style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: "16px" }}>Confidence vs Uncertainty</h3>
                <span style={{ fontSize: "11px", background: "rgba(0,196,159,0.1)", color: "#00c49f", padding: "4px 10px", borderRadius: "12px", border: "1px solid rgba(0,196,159,0.2)" }}>VISION ENGINE</span>
              </div>
              <div style={{ flex: 1 }}>
                <ConfidenceChart confidence={data.confidence} uncertainty={data.uncertainty} />
              </div>
            </div>

            {/* Historical Macro Trends */}
            <div className="card chart wide" style={{ gridColumn: 'span 12' }}>
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: "16px" }}>Aggregate Security Risk Trend</h3>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "12px" }}>Calculated risk probability across all recorded dates</p>
              </div>
              <WeeklyRiskTrends data={weeklyStats.risk} />
            </div>

            {/* Event Taxonomy Row */}
            <div className="card chart" style={{ gridColumn: 'span 4' }}>
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: "16px" }}>Classification Distribution</h3>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "12px" }}>Volumetric breakdown of confirmed detections</p>
              </div>
              <DetectionChart
                snakeCount={weeklyStats.daily.reduce((sum, d) => sum + (d.Snake || 0), 0)}
                fallCount={weeklyStats.daily.reduce((sum, d) => sum + (d.Fall || 0), 0)}
                inactivityCount={weeklyStats.daily.reduce((sum, d) => sum + (d.Inactivity || 0), 0)}
              />
            </div>

            <div className="card chart" style={{ gridColumn: 'span 8' }}>
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: "16px" }}>Zone Vulnerability Analysis</h3>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "12px" }}>Geospatial mapping of confirmed incident locations across operational zones</p>
              </div>
              <ZoneChart data={weeklyStats.zones} />
            </div>

            <div className="card chart wide" style={{ gridColumn: 'span 12' }}>
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: "16px" }}>Daily Event Taxonomy</h3>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "12px" }}>Frequency of incident types over time</p>
              </div>
              <DailyAlertsChart data={weeklyStats.daily} />
            </div>
            
            {/* Footer stamp */}
            <div className="wide" style={{ textAlign: "right", color: "#475569", fontSize: "12px", marginTop: "10px" }}>
              Last intelligence sync: {lastUpdated}
            </div>

          </div>
        )}

        {/* ================= SETTINGS ================= */}
        {activeSection === "settings" && (
          <div className="wide" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
            <div className="wide" style={{ marginBottom: "10px", paddingBottom: "15px", borderBottom: "1px solid var(--border-light)" }}>
              <h2 style={{ margin: 0, color: "var(--text-bright)", fontSize: "28px", fontWeight: "700" }}>⚙️ Configuration Parameters</h2>
              <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: "14px" }}>System operational thresholds, mapping, and core logic overrides.</p>
            </div>

            {/* AI CONSTRAINTS */}
            <div className="card" style={{ gridColumn: 'span 4' }}>
               <h3 style={{ margin: "0 0 20px 0", color: "var(--text-bright)", fontSize: "18px" }}>AI Constraints & Thresholds</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                 <div>
                   <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Snake Probability Threshold: {config.snake_threshold}%</label>
                   <input type="range" min="10" max="95" value={config.snake_threshold} onChange={(e) => setConfig({...config, snake_threshold: parseInt(e.target.value)})} style={{ width: '100%', accentColor: '#ff4d4d' }} />
                 </div>
                 <div>
                   <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Snake Verification Guardrail: {config.snake_verify_threshold}%</label>
                   <input type="range" min="10" max="95" value={config.snake_verify_threshold} onChange={(e) => setConfig({...config, snake_verify_threshold: parseInt(e.target.value)})} style={{ width: '100%', accentColor: '#38bdf8' }} />
                 </div>
                 <div>
                   <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Fall Confirmation Baseline: {config.fall_threshold}%</label>
                   <input type="range" min="10" max="95" value={config.fall_threshold} onChange={(e) => setConfig({...config, fall_threshold: parseInt(e.target.value)})} style={{ width: '100%', accentColor: '#fbbf24' }} />
                 </div>
               </div>
            </div>

            {/* NEURAL SUB MODULES */}
            <div className="card" style={{ gridColumn: 'span 4' }}>
               <h3 style={{ margin: "0 0 20px 0", color: "var(--text-bright)", fontSize: "18px" }}>Neural Engine Sub-Modules</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                 {[
                    { key: "snake", label: "Venomous Reptile Engine" },
                    { key: "fall", label: "Kinematic Fall Engine" },
                    { key: "inactivity", label: "Inactivity Monitor" },
                    { key: "predictions", label: "Risk Prediction Generator" }
                 ].map(m => (
                    <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--inset-dark)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                      <span style={{ color: 'var(--text-active)', fontSize: '14px', fontWeight: 'bold' }}>{m.label}</span>
                      <input type="checkbox" checked={config.modules[m.key]} onChange={(e) => setConfig({...config, modules: {...config.modules, [m.key]: e.target.checked}})} style={{ width: '18px', height: '18px', accentColor: '#00c49f' }} />
                    </div>
                 ))}
               </div>
            </div>

            {/* GEOSPATIAL MAPPING */}
            <div className="card" style={{ gridColumn: 'span 4' }}>
               <h3 style={{ margin: "0 0 20px 0", color: "var(--text-bright)", fontSize: "18px" }}>Geospatial Targeting</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                 <div>
                   <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Active Local Zone Override</label>
                   <input type="text" value={config.active_zone} onChange={(e) => setConfig({...config, active_zone: e.target.value})} style={{ width: 'calc(100% - 24px)', padding: '12px', background: 'var(--inset-dark)', border: '1px solid var(--border-light)', color: 'var(--text-active)', borderRadius: '8px', outline: 'none' }} />
                 </div>
                 
                 <div style={{ marginTop: 'auto' }}>
                   <button onClick={() => {
                     fetch("http://127.0.0.1:5000/config", {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify(config)
                     }).then(() => alert("Configuration synced with active Neural Engine successfully."));
                   }} style={{ width: '100%', background: '#00c49f', color: '#0f172a', padding: '15px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 15px rgba(0,196,159,0.3)' }}>
                     DEPLOY HOTFIX SYNC
                   </button>
                 </div>
               </div>
            </div>

            <div className="card wide" style={{ gridColumn: 'span 12', marginTop: '10px', background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)', padding: '24px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
               <div>
                  <h3 style={{ margin: 0, color: '#ef4444', fontSize: '18px' }}>☢️ Critical Reset Zone</h3>
                  <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>Wipe all active detections, clear risk heatmaps, and reset neural probability buffers to baseline.</p>
               </div>
               <button onClick={() => {
                 if(window.confirm("Are you sure? This will wipe the active intelligence state and alerts.")) {
                   fetch("http://127.0.0.1:5000/reset", { method: 'POST' })
                   .then(() => {
                     setRiskHistory([{ time: new Date().toLocaleTimeString(), risk: 0 }]);
                     setAlertHistory([]);
                     setData(prev => ({ ...prev, snake_detected: false, fall_detected: false, inactivity: false, final_risk: "Low" }));
                     alert("System intelligence has been purged and reset to Safe state.");
                   });
                 }
               }} style={{ background: '#ef4444', color: '#fff', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 15px rgba(239,68,68,0.3)' }}>
                 PURGE INTELLIGENCE
               </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
