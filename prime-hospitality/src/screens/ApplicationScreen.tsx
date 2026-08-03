"use client";

import { useState } from "react";
import { motion, useReducedMotion, LazyMotion, domAnimation } from "framer-motion";
import { ArrowLeft, MapPin, User, Phone, Briefcase, AlertTriangle } from "lucide-react";
import { Job } from "@/data/jobs";
import EmployerAvatar from "@/components/EmployerAvatar";
import { JobSeekerProfile } from "@/data/profile";
import { useTelegram } from "@/hooks/useTelegram";
import { submitApplication, ApiError } from "@/lib/api";
import { formatPhoneForDisplay } from "@/lib/phone";
import { useT } from "@/lib/i18n";
import { yearsLabel, businessTypeLabel } from "@/lib/vocabulary";

const COVER_NOTE_MAX = 300;

interface ApplicationScreenProps {
  job: Job;
  profile: JobSeekerProfile;
  /** Held by the parent so stepping back to re-read the job doesn't discard the draft. */
  coverNote: string;
  onCoverNoteChange: (text: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export default function ApplicationScreen({
  job,
  profile,
  coverNote,
  onCoverNoteChange,
  onBack,
  onSubmit,
}: ApplicationScreenProps) {
  const t = useT();
  const shouldReduceMotion = useReducedMotion();
  const { initData } = useTelegram();
  const whyHire = coverNote;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await submitApplication({
        initData,
        jobId: job.id,
        coverNote: whyHire,
      });
      // Success — advance to confirmation screen
      onSubmit();
    } catch (error: unknown) {
      console.error("Application submit error:", error);
      if (error instanceof ApiError) {
        if (error.isDuplicate) {
          // 409 covers duplicates as well as a job that closed or expired since it
          // was opened — the server's message is the specific one, so use it.
          setSubmitError(error.message);
        } else if (error.isRateLimit) {
          setSubmitError(t("apply.errorRateLimit"));
        } else if (error.isUnauthorized) {
          setSubmitError(t("apply.errorUnauthorized"));
        } else {
          setSubmitError(error.message);
        }
      } else {
        setSubmitError(t("apply.errorGeneric"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LazyMotion features={domAnimation}>
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100dvh",
          background: "transparent",
          willChange: "transform",
          overflowY: "auto",
          overscrollBehavior: "contain",
          paddingBottom: 100,
        }}
      >
        {/* ── HEADER ── */}
        <div
          className="safe-screen-top"
          style={{
            position: "sticky", top: 0, zIndex: 10,
            background: "var(--app-bg)",
            backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            borderBottom: "1px solid var(--border)",
            paddingLeft: 20,
            paddingRight: 20,
            paddingBottom: 14,
            display: "flex", alignItems: "center", gap: 12,
          }}
        >
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            style={{
              width: 38, height: 38, borderRadius: 12,
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "var(--card-shadow)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
            }}
          >
            <ArrowLeft size={18} color="var(--text-primary)" />
          </motion.button>
          <div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, marginBottom: 1 }}>
              {t("apply.applyingTo", { business: job.businessName })}
            </p>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
              {job.title}
            </h1>
          </div>
        </div>

        <div style={{ padding: "20px 20px 0" }}>

          {/* Job summary pill */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            style={{
              background: "var(--brand-subtle)",
              border: "1px solid var(--border-active)",
              borderRadius: 14, padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 12, marginBottom: 24,
            }}
          >
            <EmployerAvatar name={job.businessName} logoUrl={job.logoUrl} size={36} radius={8} fontSize={16} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{job.title}</p>
              <p style={{ fontSize: 12, color: "var(--brand)" }}>{job.businessName} · {job.neighborhood}</p>
            </div>
          </motion.div>

          {/* Pre-filled fields */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.08 }}
          >
            <SectionLabel>{t("apply.yourInformation")}</SectionLabel>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>

              {/* Full name */}
              <PrefilledField
                icon={<User size={14} color="var(--brand)" />}
                label={t("apply.fullName")}
                preFilledLabel={t("apply.preFilled")}
                value={profile.fullName}
              />

              {/* Phone */}
              <PrefilledField
                icon={<Phone size={14} color="var(--brand)" />}
                label={t("apply.phoneNumber")}
                preFilledLabel={t("apply.preFilled")}
                value={formatPhoneForDisplay(profile.phone)}
              />

              {/* Experience */}
              <PrefilledField
                icon={<Briefcase size={14} color="var(--brand)" />}
                label={t("apply.experienceLevel")}
                preFilledLabel={t("apply.preFilled")}
                value={
                  profile.experienceContext
                    ? `${yearsLabel(profile.experienceYears, t)} · ${businessTypeLabel(profile.experienceContext, t.lang)}`
                    : yearsLabel(profile.experienceYears, t)
                }
              />

              {/* Location */}
              <div
                style={{
                  display: "flex", alignItems: "center",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12, padding: "12px 16px", gap: 10,
                }}
              >
                <MapPin size={14} color="var(--brand)" style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
                    {t("apply.location")}
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                    {t("apply.locationValue", { neighborhood: profile.neighborhood })}
                  </p>
                </div>
                {job.locationMismatch && (
                  <span
                    style={{
                      marginLeft: "auto", fontSize: 10, fontWeight: 600,
                      color: "var(--warning)",
                      background: "rgba(180,83,9,0.1)",
                      border: "1px solid rgba(180,83,9,0.2)",
                      borderRadius: 100, padding: "3px 8px", flexShrink: 0,
                    }}
                  >
                    {t("apply.locationMismatch")}
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Why hire text field */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.12 }}
            style={{ marginBottom: 24 }}
          >
            <SectionLabel>{t("apply.coverNoteLabel")}</SectionLabel>
            <textarea
              id="why-hire-field"
              className="input-base"
              placeholder={t("apply.coverNotePlaceholder", { business: job.businessName })}
              value={whyHire}
              onChange={(e) => onCoverNoteChange(e.target.value.slice(0, COVER_NOTE_MAX))}
              maxLength={COVER_NOTE_MAX}
              rows={4}
              style={{
                resize: "none",
                lineHeight: 1.6,
              }}
            />
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, textAlign: "right" }}>
              {t("apply.characterCount", { used: whyHire.length, max: COVER_NOTE_MAX })}
            </p>
          </motion.div>

          {/* Info note */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.15 }}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12, padding: "12px 14px", marginBottom: 8,
            }}
          >
            <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
              {t("apply.privacyNote", { business: job.businessName })}
            </p>
          </motion.div>
        </div>

        {/* ── STICKY FOOTER: Error banner + Submit button ── */}
        <div
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            padding: "12px 20px",
            paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
            background: "var(--surface-elevated)",
            backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            borderTop: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {/* Error banner — shown only when submission fails */}
          {submitError && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 10, padding: "10px 12px",
              }}
            >
              <AlertTriangle size={15} color="var(--error)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: "var(--error)", lineHeight: 1.5 }}>{submitError}</p>
            </motion.div>
          )}

          <motion.button
            id="submit-application-btn"
            className="btn-primary"
            whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              willChange: "transform",
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? (
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                {t("apply.submitting")}
              </motion.span>
            ) : (
              t("apply.submit")
            )}
          </motion.button>
        </div>
      </motion.div>
    </LazyMotion>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 12, fontWeight: 700, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10,
      }}
    >
      {children}
    </p>
  );
}

function PrefilledField({ icon, label, value, preFilledLabel }: { icon: React.ReactNode; label: string; value: string; preFilledLabel: string }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center",
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12, padding: "12px 16px", gap: 10,
      }}
    >
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <div>
        <p style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
          {label}
        </p>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{value}</p>
      </div>
      <span
        style={{
          marginLeft: "auto", fontSize: 10, color: "var(--text-muted)",
          background: "var(--surface-elevated)", border: "1px solid var(--border)",
          borderRadius: 6, padding: "2px 7px", flexShrink: 0, fontWeight: 500,
        }}
      >
        {preFilledLabel}
      </span>
    </div>
  );
}
