import React from "react";
import { NavLink, BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import FindingsTable from "./components/FindingsTable";
import FindingDetail from "./components/FindingDetail";
import ComplianceView from "./components/ComplianceView";
import TrendsView from "./components/TrendsView";

function NavItem({ to, end, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
          isActive
            ? "bg-blue-600 text-white"
            : "text-[#8b92a8] hover:text-[#e8eaf0] hover:bg-[#252b3b]"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div
        className="min-h-screen"
        style={{ backgroundColor: "var(--bg-base)" }}
      >
        {/* Top navbar */}
        <header
          style={{
            backgroundColor: "var(--bg-surface)",
            borderBottom: "1px solid var(--border)",
          }}
          className="sticky top-0 z-10"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <div className="flex items-center gap-2">
              {/* Shield icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"
                  fill="#3b82f6"
                  fillOpacity="0.2"
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                />
                <path
                  d="M9 12l2 2 4-4"
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <NavLink
                to="/"
                className="font-semibold text-[#e8eaf0] text-sm tracking-wide"
              >
                SecurePipeline <span className="text-blue-400">Hub</span>
              </NavLink>
            </div>
            <nav className="flex items-center gap-1">
              <NavItem to="/" end>
                Dashboard
              </NavItem>
              <NavItem to="/findings">Findings</NavItem>
              <NavItem to="/compliance">OWASP Coverage</NavItem>
              <NavItem to="/trends">Trends</NavItem>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/findings" element={<FindingsTable />} />
            <Route path="/findings/:id" element={<FindingDetail />} />
            <Route path="/compliance" element={<ComplianceView />} />
            <Route path="/trends" element={<TrendsView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
