import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getFindings, getStats } from "../api";

const PAGE_SIZE = 20;

const SEVERITY_BADGE = {
  CRITICAL: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
  HIGH: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  LOW: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  INFO: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
};

const SLA_BADGE = {
  OVERDUE: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
  OPEN: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  NO_SLA: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
  RESOLVED: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  WARNING: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
};

function sevBadge(s) {
  return SEVERITY_BADGE[(s ?? "").toUpperCase()] ?? SEVERITY_BADGE.INFO;
}
function slaBadge(s) {
  return SLA_BADGE[(s ?? "").toUpperCase()] ?? SLA_BADGE.NO_SLA;
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
}

const SELECT_STYLE = {
  backgroundColor: "var(--bg-hover)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 13,
  width: "100%",
};

const INPUT_STYLE = {
  backgroundColor: "var(--bg-hover)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  borderRadius: 6,
  padding: "6px 12px",
  fontSize: 13,
  outline: "none",
  width: "100%",
};

export default function FindingsTable() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const complianceTag = searchParams.get("tag") ?? "";

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [severity, setSeverity] = useState("");
  const [source, setSource] = useState("");
  const [priority, setPriority] = useState("");
  const [slaStatus, setSlaStatus] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [findings, setFindings] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let alive = true;
    async function loadStats() {
      setStatsLoading(true);
      setStatsError("");
      try {
        const s = await getStats();
        if (!alive) return;
        setStats(s);
      } catch (e) {
        if (!alive) return;
        setStatsError(e?.message ?? "Failed to load filter options.");
      } finally {
        if (alive) setStatsLoading(false);
      }
    }
    loadStats();
    return () => {
      alive = false;
    };
  }, []);

  const filterOptions = useMemo(() => {
    const bySeverity = stats?.by_severity ?? {};
    const bySource = stats?.by_source ?? {};
    const byPriority = stats?.by_priority ?? {};
    const bySla = stats?.by_sla_status ?? {};
    return {
      severities: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].filter(
        (s) => bySeverity[s] !== undefined,
      ),
      priorities: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].filter(
        (p) => byPriority[p] !== undefined,
      ),
      sources: Object.keys(bySource).sort(),
      slaStatuses: ["OPEN", "OVERDUE", "NO_SLA", "RESOLVED", "WARNING"].filter(
        (s) => bySla[s] !== undefined,
      ),
    };
  }, [stats]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await getFindings({
          severity: severity || undefined,
          source: source || undefined,
          priority: priority || undefined,
          sla_status: slaStatus || undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });
        let rows = res?.findings ?? [];
        if (query.trim()) {
          const q = query.trim().toLowerCase();
          rows = rows.filter(
            (f) =>
              (f.title ?? "").toLowerCase().includes(q) ||
              (f.file_path ?? "").toLowerCase().includes(q),
          );
        }
        if (complianceTag) {
          rows = rows.filter((f) =>
            (f.compliance_tags ?? []).includes(complianceTag),
          );
        }
        if (!alive) return;
        setFindings(rows);
        setTotal(res?.total ?? 0);
      } catch (e) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load findings.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [severity, source, priority, slaStatus, page, query, complianceTag]);

  useEffect(() => {
    setPage(0);
  }, [severity, source, priority, slaStatus, query, complianceTag]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const clearTag = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("tag");
    setSearchParams(next);
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
        className="rounded-xl p-5"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-4">
          <div>
            <div
              style={{ color: "var(--text-primary)" }}
              className="text-sm font-semibold"
            >
              Find Vulnerabilities
            </div>
            {complianceTag && (
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-xs text-blue-400">
                  OWASP: {complianceTag}
                </span>
                <button
                  className="text-xs text-blue-400 hover:underline"
                  onClick={clearTag}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or file path..."
            style={INPUT_STYLE}
            className="md:w-72"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {[
            {
              label: "Severity",
              value: severity,
              set: setSeverity,
              opts: filterOptions.severities,
            },
            {
              label: "Source",
              value: source,
              set: setSource,
              opts: filterOptions.sources,
            },
            {
              label: "Priority",
              value: priority,
              set: setPriority,
              opts: filterOptions.priorities,
            },
            {
              label: "SLA Status",
              value: slaStatus,
              set: setSlaStatus,
              opts: filterOptions.slaStatuses,
            },
          ].map(({ label, value, set, opts }) => (
            <div key={label}>
              <div
                style={{ color: "var(--text-secondary)" }}
                className="mb-1 text-xs font-medium uppercase tracking-wider"
              >
                {label}
              </div>
              <select
                value={value}
                onChange={(e) => set(e.target.value)}
                style={SELECT_STYLE}
                disabled={statsLoading}
              >
                <option value="">All</option>
                {opts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        {statsError && (
          <div className="mt-2 text-xs text-rose-400">{statsError}</div>
        )}
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
        className="rounded-xl overflow-hidden"
      >
        <div
          style={{ borderBottom: "1px solid var(--border)" }}
          className="flex items-center justify-between px-5 py-3"
        >
          <div
            style={{ color: "var(--text-primary)" }}
            className="text-sm font-semibold"
          >
            Findings ({total})
          </div>
          <div style={{ color: "var(--text-muted)" }} className="text-xs">
            Page {page + 1} of {totalPages}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto text-sm">
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border)",
                  backgroundColor: "var(--bg-hover)",
                }}
              >
                {[
                  "Risk Score",
                  "Severity",
                  "Title",
                  "Source",
                  "Assignee",
                  "SLA Status",
                  "Due Date",
                ].map((h) => (
                  <th
                    key={h}
                    style={{ color: "var(--text-muted)" }}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ color: "var(--text-muted)" }}
                    className="px-4 py-8 text-center text-sm animate-pulse"
                  >
                    Loading...
                  </td>
                </tr>
              ) : findings.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ color: "var(--text-muted)" }}
                    className="px-4 py-8 text-center text-sm"
                  >
                    No findings match your filters.
                  </td>
                </tr>
              ) : (
                findings.map((f, i) => (
                  <tr
                    key={f.id}
                    style={{
                      borderTop: "1px solid var(--border)",
                      backgroundColor:
                        i % 2 === 0 ? "transparent" : "var(--bg-hover)",
                    }}
                    className="cursor-pointer transition-colors hover:bg-blue-500/5"
                    onClick={() => navigate(`/findings/${f.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span
                        style={{ color: "#e8eaf0" }}
                        className="font-bold text-base"
                      >
                        {f.risk_score}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${sevBadge(f.severity)}`}
                      >
                        {f.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div
                        style={{ color: "var(--text-primary)" }}
                        className="font-medium truncate"
                      >
                        {f.title}
                      </div>
                      <div
                        style={{ color: "var(--text-muted)" }}
                        className="mt-0.5 text-xs truncate"
                      >
                        {f.file_path}:{f.line_number}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        style={{ color: "var(--text-secondary)" }}
                        className="text-xs"
                      >
                        {f.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        style={{ color: "var(--text-secondary)" }}
                        className="text-xs truncate"
                      >
                        {f.assignee}
                      </div>
                      <div
                        style={{ color: "var(--text-muted)" }}
                        className="text-xs"
                      >
                        {f.assignee_team}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${slaBadge(f.sla_status)}`}
                      >
                        {f.sla_status}
                      </span>
                      {typeof f.days_remaining === "number" &&
                        (f.days_remaining < 0 ? (
                          <div className="mt-0.5 text-xs text-rose-400">
                            {Math.abs(f.days_remaining).toFixed(1)}d overdue
                          </div>
                        ) : (
                          <div
                            style={{ color: "var(--text-muted)" }}
                            className="mt-0.5 text-xs"
                          >
                            {f.days_remaining.toFixed(1)}d remaining
                          </div>
                        ))}
                    </td>
                    <td
                      style={{ color: "var(--text-secondary)" }}
                      className="px-4 py-3 text-xs"
                    >
                      {formatDate(f.due_date)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          style={{ borderTop: "1px solid var(--border)" }}
          className="flex items-center justify-between px-5 py-3"
        >
          <button
            style={{
              backgroundColor: "var(--bg-hover)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
            className="rounded px-4 py-1.5 text-xs font-medium disabled:opacity-30 hover:border-blue-500/50 transition-colors"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ← Prev
          </button>
          <div style={{ color: "var(--text-muted)" }} className="text-xs">
            Showing {findings.length} of {total}
          </div>
          <button
            style={{
              backgroundColor: "var(--bg-hover)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
            className="rounded px-4 py-1.5 text-xs font-medium disabled:opacity-30 hover:border-blue-500/50 transition-colors"
            disabled={(page + 1) * PAGE_SIZE >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
