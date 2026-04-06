import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getFindings, getStats } from "../api";

const PAGE_SIZE = 20;

function badgeClassBySeverity(severity) {
  const s = (severity ?? "").toUpperCase();
  if (s === "CRITICAL") return "bg-red-700 text-white";
  if (s === "HIGH") return "bg-red-500 text-white";
  if (s === "MEDIUM") return "bg-orange-400 text-white";
  if (s === "LOW") return "bg-yellow-400 text-black";
  if (s === "INFO") return "bg-gray-400 text-white";
  return "bg-gray-200 text-gray-800";
}

function statusBadgeClass(slaStatus) {
  const s = (slaStatus ?? "").toUpperCase();
  if (s === "OVERDUE") return "bg-red-100 text-red-700 border border-red-300";
  if (s === "OPEN") return "bg-green-100 text-green-700";
  if (s === "NO_SLA") return "bg-gray-100 text-gray-600";
  if (s === "RESOLVED") return "bg-green-100 text-green-700";
  if (s === "WARNING") return "bg-orange-100 text-orange-700 border border-orange-200";
  return "bg-gray-100 text-gray-600";
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

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

    const severityOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
    const priorityOrder = ["HIGH", "MEDIUM", "LOW", "INFO"];
    const slaOrder = ["OPEN", "OVERDUE", "NO_SLA", "RESOLVED", "WARNING"];

    return {
      severities: severityOrder.filter((s) => bySeverity[s] !== undefined),
      priorities: priorityOrder.filter((p) => byPriority[p] !== undefined),
      sources: Object.keys(bySource).sort(),
      slaStatuses: slaOrder.filter((s) =>
        (stats?.by_sla_status ? stats.by_sla_status[s] : undefined) !==
        undefined
      ),
    };
  }, [stats]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const offset = page * PAGE_SIZE;
        const res = await getFindings({
          severity: severity || undefined,
          source: source || undefined,
          priority: priority || undefined,
          sla_status: slaStatus || undefined,
          limit: PAGE_SIZE,
          offset,
        });

        let rows = res?.findings ?? [];

        // Apply local filtering for search + OWASP category selection.
        if (query.trim()) {
          const q = query.trim().toLowerCase();
          rows = rows.filter((f) => {
            const title = (f.title ?? "").toLowerCase();
            const path = (f.file_path ?? "").toLowerCase();
            return title.includes(q) || path.includes(q);
          });
        }
        if (complianceTag) {
          rows = rows.filter((f) =>
            (f.compliance_tags ?? []).includes(complianceTag)
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

  // Reset to first page when filter/search changes.
  useEffect(() => {
    setPage(0);
  }, [severity, source, priority, slaStatus, query, complianceTag]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const clearComplianceTag = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("tag");
    setSearchParams(next);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-800">
              Find Vulnerabilities
            </div>
            {complianceTag && (
              <div className="flex items-center gap-2">
                <span className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                  OWASP filter: {complianceTag}
                </span>
                <button
                  className="text-xs font-medium text-red-700 hover:underline"
                  onClick={clearComplianceTag}
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or file path..."
              className="w-full rounded border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-gray-600">
              Severity
            </div>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full rounded border bg-white px-3 py-2 text-sm"
              disabled={statsLoading}
            >
              <option value="">All</option>
              {filterOptions.severities.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-gray-600">Source</div>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full rounded border bg-white px-3 py-2 text-sm"
              disabled={statsLoading}
            >
              <option value="">All</option>
              {filterOptions.sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-gray-600">
              Priority
            </div>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded border bg-white px-3 py-2 text-sm"
              disabled={statsLoading}
            >
              <option value="">All</option>
              {filterOptions.priorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <div className="mb-1 text-xs font-medium text-gray-600">
              SLA Status
            </div>
            <select
              value={slaStatus}
              onChange={(e) => setSlaStatus(e.target.value)}
              className="w-full rounded border bg-white px-3 py-2 text-sm"
              disabled={statsLoading}
            >
              <option value="">All</option>
              {filterOptions.slaStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        {statsError && (
          <div className="mt-3 text-sm text-red-700">{statsError}</div>
        )}
      </div>

      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="text-sm font-semibold text-gray-800">
            Findings ({total})
          </div>
          <div className="text-xs text-gray-600">
            Page {page + 1} of {totalPages}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3">Risk Score</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">SLA Status</th>
                <th className="px-4 py-3">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-center" colSpan={7}>
                    Loading...
                  </td>
                </tr>
              ) : findings.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-600" colSpan={7}>
                    No findings match your filters.
                  </td>
                </tr>
              ) : (
                findings.map((f) => (
                  <tr
                    key={f.id}
                    className="cursor-pointer border-t hover:bg-red-50/30"
                    onClick={() => navigate(`/findings/${f.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {f.risk_score}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded px-2 py-1 text-xs font-semibold ${badgeClassBySeverity(
                          f.severity
                        )}`}
                      >
                        {f.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {f.title}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        {f.file_path}:{f.line_number}
                      </div>
                    </td>
                    <td className="px-4 py-3">{f.source}</td>
                    <td className="px-4 py-3">
                      <div className="truncate">{f.assignee}</div>
                      <div className="mt-1 text-xs text-gray-600">
                        {f.assignee_team}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                          f.sla_status
                        )}`}
                      >
                        {f.sla_status}
                      </span>
                      {typeof f.days_remaining === "number" &&
                        (f.days_remaining < 0 ? (
                          <div className="mt-1 text-xs text-red-700">
                            {Math.abs(f.days_remaining).toFixed(1)}d overdue
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-gray-600">
                            {f.days_remaining.toFixed(1)}d remaining
                          </div>
                        ))}
                    </td>
                    <td className="px-4 py-3">{formatDate(f.due_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
          <button
            className="rounded border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Prev
          </button>

          <div className="text-xs text-gray-600">
            Showing {findings.length} of {total} (page results may be filtered locally)
          </div>

          <button
            className="rounded border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={(page + 1) * PAGE_SIZE >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

