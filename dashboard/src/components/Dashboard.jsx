import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFindings, getStats } from "../api";
import RiskChart from "./RiskChart";
import SLAStatus from "./SLAStatus";

const PRIORITY_STYLES = {
  CRITICAL: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
  HIGH: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  LOW: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  INFO: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
};

function badge(priority) {
  return (
    PRIORITY_STYLES[(priority ?? "").toUpperCase()] ?? PRIORITY_STYLES.INFO
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
      className="rounded-xl p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <span
          style={{ color: "var(--text-secondary)" }}
          className="text-xs font-medium uppercase tracking-wider"
        >
          {label}
        </span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [topFindings, setTopFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [s, top] = await Promise.all([
          getStats(),
          getFindings({ limit: 5 }),
        ]);
        if (!alive) return;
        setStats(s);
        setTopFindings(top?.findings ?? []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load dashboard data.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const overview = useMemo(() => {
    const byPriority = stats?.by_priority ?? {};
    const bySla = stats?.by_sla_status ?? {};
    return {
      total: stats?.total_findings ?? 0,
      highPriority: (byPriority?.CRITICAL ?? 0) + (byPriority?.HIGH ?? 0),
      overdue: bySla?.OVERDUE ?? 0,
      sentinelFlagged: stats?.sentinel_flagged ?? 0,
    };
  }, [stats]);

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
          style={{ color: "var(--text-secondary)" }}
          className="text-sm animate-pulse"
        >
          Loading dashboard...
        </div>
      </div>
    );

  if (error)
    return (
      <div className="rounded-xl p-6 bg-rose-500/10 border border-rose-500/30">
        <div className="text-rose-400 text-sm">{error}</div>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Findings"
          value={overview.total}
          color="text-[#e8eaf0]"
          icon="🔍"
        />
        <StatCard
          label="Critical + High"
          value={overview.highPriority}
          color="text-rose-400"
          icon="⚠️"
        />
        <StatCard
          label="Overdue"
          value={overview.overdue}
          color="text-orange-400"
          icon="⏰"
        />
        <StatCard
          label="Sentinel Flagged"
          value={overview.sentinelFlagged}
          color="text-blue-400"
          icon="🛡️"
        />
      </section>

      {/* Main grid */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Donut chart */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
          className="rounded-xl p-5 lg:col-span-1"
        >
          <div
            style={{ color: "var(--text-secondary)" }}
            className="text-xs font-medium uppercase tracking-wider mb-4"
          >
            Risk Distribution
          </div>
          <RiskChart byPriority={stats?.by_priority ?? {}} />
        </div>

        {/* Top findings + SLA */}
        <div className="lg:col-span-2 grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Top 5 */}
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
              Top 5 Highest Risk
            </div>
            <div className="space-y-2">
              {topFindings.map((f) => (
                <button
                  key={f.id}
                  style={{
                    backgroundColor: "var(--bg-hover)",
                    border: "1px solid var(--border)",
                  }}
                  className="w-full rounded-lg p-3 text-left hover:border-blue-500/50 transition-colors"
                  onClick={() => navigate(`/findings/${f.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div
                        style={{ color: "var(--text-primary)" }}
                        className="truncate text-sm font-medium"
                      >
                        {f.title}
                      </div>
                      <div
                        style={{ color: "var(--text-muted)" }}
                        className="mt-0.5 text-xs truncate"
                      >
                        {f.file_path}:{f.line_number}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${badge(f.priority)}`}
                      >
                        {f.priority}
                      </span>
                      <span
                        style={{ color: "var(--text-muted)" }}
                        className="text-xs"
                      >
                        Risk:{" "}
                        <span
                          style={{ color: "var(--text-secondary)" }}
                          className="font-semibold"
                        >
                          {f.risk_score}
                        </span>
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* SLA status */}
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
              SLA Status
            </div>
            <SLAStatus
              openCount={stats?.by_sla_status?.OPEN ?? 0}
              overdueCount={stats?.by_sla_status?.OVERDUE ?? 0}
              noSlaCount={stats?.by_sla_status?.NO_SLA ?? 0}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
