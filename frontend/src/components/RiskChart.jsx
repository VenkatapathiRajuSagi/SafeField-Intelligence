import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

const CustomDot = (props) => {
  const { cx, cy, payload, index, dataLength } = props;
  
  // Only the last dot (active point) pulses
  const isLast = index === dataLength - 1;

  if (payload.snake) {
    return <text x={cx} y={cy} dy={5} textAnchor="middle" fontSize={14} style={{ filter: isLast ? "drop-shadow(0 0 8px #ef4444)" : "none" }}>🔴</text>;
  }
  if (payload.fall) {
    return <text x={cx} y={cy} dy={5} textAnchor="middle" fontSize={14} style={{ filter: isLast ? "drop-shadow(0 0 8px #f59e0b)" : "none" }}>🟡</text>;
  }
  if (payload.inactivity) {
    return <text x={cx} y={cy} dy={5} textAnchor="middle" fontSize={14} style={{ filter: isLast ? "drop-shadow(0 0 8px #38bdf8)" : "none" }}>🔵</text>;
  }

  if (isLast) {
     return (
       <g>
         <circle cx={cx} cy={cy} r={6} fill="#38bdf8" stroke="#fff" strokeWidth={2} />
         <circle cx={cx} cy={cy} r={12} fill="#38bdf8" opacity={0.3}>
           <animate attributeName="r" from="6" to="16" dur="1.5s" repeatCount="indefinite" />
           <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite" />
         </circle>
       </g>
     );
  }

  return null;
};

export default function RiskChart({ history }) {
  const dataLength = history?.length || 0;

  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={history}>
          <defs>
            <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
            </linearGradient>
          </defs>

          <CartesianGrid stroke="rgba(148,163,184,0.1)" strokeDasharray="4 4" vertical={false} />

          <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />

          <YAxis
            domain={[0, 2]}
            ticks={[0, 1, 2]}
            tickFormatter={(value) => value === 0 ? "Low" : value === 1 ? "Med" : "High"}
            tick={{ fill: "#64748b", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
            itemStyle={{ color: "#38bdf8", fontWeight: "bold" }}
          />

          <Area 
            type="monotone" 
            dataKey="risk" 
            stroke="#38bdf8" 
            strokeWidth={3} 
            fillOpacity={1} 
            fill="url(#colorRisk)"
            animationBegin={400}
            animationDuration={1500}
            dot={<CustomDot dataLength={dataLength} />}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "10px", fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>
        <span>🔴 Snake</span>
        <span>🟡 Fall</span>
        <span>🔵 Inactive</span>
      </div>
    </div>
  );
}
