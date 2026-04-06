import React, { useEffect, useState } from "react";
import { getTrends } from "../api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = {
  CRITICAL: "#f43f5e",
  HIGH: "#fb923c",
  MEDIUM: "#facc15",
  LOW: "#34d399",
  INFO: "#64748b",
  total: "#3b82f6",
};

const TOOLTIP_STYLE = {
  backgroundColor: "#1e2436",
  border: "1px solid #2e3650",
  borderRadius: 8,
  color: "#e8eaf0",
  fontSize: 12,
};

const GRID_COLOR = "#2e3650";
const TICK_COLOR = "#555e78";

function MetricCard({ label, value, color }) {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
      className="rounded-xl p-5"
    >
      <div
        style={{ color: "var(--text-secondary)" }}
        className="text-xs font-medium uppercase tracking-wider mb-3"
      >
        {label}
      </div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

export default function TrendsView() {
  const [trends, setTrends] = useState([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getTrends(days);
        if (!alive) return;
        setTrends(data?.trends ?? []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load trends.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [days]);

  const totalFindings = trends.reduce((s, d) => s + d.total, 0);
  const daysWithFindings = trends.filter((d) => d.total > 0).length;
  const avgPerDay =
    daysWithFindings > 0 ? (totalFindings / daysWithFindings).toFixed(1) : "0";
  const peakDay = trends.reduce((max, d) => (d.total > max.total ? d : max), {
    total: 0,
    date: "—",
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [, month, day] = dateStr.split("-");
    return `${day}/${month}`;
  };

  if (loading)
    return (
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
        className="rounded-xl p-8 text-center"
      >
        <div
          style={{ color: "var(--text-muted)" }}
          className="text-sm animate-pulse"
        >
          Loading trends...
        </div>
      </div>
    );

  if (error)
    return (
      <div className="rounded-xl p-5 bg-rose-500/10 border border-rose-500/30">
        <div className="text-rose-400 text-sm">{error}</div>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          style={{ color: "var(--text-primary)" }}
          className="text-lg font-semibold"
        >
          Trends
        </h2>
        <div className="flex items-center gap-1">
          <span style={{ color: "var(--text-muted)" }} className="text-xs mr-2">
            Show last
          </span>
          {[7, 14, 30, 60].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={
                days === d
                  ? {
                      backgroundColor: "#3b82f6",
                      color: "#fff",
                      border: "1px solid #3b82f6",
                    }
                  : {
                      backgroundColor: "var(--bg-hover)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border)",
                    }
              }
              className="rounded px-3 py-1 text-xs font-medium transition-colors"
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard
          label={`Total Findings (last ${days}d)`}
          value={totalFindings}
          color="text-[#e8eaf0]"
        />
        <MetricCard
          label="Avg Findings / Active Day"
          value={avgPerDay}
          color="text-blue-400"
        />
        <MetricCard
          label="Peak Day"
          value={
            peakDay.total > 0 ? `${peakDay.total} on ${peakDay.date}` : "—"
          }
          color="text-rose-400"
        />
      </div>

      {/* Total over time */}
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
        className="rounded-xl p-5"
      >
        <div
          style={{ color: "var(--text-secondary)" }}
          className="text-xs font-medium uppercase tracking-wider mb-4"
        >
          Total Findings Over Time
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={trends}
            margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fill: TICK_COLOR }}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: TICK_COLOR }}
              width={32}
            />
            <Tooltip
              labelFormatter={(l) => `Date: ${l}`}
              contentStyle={TOOLTIP_STYLE}
            />
            <Line
              type="monotone"
              dataKey="total"
              name="Total"
              stroke={COLORS.total}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* By severity */}
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
        className="rounded-xl p-5"
      >
        <div
          style={{ color: "var(--text-secondary)" }}
          className="text-xs font-medium uppercase tracking-wider mb-4"
        >
          Findings by Severity Over Time
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={trends}
            margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fill: TICK_COLOR }}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: TICK_COLOR }}
              width={32}
            />
            <Tooltip
              labelFormatter={(l) => `Date: ${l}`}
              contentStyle={TOOLTIP_STYLE}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#8b92a8" }} />
            {["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[key]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
