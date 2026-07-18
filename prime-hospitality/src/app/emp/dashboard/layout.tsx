import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import EmployerDashboardLayout from "./EmployerDashboardLayout";
import { validateEmployerSession, logoutEmployer } from "../actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Employer Dashboard | Addis Jobs",
  description: "Manage your job postings, track applicants, and view analytics on the Addis Jobs Employer Dashboard.",
};

async function getSession() {
  const sessionCookie = (await cookies()).get("employer_session");
  if (!sessionCookie?.value) return null;
  try {
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect("/emp");
  }

  // Re-validate employer still exists in DB and is not rejected
  const validation = await validateEmployerSession();

  if (!validation.valid) {
    // Clear the stale cookie
    await logoutEmployer();

    const isDeleted = validation.reason === "deleted";

    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', sans-serif; }
          .contact-row { display: flex; align-items: center; gap: 12px; padding: 14px 16px; text-decoration: none; transition: background 0.15s; }
          .contact-row:hover { background: #f0fdf4; }
          .contact-row-tg:hover { background: #eff6ff !important; }
          .back-link { font-size: 13px; color: #6b7280; background: none; border: none; cursor: pointer; font-family: 'Inter', sans-serif; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; text-decoration: none; transition: color 0.15s; }
          .back-link:hover { color: #374151; }
        `}</style>
        <div style={{
          minHeight: "100vh",
          background: "#f9fafb",
          backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fff", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <img src="/addis_jobs_logo_mark_only.svg" alt="Addis Jobs" style={{ width: 28, height: 28, objectFit: "contain" }} />
            </div>
            <div>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>Addis Jobs</span>
              <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginTop: 1 }}>EMPLOYER DASHBOARD</div>
            </div>
          </div>

          {/* Card */}
          <div style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 24,
            padding: "40px 36px",
            width: "100%",
            maxWidth: 420,
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}>
            {/* Icon */}
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: isDeleted ? "#fffbeb" : "#fef2f2",
              border: `2px solid ${isDeleted ? "#fde68a" : "#fecaca"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20,
            }}>
              {isDeleted ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
              )}
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em", marginBottom: 8, lineHeight: 1.2 }}>
              {isDeleted ? "Account Not Found" : "Account Rejected"}
            </h1>
            <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, marginBottom: 28, maxWidth: 300 }}>
              {isDeleted
                ? "Your employer account could not be found. It may have been removed. Please contact the Addis Jobs team for assistance."
                : `Your employer account has been reviewed and rejected by the Addis Jobs team. Please contact support for more information.`}
            </p>

            {/* Contact card */}
            <div style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", marginBottom: 28 }}>
              <div style={{
                padding: "10px 16px", borderBottom: "1px solid #e2e8f0",
                background: isDeleted ? "#fefce8" : "#fef2f2",
                borderTop: `3px solid ${isDeleted ? "#fbbf24" : "#fca5a5"}`,
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: isDeleted ? "#92400e" : "#991b1b", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>Contact Support</p>
              </div>
              {/* Phone */}
              <a
                href="tel:+251911234567"
                className="contact-row"
                style={{ borderBottom: "1px solid #f1f5f9" }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.37 2 2 0 0 1 3.68 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.65a16 16 0 0 0 6.04 6.04l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", margin: 0, marginBottom: 2 }}>Phone</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>+251 911 234 567</p>
                </div>
                <svg style={{ marginLeft: "auto" }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </a>
              {/* Telegram */}
              <a
                href="https://t.me/AddisjobsSupport"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-row contact-row-tg"
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </div>
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", margin: 0, marginBottom: 2 }}>Telegram</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>@AddisjobsSupport</p>
                </div>
                <svg style={{ marginLeft: "auto" }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </a>
            </div>

            <a href="/emp" className="back-link">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Back to sign in
            </a>
          </div>

          <p style={{ marginTop: 28, fontSize: 12, color: "#6b7280", textAlign: "center" }}>
            Powered by <span style={{ color: "#111827", fontWeight: 600 }}>Addis Jobs Platform</span>
          </p>
        </div>
      </>
    );
  }

  return (
    <EmployerDashboardLayout session={session}>
      {children}
    </EmployerDashboardLayout>
  );
}

