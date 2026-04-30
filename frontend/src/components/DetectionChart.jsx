import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  const RADIAN = Math.PI / 180;
  // Position slightly outside the pie for better visibility
  const radius = innerRadius + (outerRadius - innerRadius) * 1.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="#f8fafc" 
      fontSize="12" 
      fontWeight="bold"
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
    >
      {`${name}: ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function DetectionChart({ snakeCount, fallCount, inactivityCount }) {

  const total = snakeCount + fallCount + inactivityCount;

  // If no real alerts, use the user-requested distribution as "Demo/Baseline" data
  const data = total === 0 
    ? [
        { name: "Snake", value: 20, fill: "#ff4d4d" },
        { name: "Fall", value: 10, fill: "#ffa500" },
        { name: "Inactivity", value: 70, fill: "#00c49f" }
      ]
    : [
        { name: "Snake", value: snakeCount, fill: "#ff4d4d" },
        { name: "Fall", value: fallCount, fill: "#ffa500" },
        { name: "Inactivity", value: inactivityCount, fill: "#00c49f" }
      ].filter(d => d.value > 0);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          innerRadius={60}
          outerRadius={85}
          paddingAngle={8}
          stroke="none"
          cornerRadius={6}
          label={renderCustomizedLabel}
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: "#020617", 
            border: "1px solid #1e293b", 
            borderRadius: "8px",
            color: "#f8fafc" 
          }} 
        />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          iconType="circle"
          wrapperStyle={{ paddingTop: '20px', fontSize: '12px', color: '#94a3b8' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}