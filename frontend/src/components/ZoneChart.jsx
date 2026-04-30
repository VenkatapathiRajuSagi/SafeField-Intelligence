import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: "#020617", border: "1px solid #1e293b", padding: "12px", color: "#f8fafc", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
        <p style={{ margin: "0 0 8px 0", fontWeight: "bold", borderBottom: "1px solid #334155", paddingBottom: "6px" }}>{label}</p>
        
        {payload.map((p, index) => (
          p.value > 0 && (
            <div key={index} style={{ display: "flex", justifyContent: "space-between", gap: "15px", margin: "4px 0", fontSize: "12px" }}>
              <span style={{ color: "#94a3b8" }}>{p.name}</span>
              <span style={{ color: p.color, fontWeight: "bold" }}>{p.value}</span>
            </div>
          )
        ))}

        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", margin: "8px 0 0", fontSize: "13px", color: "#f8fafc", borderTop: "1px solid #334155", paddingTop: "6px", fontWeight: "bold" }}>
          <span>Total Incidents</span>
          <span style={{ color: "#38bdf8" }}>{payload.reduce((sum, p) => sum + p.value, 0)}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function ZoneChart({ data }) {
  const defaultData = [
    { name: "Field A", Snake: 0, Fall: 0, Inactivity: 0 },
  ];

  const chartData = data && data.length > 0 ? data : defaultData;

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
        <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis dataKey="name" type="category" tick={{ fill: "#f8fafc", fontWeight: "600", fontSize: 13 }} width={80} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
        
        {/* Stacked Bars representing different incident types */}
        <Bar dataKey="Snake" stackId="zone" fill="#ff4d4d" barSize={24} />
        <Bar dataKey="Fall" stackId="zone" fill="#f59e0b" barSize={24} />
        <Bar dataKey="Inactivity" stackId="zone" fill="#38bdf8" barSize={24} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
