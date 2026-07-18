import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

async function getSession() {
  const sessionCookie = (await cookies()).get("employer_session");
  if (!sessionCookie?.value) return null;
  try {
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
  return createClient(supabaseUrl, supabaseServiceKey);
};

async function getDashboardData(employerId: string) {
  const supabase = getSupabase();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, status, location, created_at, deadline, applications(id, status, created_at, profiles(full_name, telegram_id, phone_number))")
    .eq("employer_id", employerId)
    .order("created_at", { ascending: false });

  const allJobs = jobs || [];
  const activeJobs = allJobs.filter((j: any) => j.status === "active");
  const pendingJobs = allJobs.filter((j: any) => j.status === "pending");
  const allApplications = allJobs.flatMap((j: any) => j.applications || []);
  const pendingApps = allApplications.filter((a: any) => a.status === "pending");

  const recentApplications = allApplications
    .map((a: any) => {
      const job = allJobs.find((j: any) => j.applications?.some((app: any) => app.id === a.id));
      return { ...a, jobTitle: job?.title || "Unknown Job" };
    })
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  return {
    totalApplications: allApplications.length,
    activePostings: activeJobs.length,
    pendingReview: pendingJobs.length,
    newToday: allApplications.filter((a: any) => {
      const d = new Date(a.created_at);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length,
    recentApplications,
    activeJobs,
    pendingApps: pendingApps.length,
  };
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  );
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default async function EmployerDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/emp");

  const data = await getDashboardData(session.employerId);

  const statusBg: Record<string, string> = {
    active: "#d1fae5", pending: "#fef3c7", shortlisted: "#ede9fe", rejected: "#fee2e2", reviewed: "#dbeafe",
  };
  const statusColor: Record<string, string> = {
    active: "#065f46", pending: "#92400e", shortlisted: "#5b21b6", rejected: "#991b1b", reviewed: "#1e40af",
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>

      {/* Welcome Banner */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", borderRadius: 16, padding: "24px 28px", marginBottom: 24, color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            Welcome back, {session.businessName}!
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", margin: "6px 0 0 0" }}>Here&apos;s an overview of your recruitment activity</p>
        </div>
        <a
          href="/emp/dashboard/jobs"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 10, padding: "10px 18px", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", backdropFilter: "blur(8px)", transition: "background 0.2s" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Post a Job
        </a>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard
          label="Total Applications"
          value={data.totalApplications}
          color="#0284c7"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard
          label="Active Job Postings"
          value={data.activePostings}
          color="#059669"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>}
        />
        <StatCard
          label="New Applicants Today"
          value={data.newToday}
          color="#7c3aed"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>}
        />
        <StatCard
          label="Pending Review"
          value={data.pendingApps}
          color="#d97706"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
      </div>

      {/* Bottom grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Active Job Postings */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Active Job Postings</h3>
            <a href="/emp/dashboard/jobs" style={{ fontSize: 12, fontWeight: 600, color: "#0284c7", textDecoration: "none" }}>View all →</a>
          </div>
          {data.activeJobs.length === 0 ? (
            <div style={{ padding: "36px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ color: "#94a3b8", marginBottom: 16 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
              </div>
              <p style={{ fontSize: 14, color: "#94a3b8", fontWeight: 500 }}>No active job postings yet</p>
              <a href="/emp/dashboard/jobs" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#0284c7", textDecoration: "none" }}>
                Post your first job
              </a>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Job Title</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Applications</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activeJobs.slice(0, 5).map((job: any) => (
                    <tr key={job.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{job.title}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#64748b" }}>{(job.applications || []).length}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#d1fae5", color: "#065f46" }}>Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Applications */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Incoming Applications</h3>
            <a href="/emp/dashboard/applicants" style={{ fontSize: 12, fontWeight: 600, color: "#0284c7", textDecoration: "none" }}>View all →</a>
          </div>
          {data.recentApplications.length === 0 ? (
            <div style={{ padding: "36px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ color: "#94a3b8", marginBottom: 16 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <p style={{ fontSize: 14, color: "#94a3b8", fontWeight: 500 }}>No applications yet</p>
            </div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {data.recentApplications.map((app: any) => (
                <div key={app.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid #f8fafc" }}>
                  {/* Avatar */}
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                    {(app.profiles?.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {app.profiles?.full_name || "Anonymous"}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.jobTitle}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: statusBg[app.status] || "#f1f5f9", color: statusColor[app.status] || "#64748b", textTransform: "capitalize" }}>
                      {app.status}
                    </span>
                    <span style={{ fontSize: 10, color: "#cbd5e1" }}>{fmtTime(app.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
