import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getFinding, updateFinding } from "../api";

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
  return d.toLocaleString();
}

export default function FindingDetail() {
  const { id } = useParams();
  const [finding, setFinding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const f = await getFinding(id);
        if (!alive) return;
        setFinding(f);
      } catch (e) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load finding.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [id]);

  const riskFactorRows = useMemo(() => {
    const rf = finding?.risk_factors ?? {};
    return Object.entries(rf).map(([k, v]) => ({ key: k, value: v }));
  }, [finding]);

  const markResolved = async () => {
    if (!finding) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateFinding(id, { sla_status: "RESOLVED" });
      setFinding(updated);
    } catch (e) {
      setError(e?.message ?? "Failed to mark as resolved.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="text-sm text-gray-600">Loading finding...</div>
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

  if (!finding) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="text-sm text-gray-600">Finding not found.</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-gray-900">
              {finding.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded px-3 py-1 text-xs font-semibold ${badgeClassBySeverity(
                  finding.severity
                )}`}
              >
                {finding.severity}
              </span>
              <span className="text-xs text-gray-600">
                Risk Score:{" "}
                <span className="font-semibold text-gray-900">
                  {finding.risk_score}
                </span>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <span className={`inline-flex items-center rounded px-3 py-1 text-xs font-semibold ${statusBadgeClass(
              finding.sla_status
            )}`}>
              {finding.sla_status}
            </span>

            <div className="text-xs text-gray-600">
              Due:{" "}
              <span className="font-medium text-gray-900">
                {formatDate(finding.due_date)}
              </span>
            </div>

            {typeof finding.days_remaining === "number" && (
              <div
                className={`text-xs ${
                  finding.days_remaining < 0
                    ? "text-red-700"
                    : "text-gray-700"
                }`}
              >
                {finding.days_remaining < 0
                  ? `${Math.abs(finding.days_remaining).toFixed(
                      1
                    )} days overdue`
                  : `${finding.days_remaining.toFixed(1)} days remaining`}
              </div>
            )}

            <button
              className="mt-2 rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              disabled={saving || (finding.sla_status ?? "").toUpperCase() === "RESOLVED"}
              onClick={markResolved}
            >
              {saving ? "Updating..." : "Mark as Resolved"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-lg border bg-white p-5 lg:col-span-2">
          <div className="text-sm font-semibold text-gray-800">
            Location
          </div>
          <div className="mt-2 text-sm text-gray-700">
            <span className="font-medium text-gray-900">
              {finding.file_path}
            </span>
            :{finding.line_number}
          </div>

          <div className="mt-4 text-sm font-semibold text-gray-800">
            Description
          </div>
          <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
            {finding.description}
          </p>

          {finding.code_snippet && (
            <>
              <div className="mt-4 text-sm font-semibold text-gray-800">
                Code Snippet
              </div>
              <pre className="mt-2 overflow-x-auto rounded bg-gray-100 p-3 text-xs text-gray-800">
                {finding.code_snippet}
              </pre>
            </>
          )}

          <div className="mt-4 text-sm font-semibold text-gray-800">
            Remediation
          </div>
          <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
            {finding.remediation}
          </p>

          <div className="mt-4 text-sm font-semibold text-gray-800">
            Risk Score Breakdown
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full table-auto text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2">Factor</th>
                  <th className="px-3 py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {riskFactorRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-sm text-gray-600" colSpan={2}>
                      No risk factors available.
                    </td>
                  </tr>
                ) : (
                  riskFactorRows.map((row) => (
                    <tr key={row.key} className="border-t">
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {row.key}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {typeof row.value === "object"
                          ? JSON.stringify(row.value)
                          : String(row.value)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border bg-white p-5">
            <div className="text-sm font-semibold text-gray-800">
              Compliance Tags
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(finding.compliance_tags ?? []).length === 0 ? (
                <div className="text-sm text-gray-600">None</div>
              ) : (
                finding.compliance_tags.map((t) => (
                  <span
                    key={t}
                    className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-800 border border-green-200"
                    title={t}
                  >
                    {t}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-5">
            <div className="text-sm font-semibold text-gray-800">
              Assignment
            </div>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <div>
                <div className="text-xs font-medium text-gray-500">
                  Assignee
                </div>
                <div className="font-medium text-gray-900">
                  {finding.assignee ?? "-"}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-500">
                  Team
                </div>
                <div className="font-medium text-gray-900">
                  {finding.assignee_team ?? "-"}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-500">
                  Method
                </div>
                <div className="font-medium text-gray-900">
                  {finding.assignment_method ?? "-"}
                </div>
              </div>

              {finding.codeowners_pattern && (
                <div>
                  <div className="text-xs font-medium text-gray-500">
                    Codeowners pattern
                  </div>
                  <div className="font-medium text-gray-900">
                    {finding.codeowners_pattern}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-5">
            <div className="text-sm font-semibold text-gray-800">
              Metadata
            </div>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <div>
                <div className="text-xs font-medium text-gray-500">
                  Source
                </div>
                <div className="font-medium text-gray-900">
                  {finding.source ?? "-"}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500">
                  Detected At
                </div>
                <div className="font-medium text-gray-900">
                  {formatDate(finding.detected_at)}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500">
                  Sentinel Escalate
                </div>
                <div className="font-medium text-gray-900">
                  {finding.sentinel_escalate ? "Yes" : "No"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

