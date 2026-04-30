import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    // Find the total which is plotted by the line
    const totalItem = payload.find(p => p.dataKey === "Total");
    const bars = payload.filter(p => p.dataKey !== "Total" && p.value > 0);

    return (
      <div style={{ backgroundColor: "#020617", border: "1px solid #1e293b", padding: "12px", color: "#f8fafc", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", minWidth: "150px" }}>
        <p style={{ margin: "0 0 8px 0", fontWeight: "bold", borderBottom: "1px solid #334155", paddingBottom: "6px" }}>{label}</p>
        
        {bars.map((p, index) => (
          <div key={index} style={{ display: "flex", justifyContent: "space-between", gap: "15px", margin: "4px 0", fontSize: "12px" }}>
            <span style={{ color: "#94a3b8" }}>{p.name}</span>
            <span style={{ color: p.color, fontWeight: "bold" }}>{p.value}</span>
          </div>
        ))}

        {totalItem && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", margin: "8px 0 0", fontSize: "13px", color: "#f8fafc", borderTop: "1px solid #334155", paddingTop: "6px", fontWeight: "bold" }}>
            <span>Total Volume</span>
            <span style={{ color: totalItem.color }}>{totalItem.value}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function DailyAlertsChart({ data }) {
  
  const defaultData = [
    { day: "Day 1", Snake: 0, Fall: 0, Inactivity: 0 },
    { day: "Day 2", Snake: 0, Fall: 0, Inactivity: 0 },
    { day: "Day 3", Snake: 0, Fall: 0, Inactivity: 0 },
  ];

  const processedData = (data && data.length > 0) ? data.map(d => ({
    ...d,
    Total: (d.Snake || 0) + (d.Fall || 0) + (d.Inactivity || 0)
  })) : defaultData.map(d => ({ ...d, Total: 0 }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={processedData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis 
          dataKey="day" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: "#94a3b8", fontSize: 11 }} 
          dy={10}
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: "#94a3b8", fontSize: 11 }} 
          dx={-10}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
        <Legend 
          iconType="circle"
          wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }}
        />
        
        {/* Stacked volumetric bars */}
        <Bar dataKey="Snake" stackId="a" fill="#ff4d4d" barSize={30} />
        <Bar dataKey="Fall" stackId="a" fill="#f59e0b" barSize={30} />
        <Bar dataKey="Inactivity" stackId="a" fill="#38bdf8" barSize={30} radius={[4, 4, 0, 0]} />
        
        {/* Weekly Trend Line overlay */}
        <Line 
          type="monotone" 
          dataKey="Total" 
          name="Trend" 
          stroke="#a855f7" 
          strokeWidth={3} 
          dot={{ r: 4, fill: "#a855f7", stroke: "#0f172a", strokeWidth: 2 }} 
          activeDot={{ r: 6, fill: "#fff", stroke: "#a855f7" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
