import React, { useEffect, useState } from "react";
import { getFindings } from "../api";

function statusBadge(slaStatus) {
  const s = (slaStatus ?? "").toUpperCase();
  if (s === "OVERDUE")
    return "bg-rose-500/20 text-rose-400 border border-rose-500/30";
  if (s === "OPEN")
    return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
  if (s === "NO_SLA")
    return "bg-slate-500/20 text-slate-400 border border-slate-500/30";
  if (s === "RESOLVED")
    return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
  if (s === "WARNING")
    return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
  return "bg-slate-500/20 text-slate-400";
}

export default function SLAStatus({ openCount, overdueCount, noSlaCount }) {
  const [overdueFindings, setOverdueFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await getFindings({ sla_status: "OVERDUE", limit: 5 });
        if (!alive) return;
        setOverdueFindings(res?.findings ?? []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load SLA details.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Counters */}
      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: "OPEN",
            value: openCount,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10 border-emerald-500/20",
          },
          {
            label: "OVERDUE",
            value: overdueCount,
            color: "text-rose-400",
            bg: "bg-rose-500/10 border-rose-500/20",
          },
          {
            label: "NO SLA",
            value: noSlaCount,
            color: "text-slate-400",
            bg: "bg-slate-500/10 border-slate-500/20",
          },
        ].map(({ label, value, color, bg }) => (
          <div
            key={label}
            className={`rounded-lg border p-2 text-center ${bg}`}
          >
            <div className={`text-xs font-medium ${color}`}>{label}</div>
            <div className={`text-xl font-bold ${color}`}>{value ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Overdue list */}
      <div>
        <div
          style={{ color: "var(--text-secondary)" }}
          className="mb-2 text-xs font-medium uppercase tracking-wider"
        >
          Top 5 overdue findings
        </div>

        {loading && (
          <div
            style={{ color: "var(--text-muted)" }}
            className="text-xs animate-pulse"
          >
            Loading...
          </div>
        )}
        {error && <div className="text-xs text-rose-400">{error}</div>}

        {!loading && !error && (
          <div className="space-y-2">
            {overdueFindings.length === 0 && (
              <div style={{ color: "var(--text-muted)" }} className="text-xs">
                No overdue findings.
              </div>
            )}
            {overdueFindings.map((f) => {
              const raw = Number(f.days_remaining ?? 0);
              const overdueDays = Number.isFinite(raw)
                ? Math.abs(raw)
                : undefined;
              return (
                <div
                  key={f.id}
                  style={{
                    backgroundColor: "var(--bg-hover)",
                    border: "1px solid var(--border)",
                  }}
                  className="rounded-lg p-2.5 flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div
                      style={{ color: "var(--text-primary)" }}
                      className="truncate text-xs font-medium"
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
                      className={`rounded px-1.5 py-0.5 text-xs font-semibold ${statusBadge(f.sla_status)}`}
                    >
                      {f.sla_status}
                    </span>
                    {overdueDays !== undefined && (
                      <div className="text-xs text-rose-400">
                        {overdueDays.toFixed(1)}d overdue
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
