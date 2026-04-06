import React from "react";
import { NavLink, BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import FindingsTable from "./components/FindingsTable";
import FindingDetail from "./components/FindingDetail";
import ComplianceView from "./components/ComplianceView";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `font-semibold ${
                  isActive ? "text-red-600" : "text-gray-900"
                }`
              }
            >
              SecurePipeline Hub
            </NavLink>
            <nav className="flex items-center gap-4 text-sm">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `rounded px-2 py-1 ${
                    isActive ? "bg-red-50 text-red-700" : "hover:bg-gray-100"
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/findings"
                className={({ isActive }) =>
                  `rounded px-2 py-1 ${
                    isActive ? "bg-red-50 text-red-700" : "hover:bg-gray-100"
                  }`
                }
              >
                Findings
              </NavLink>
              <NavLink
                to="/compliance"
                className={({ isActive }) =>
                  `rounded px-2 py-1 ${
                    isActive ? "bg-red-50 text-red-700" : "hover:bg-gray-100"
                  }`
                }
              >
                OWASP Coverage
              </NavLink>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/findings" element={<FindingsTable />} />
            <Route path="/findings/:id" element={<FindingDetail />} />
            <Route path="/compliance" element={<ComplianceView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
