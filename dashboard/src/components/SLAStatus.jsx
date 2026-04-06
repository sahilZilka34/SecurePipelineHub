import React, { useEffect, useState } from "react";
import { getFindings } from "../api";

function statusBadgeClass(slaStatus) {
  const s = (slaStatus ?? "").toUpperCase();
  if (s === "OVERDUE") return "bg-red-100 text-red-700 border border-red-300";
  if (s === "OPEN") return "bg-green-100 text-green-700";
  if (s === "NO_SLA") return "bg-gray-100 text-gray-600";
  if (s === "RESOLVED") return "bg-green-100 text-green-700";
  if (s === "WARNING") return "bg-orange-100 text-orange-700 border border-orange-200";
  return "bg-gray-100 text-gray-600";
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
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded border bg-green-50 p-2 text-center">
          <div className="text-xs text-green-700">OPEN</div>
          <div className="text-lg font-semibold text-green-800">
            {openCount ?? 0}
          </div>
        </div>
        <div className="rounded border bg-red-50 p-2 text-center">
          <div className="text-xs text-red-700">OVERDUE</div>
          <div className="text-lg font-semibold text-red-800">
            {overdueCount ?? 0}
          </div>
        </div>
        <div className="rounded border bg-gray-50 p-2 text-center">
          <div className="text-xs text-gray-600">NO_SLA</div>
          <div className="text-lg font-semibold text-gray-800">
            {noSlaCount ?? 0}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold text-gray-700">
          Top 5 overdue findings
        </div>

        {loading && (
          <div className="text-sm text-gray-600">Loading overdue list...</div>
        )}
        {error && <div className="text-sm text-red-700">{error}</div>}

        {!loading && !error && (
          <div className="space-y-2">
            {overdueFindings.length === 0 && (
              <div className="text-sm text-gray-600">
                No overdue findings right now.
              </div>
            )}
            {overdueFindings.map((f) => {
              const raw = Number(f.days_remaining ?? 0);
              const overdueDays =
                Number.isFinite(raw) ? Math.abs(raw) : undefined;
              return (
                <div
                  key={f.id}
                  className="flex items-start justify-between gap-3 rounded border bg-white p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{f.title}</div>
                    <div className="mt-1 text-xs text-gray-600">
                      {f.file_path}:{f.line_number}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`rounded px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                        f.sla_status
                      )}`}
                    >
                      {f.sla_status}
                    </span>
                    {overdueDays !== undefined && (
                      <div className="text-xs text-red-700">
                        {overdueDays.toFixed(1)} days overdue
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

