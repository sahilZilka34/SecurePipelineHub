import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFindings, getStats } from "../api";
import RiskChart from "./RiskChart";
import SLAStatus from "./SLAStatus";

function badgeClassByPriority(priority) {
  const p = (priority ?? "").toUpperCase();
  if (p === "CRITICAL") return "bg-red-700 text-white";
  if (p === "HIGH") return "bg-red-500 text-white";
  if (p === "MEDIUM") return "bg-orange-400 text-white";
  if (p === "LOW") return "bg-yellow-400 text-black";
  if (p === "INFO") return "bg-gray-400 text-white";
  return "bg-gray-200 text-gray-800";
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
      highPriority: byPriority?.HIGH ?? 0,
      overdue: bySla?.OVERDUE ?? 0,
      sentinelFlagged: stats?.sentinel_flagged ?? 0,
    };
  }, [stats]);

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="text-sm text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">Total Findings</div>
          <div className="mt-2 text-3xl font-semibold">{overview.total}</div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">High Priority</div>
          <div className="mt-2 text-3xl font-semibold text-red-600">
            {overview.highPriority}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">Overdue</div>
          <div className="mt-2 text-3xl font-semibold text-orange-600">
            {overview.overdue}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-gray-600">Sentinel Flagged</div>
          <div className="mt-2 text-3xl font-semibold text-purple-700">
            {overview.sentinelFlagged}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-lg border bg-white p-4">
            <div className="mb-2 text-sm font-semibold text-gray-800">
              Risk Distribution
            </div>
            <RiskChart byPriority={stats?.by_priority ?? {}} />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-lg border bg-white p-4">
              <div className="mb-3 text-sm font-semibold text-gray-800">
                Top 5 Highest Risk
              </div>
              <div className="space-y-3">
                {topFindings.map((f) => (
                  <button
                    key={f.id}
                    className="w-full rounded-md border bg-gray-50 p-3 text-left hover:bg-gray-100"
                    onClick={() => navigate(`/findings/${f.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gray-900">
                          {f.title}
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          {f.file_path}:{f.line_number}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`rounded px-2 py-1 text-xs font-semibold ${badgeClassByPriority(
                            f.priority
                          )}`}
                        >
                          {f.priority ?? "UNKNOWN"}
                        </span>
                        <div className="text-xs text-gray-700">
                          Risk: <span className="font-semibold">{f.risk_score}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-white p-4">
              <div className="mb-3 text-sm font-semibold text-gray-800">
                SLA Status
              </div>
              <SLAStatus
                openCount={stats?.by_sla_status?.OPEN ?? 0}
                overdueCount={stats?.by_sla_status?.OVERDUE ?? 0}
                noSlaCount={stats?.by_sla_status?.NO_SLA ?? 0}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

