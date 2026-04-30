import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function WeeklyRiskTrends({ data }) {

  const displayData = (data && data.length > 0) ? data : [
    { day: "Mon", Risk: 0 },
    { day: "Tue", Risk: 0 },
    { day: "Wed", Risk: 0 },
    { day: "Thu", Risk: 0 },
    { day: "Fri", Risk: 0 },
    { day: "Sat", Risk: 0 },
    { day: "Sun", Risk: 0 },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={displayData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis 
          dataKey="day" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: "#94a3b8", fontSize: 12 }} 
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: "#94a3b8", fontSize: 12 }} 
          domain={[0, 1]}
          ticks={[0, 0.25, 0.5, 0.75, 1]}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", borderRadius: "8px", color: "#f8fafc" }}
        />
        <Area 
          type="monotone" 
          dataKey="Risk" 
          stroke="#38bdf8" 
          strokeWidth={3}
          fillOpacity={1} 
          fill="url(#colorRisk)" 
          animationDuration={1500}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
