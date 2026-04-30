import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";

export default function RiskGauge({ risk }) {

  const riskValue =
    risk === "Low" ? 30 :
    risk === "Medium" ? 60 :
    90;

  const data = [{ name: "Risk", value: riskValue }];

  return (
    <ResponsiveContainer width="100%" height={250}>
      <RadialBarChart
        innerRadius="60%"
        outerRadius="100%"
        data={data}
        startAngle={180}
        endAngle={0}
      >
        <RadialBar dataKey="value" fill="#ff4d4d" />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}