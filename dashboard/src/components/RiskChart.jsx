import React, { useMemo } from "react";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = {
  CRITICAL: "#f43f5e",
  HIGH: "#fb923c",
  MEDIUM: "#facc15",
  LOW: "#34d399",
  INFO: "#475569",
};

export default function RiskChart({ byPriority }) {
  const data = useMemo(() => {
    const src = byPriority ?? {};
    return ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]
      .map((key) => ({
        name: key,
        value: Number(src[key] ?? 0),
        color: COLORS[key],
      }))
      .filter((d) => d.value > 0);
  }, [byPriority]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <div
        className="relative mx-auto"
        style={{ width: "100%", maxWidth: 260 }}
      >
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Tooltip
              formatter={(value, name) => [value, name]}
              contentStyle={{
                backgroundColor: "#1e2436",
                border: "1px solid #2e3650",
                borderRadius: 8,
                color: "#e8eaf0",
                fontSize: 12,
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div style={{ color: "#e8eaf0" }} className="text-2xl font-bold">
            {total}
          </div>
          <div style={{ color: "#555e78" }} className="text-xs">
            total
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-sm"
                style={{ background: d.color }}
              />
              <span style={{ color: "#8b92a8" }}>{d.name}</span>
            </div>
            <span style={{ color: "#e8eaf0" }} className="font-semibold">
              {d.value}
            </span>
          </div>
        ))}
      </div>

      {total === 0 && (
        <div style={{ color: "#555e78" }} className="mt-3 text-center text-xs">
          No data.
        </div>
      )}
    </div>
  );
}
