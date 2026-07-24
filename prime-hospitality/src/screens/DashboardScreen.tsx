"use client";

import { LazyMotion, domAnimation, motion } from "framer-motion";

// The Telegram Mini App employer dashboard is being rebuilt into a
// focused job-posting tool (employers will manage everything else from
// the web dashboard). Everything that used to live here -- job list,
// post/edit/delete forms, applicant stats -- has been removed until that
// rebuild happens.
export default function DashboardScreen({ onJobSelect }: { onJobSelect?: (jobId: string, jobTitle: string) => void }) {
  void onJobSelect;

  return (
    <LazyMotion features={domAnimation}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100dvh",
          background: "transparent",
          padding: "40px 32px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 80, height: 80, borderRadius: 24,
            background: "var(--brand-subtle)",
            border: "1px solid rgba(34, 197, 94, 0.2)",
            boxShadow: "var(--card-shadow)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36, marginBottom: 20,
          }}
        >
          📊
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6, letterSpacing: "-0.02em" }}>
          Employer Dashboard
        </h2>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--brand)", marginBottom: 12 }}>
          Coming Soon
        </p>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 280 }}>
          We&apos;re rebuilding this into a focused job-posting tool. In the meantime, manage your postings from the employer web dashboard.
        </p>
      </motion.div>
    </LazyMotion>
  );
}
