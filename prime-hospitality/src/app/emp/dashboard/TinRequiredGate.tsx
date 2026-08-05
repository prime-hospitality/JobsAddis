"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveEmployerTin } from "../actions";
import { TIN_LENGTH, normalizeTin, validateTin } from "@/lib/ethiopianTin";

/** One-time TIN collection for employers who onboarded before the TIN became
 *  required -- new accounts supply it on the /emp setup screen instead. Fully
 *  blocking rather than a dismissible banner: the whole point is that no
 *  employer keeps posting jobs without a TIN on file. */
export default function TinRequiredGate({ businessName }: { businessName: string }) {
  const router = useRouter();
  const [tin, setTin] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const invalid = validateTin(tin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid) return setError(invalid);

    setSaving(true);
    setError("");
    try {
      const result = await saveEmployerTin(tin);
      if (!result.success) {
        setError(result.error || "Failed to save your TIN number.");
        return;
      }
      // The gate lives in the layout, so a refresh is what re-runs the check
      // and lets the real dashboard render.
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; }
        .tin-input:focus { outline: none; border-color: #1B5CBF; box-shadow: 0 0 0 3px rgba(27,92,191,0.12); }
        @keyframes tinSpin { to { transform: rotate(360deg); } }
        .tin-spin { animation: tinSpin 1s linear infinite; }
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#F2F012", border: "1px solid #E2E5EC", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <img src="/addis_jobs_logo.webp" alt="JobsAdis" style={{ width: 28, height: 28, objectFit: "contain" }} />
          </div>
          <div>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", display: "block", lineHeight: 1 }}>JobsAdis</span>
            <div style={{ fontSize: 11, color: "#6E7686", fontWeight: 600, marginTop: 4 }}>EMPLOYER DASHBOARD</div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: "#fff",
            border: "1px solid #E2E5EC",
            borderRadius: 24,
            padding: "36px 32px",
            width: "100%",
            maxWidth: 440,
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "#EEF3FC", border: "1px solid #D9E5F8",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 20,
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#164A9C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M8 12h8"/><path d="M8 16h5"/></svg>
          </div>

          <h1 style={{ fontSize: 21, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em", marginBottom: 8, lineHeight: 1.25 }}>
            Add your TIN number
          </h1>
          <p style={{ fontSize: 13.5, color: "#6E7686", lineHeight: 1.6, marginBottom: 24 }}>
            Before you continue, {businessName} needs a Taxpayer Identification Number on file. Enter the {TIN_LENGTH}-digit TIN exactly as printed on your TIN certificate.
          </p>

          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4b5563", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            TIN Number
          </label>
          <input
            className="tin-input"
            type="text"
            inputMode="numeric"
            autoFocus
            value={tin}
            onChange={(e) => { setTin(normalizeTin(e.target.value).replace(/\D/g, "").slice(0, TIN_LENGTH)); setError(""); }}
            placeholder={`${TIN_LENGTH}-digit TIN`}
            style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1.5px solid #E2E5EC", background: "#fff", color: "#111827", fontSize: 16, fontWeight: 600, fontFamily: "Inter, sans-serif", letterSpacing: "0.1em", transition: "border-color .15s, box-shadow .15s" }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "10px 12px", borderRadius: 10, background: "#F7F8FA", border: "1px solid #EFF1F5" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6E7686" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span style={{ fontSize: 12, color: "#6E7686", lineHeight: 1.5 }}>
              Kept private — job seekers never see your TIN. Only the JobsAdis admin team can view it.
            </span>
          </div>

          {error && <p style={{ marginTop: 14, fontSize: 13, color: "#E5484D" }}>{error}</p>}

          <button
            type="submit"
            disabled={saving || !!invalid}
            style={{
              width: "100%", marginTop: 20, padding: "15px", borderRadius: 12, border: "none",
              background: saving || invalid ? "#F8F78A" : "#F2F012",
              color: "#141821", fontSize: 15, fontWeight: 700,
              cursor: saving || invalid ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {saving ? (
              <>
                <svg className="tin-spin" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Saving…
              </>
            ) : (
              <>Save & Continue</>
            )}
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 12, color: "#6E7686", textAlign: "center" }}>
          Powered by <span style={{ color: "#111827", fontWeight: 600 }}>JobsAdis Platform</span>
        </p>
      </div>
    </>
  );
}
