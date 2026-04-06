import React, { useMemo } from "react";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = {
  HIGH: "#ef4444",
  MEDIUM: "#f97316",
  LOW: "#eab308",
  INFO: "#6b7280",
  CRITICAL: "#b91c1c",
};

export default function RiskChart({ byPriority }) {
  const data = useMemo(() => {
    const src = byPriority ?? {};
    const order = ["HIGH", "MEDIUM", "LOW", "INFO"];
    return order.map((key) => ({
      name: key,
      value: Number(src[key] ?? 0),
      color: COLORS[key],
    }));
  }, [byPriority]);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div>
      <div className="mx-auto" style={{ width: "100%", maxWidth: 320 }}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Tooltip
              formatter={(value) => [`${value}`, "count"]}
              contentStyle={{ background: "rgba(255,255,255,0.95)" }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={65}
              outerRadius={95}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: d.color }}
              />
              <span className="font-medium">{d.name}</span>
            </div>
            <span className="font-semibold text-gray-900">
              {d.value}
            </span>
          </div>
        ))}
      </div>

      {total === 0 && (
        <div className="mt-3 text-center text-xs text-gray-500">
          No data available.
        </div>
      )}
    </div>
  );
}

