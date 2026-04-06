import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCompliance } from "../api";

export default function ComplianceView() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await getCompliance();
        if (!alive) return;
        setData(res);
      } catch (e) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load compliance data.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="text-sm text-gray-600">Loading OWASP coverage...</div>
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

  const categories = data?.categories ?? [];
  const covered = data?.covered ?? 0;
  const total = data?.total ?? 10;
  const coveragePct = data?.coverage_pct ?? 0;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-white p-5">
        <div className="text-sm font-semibold text-gray-800">
          Coverage Summary
        </div>
        <div className="mt-2 text-sm text-gray-700">
          {covered} of {total} OWASP Top 10 categories covered
        </div>
        <div className="mt-4">
          <div className="mb-2 text-xs text-gray-600">
            {coveragePct}% coverage
          </div>
          <div className="h-3 w-full overflow-hidden rounded bg-gray-100">
            <div
              className="h-full bg-red-600"
              style={{ width: `${coveragePct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <div className="mb-3 text-sm font-semibold text-gray-800">
          OWASP Categories
        </div>
        <div className="space-y-2">
          {categories.map((c) => {
            const isCovered = c.status === "FINDINGS_PRESENT";
            return (
              <button
                key={c.category}
                className="w-full rounded border bg-white px-3 py-2 text-left hover:bg-gray-50"
                onClick={() =>
                  navigate(
                    `/findings?tag=${encodeURIComponent(c.category)}`
                  )
                }
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded text-sm font-bold ${
                        isCovered
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-gray-50 text-gray-600 border border-gray-200"
                      }`}
                    >
                      {isCovered ? "✓" : "—"}
                    </span>
                    <span className="truncate font-medium text-gray-900">
                      {c.category}
                    </span>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-xs font-semibold ${
                        isCovered ? "text-green-800" : "text-gray-600"
                      }`}
                    >
                      {isCovered ? `${c.finding_count} findings` : "Not covered"}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

