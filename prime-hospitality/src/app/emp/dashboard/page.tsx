import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import RenewSubscriptionButton from "./RenewSubscriptionButton";
import { verifySessionValue } from "@/lib/signedSession";
import { isSubscriptionExpired } from "@/lib/subscriptionStatus";

async function getSession() {
  const sessionCookie = (await cookies()).get("employer_session");
  return verifySessionValue(sessionCookie?.value);
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
      return { ...a, jobTitle: job?.title || "Unknown Job", job_id: job?.id };
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

async function getRenewalStatus(employerId: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("employers")
    .select("package_expires_at, renewal_requested_at, renewal_seen_at")
    .eq("id", employerId)
    .maybeSingle();

  const expiresAt = data?.package_expires_at ? new Date(data.package_expires_at) : null;
  const isExpired = isSubscriptionExpired(data?.package_expires_at);
  // Keep nudging on Overview/Jobs both in the 24h run-up to expiry and after
  // it's actually passed -- posting stays blocked either way until renewed.
  const showNudge = !expiresAt || expiresAt.getTime() - Date.now() <= 24 * 60 * 60 * 1000;

  return { isExpired, showNudge, renewalRequestedAt: data?.renewal_requested_at ?? null, renewalSeenAt: data?.renewal_seen_at ?? null };
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", border: "1px solid #E2E5EC", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#9AA1B1", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#141821", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
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
  const renewal = await getRenewalStatus(session.employerId);

  const statusBg: Record<string, string> = {
    active: "#E7F7EE", pending: "#FDF1E7", shortlisted: "#EEF3FC", rejected: "#fee2e2", reviewed: "#D9E5F8",
  };
  const statusColor: Record<string, string> = {
    active: "#0E8442", pending: "#B45309", shortlisted: "#113978", rejected: "#E5484D", reviewed: "#164A9C",
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>

      {/* Welcome Banner */}
      <div style={{ background: "linear-gradient(135deg, #141821 0%, #212630 100%)", borderRadius: 16, padding: "24px 28px", marginBottom: 24, color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            Welcome back, {session.businessName}!
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", margin: "6px 0 0 0" }}>Here&apos;s an overview of your recruitment activity</p>
        </div>
        <Link
          href="/emp/dashboard/jobs"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 10, padding: "10px 18px", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", backdropFilter: "blur(8px)", transition: "background 0.2s" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Post a Job
        </Link>
      </div>

      {/* Subscription renewal nudge */}
      {renewal.showNudge && (
        <div style={{ background: renewal.isExpired ? "#FDECEC" : "#fffbeb", border: `1px solid ${renewal.isExpired ? "#fecaca" : "#fde68a"}`, borderRadius: 14, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, color: renewal.isExpired ? "#E5484D" : "#B45309" }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
              {renewal.isExpired ? "Your subscription has expired" : "Your subscription expires in less than 24 hours"}
            </p>
            <p style={{ fontSize: 13, margin: "4px 0 0 0", opacity: 0.9 }}>
              {renewal.isExpired
                ? "You can still manage your existing jobs and applicants, but posting new jobs is disabled until you renew."
                : "Once it ends, posting new jobs will be disabled until you renew."}
            </p>
          </div>
          <RenewSubscriptionButton employerId={session.employerId} initialRequestedAt={renewal.renewalRequestedAt} initialSeenAt={renewal.renewalSeenAt} />
        </div>
      )}

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard
          label="Total Applications"
          value={data.totalApplications}
          color="#1B5CBF"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard
          label="Active Job Postings"
          value={data.activePostings}
          color="#12A150"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>}
        />
        <StatCard
          label="New Applicants Today"
          value={data.newToday}
          color="#164A9C"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>}
        />
        <StatCard
          label="Pending Review"
          value={data.pendingApps}
          color="#B45309"
          icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
      </div>

      {/* Bottom grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Active Job Postings */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E5EC", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #EFF1F5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#141821", margin: 0 }}>Active Job Postings</h3>
            <Link href="/emp/dashboard/jobs" style={{ fontSize: 12, fontWeight: 600, color: "#1B5CBF", textDecoration: "none" }}>View all →</Link>
          </div>
          {data.activeJobs.length === 0 ? (
            <div style={{ padding: "36px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ color: "#9AA1B1", marginBottom: 16 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
              </div>
              <p style={{ fontSize: 14, color: "#9AA1B1", fontWeight: 500 }}>No active job postings yet</p>
              <Link href="/emp/dashboard/jobs" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, background: "#EEF3FC", border: "1px solid #D9E5F8", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#1B5CBF", textDecoration: "none" }}>
                Post your first job
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F7F8FA" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9AA1B1", textTransform: "uppercase", letterSpacing: "0.05em" }}>Job Title</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9AA1B1", textTransform: "uppercase", letterSpacing: "0.05em" }}>Applications</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9AA1B1", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activeJobs.slice(0, 5).map((job: any) => (
                    <tr key={job.id} style={{ borderTop: "1px solid #EFF1F5" }}>
                      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#141821" }}>{job.title}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#6E7686" }}>{(job.applications || []).length}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#E7F7EE", color: "#0E8442" }}>Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Applications */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E5EC", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #EFF1F5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#141821", margin: 0 }}>Incoming Applications</h3>
            <Link href="/emp/dashboard/applicants" style={{ fontSize: 12, fontWeight: 600, color: "#1B5CBF", textDecoration: "none" }}>View all →</Link>
          </div>
          {data.recentApplications.length === 0 ? (
            <div style={{ padding: "36px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ color: "#9AA1B1", marginBottom: 16 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <p style={{ fontSize: 14, color: "#9AA1B1", fontWeight: 500 }}>No applications yet</p>
            </div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {data.recentApplications.map((app: any) => (
                <Link key={app.id} href={`/emp/dashboard/applicants?job=${app.job_id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid #F7F8FA", textDecoration: "none", color: "inherit" }}>
                  {/* Avatar */}
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #1B5CBF, #4A80D3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                    {(app.profiles?.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#141821", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {app.profiles?.full_name || "Anonymous"}
                    </div>
                    <div style={{ fontSize: 11, color: "#9AA1B1", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.jobTitle}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: statusBg[app.status] || "#EFF1F5", color: statusColor[app.status] || "#6E7686", textTransform: "capitalize" }}>
                      {app.status}
                    </span>
                    <span style={{ fontSize: 10, color: "#CBD0DA" }}>{fmtTime(app.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
