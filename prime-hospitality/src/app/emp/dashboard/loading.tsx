// Shown while a dashboard route's server component resolves. It renders inside
// EmployerDashboardLayout, so the sidebar and top bar stay put and only the
// content area swaps — navigation reads as an update, not a page reload.
export default function DashboardLoading() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <style>{`
        @keyframes emp-skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .emp-skeleton {
          background: #e2e8f0;
          border-radius: 8px;
          animation: emp-skeleton-pulse 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      {/* Banner */}
      <div className="emp-skeleton" style={{ height: 96, borderRadius: 16, marginBottom: 24 }} />

      {/* Stat row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
          >
            <div className="emp-skeleton" style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="emp-skeleton" style={{ height: 9, width: "60%", marginBottom: 10 }} />
              <div className="emp-skeleton" style={{ height: 18, width: "35%" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Two panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {[0, 1].map((panel) => (
          <div
            key={panel}
            style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
              <div className="emp-skeleton" style={{ height: 12, width: 150 }} />
            </div>
            <div style={{ padding: "8px 20px 20px" }}>
              {[0, 1, 2, 3].map((row) => (
                <div key={row} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: row < 3 ? "1px solid #f8fafc" : "none" }}>
                  <div className="emp-skeleton" style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="emp-skeleton" style={{ height: 10, width: "45%", marginBottom: 7 }} />
                    <div className="emp-skeleton" style={{ height: 8, width: "28%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
