import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import EmployerDashboardLayout from "./EmployerDashboardLayout";
import TinRequiredGate from "./TinRequiredGate";
import { validateEmployerSession, removeEmployerAccount, employerNeedsTin } from "../actions";
import { verifySessionValue } from "@/lib/signedSession";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Employer Dashboard | JobsAdis",
  description: "Manage your job postings, track applicants, and view analytics on the JobsAdis Employer Dashboard.",
};

async function getSession() {
  const sessionCookie = (await cookies()).get("employer_session");
  return verifySessionValue(sessionCookie?.value);
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect("/emp");
  }

  // Re-validate employer still exists in DB and is not rejected
  const validation = await validateEmployerSession();

  if (!validation.valid) {
    // Drop just this account -- if another saved account is still valid,
    // fall back to it instead of taking out every account on this browser.
    const removal = await removeEmployerAccount(session.employerId);
    if (!removal.loggedOut) {
      redirect("/emp/dashboard");
    }

    const isDeleted = validation.reason === "deleted";

    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', sans-serif; }
          .contact-row { display: flex; align-items: center; gap: 12px; padding: 14px 16px; text-decoration: none; transition: background 0.15s; }
          .contact-row:hover { background: #EEF3FC; }
          .contact-row-tg:hover { background: #EEF3FC !important; }
          .back-link { font-size: 13px; color: #6E7686; background: none; border: none; cursor: pointer; font-family: 'Inter', sans-serif; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; text-decoration: none; transition: color 0.15s; }
          .back-link:hover { color: #343A46; }
        `}</style>
        <div style={{
          minHeight: "100vh",
          background: "#F7F8FA",
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
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#F2F012", border: "1px solid #E2E5EC", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <img src="/addis_jobs_logo.webp" alt="JobsAdis" style={{ width: 28, height: 28, objectFit: "contain" }} />
            </div>
            <div>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", display: "block", lineHeight: 1 }}>JobsAdis</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#1B5CBF", letterSpacing: "0.03em", display: "block", marginTop: 2 }}>Where Talent Meets Opportunity</span>
              <div style={{ fontSize: 11, color: "#6E7686", fontWeight: 600, marginTop: 4 }}>EMPLOYER DASHBOARD</div>
            </div>
          </div>

          {/* Card */}
          <div style={{
            background: "#fff",
            border: "1px solid #E2E5EC",
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
              background: isDeleted ? "#fffbeb" : "#FDECEC",
              border: `2px solid ${isDeleted ? "#fde68a" : "#fecaca"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20,
            }}>
              {isDeleted ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E5484D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
              )}
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em", marginBottom: 8, lineHeight: 1.2 }}>
              {isDeleted ? "Account Not Found" : "Account Rejected"}
            </h1>
            <p style={{ fontSize: 14, color: "#6E7686", lineHeight: 1.6, marginBottom: 28, maxWidth: 300 }}>
              {isDeleted
                ? "Your employer account could not be found. It may have been removed. Please contact the JobsAdis team for assistance."
                : `Your employer account has been reviewed and rejected by the JobsAdis team. Please contact support for more information.`}
            </p>

            {/* Contact card */}
            <div style={{ width: "100%", background: "#F7F8FA", border: "1px solid #E2E5EC", borderRadius: 14, overflow: "hidden", marginBottom: 28 }}>
              <div style={{
                padding: "10px 16px", borderBottom: "1px solid #E2E5EC",
                background: isDeleted ? "#FDF1E7" : "#FDECEC",
                borderTop: `3px solid ${isDeleted ? "#B45309" : "#F2A0A2"}`,
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: isDeleted ? "#B45309" : "#E5484D", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>Contact Support</p>
              </div>
              {/* Phone */}
              <a
                href="tel:+251911234567"
                className="contact-row"
                style={{ borderBottom: "1px solid #EFF1F5" }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#EEF3FC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#164A9C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.37 2 2 0 0 1 3.68 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.65a16 16 0 0 0 6.04 6.04l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#9AA1B1", margin: 0, marginBottom: 2 }}>Phone</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>+251 911 234 567</p>
                </div>
                <svg style={{ marginLeft: "auto" }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AA1B1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </a>
              {/* Telegram */}
              <a
                href="https://t.me/AddisjobsSupport"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-row contact-row-tg"
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#D9E5F8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </div>
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#9AA1B1", margin: 0, marginBottom: 2 }}>Telegram</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>@AddisjobsSupport</p>
                </div>
                <svg style={{ marginLeft: "auto" }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AA1B1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </a>
            </div>

            <a href="/emp" className="back-link">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Back to sign in
            </a>
          </div>

          <p style={{ marginTop: 28, fontSize: 12, color: "#6E7686", textAlign: "center" }}>
            Powered by <span style={{ color: "#111827", fontWeight: 600 }}>JobsAdis Platform</span>
          </p>
        </div>
      </>
    );
  }

  // Employers onboarded before the TIN was required have none on file; block
  // the whole dashboard on a one-time form rather than letting them keep
  // posting jobs without one. New accounts supply it during /emp setup, so
  // they never land here.
  if (await employerNeedsTin()) {
    return <TinRequiredGate businessName={session.businessName} />;
  }

  return (
    <EmployerDashboardLayout session={session}>
      {children}
    </EmployerDashboardLayout>
  );
}

