"use client";

import React, { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, Clock, Briefcase, AlertTriangle } from "lucide-react";
import { Job } from "@/data/jobs";
import EmployerAvatar from "@/components/EmployerAvatar";
import { useT, timeAgo, type Translate } from "@/lib/i18n";

interface JobCardProps {
  job: Job;
  onClick: (job: Job) => void;
  index: number;
  enableAnimations?: boolean;
  skipEntranceAnimation?: boolean;
}

/** Compact salary for the card, e.g. "ETB 8k–12k/mo". */
function formatSalary(min: number, max: number, t: Translate): string {
  if (min === -1) return t("jobDetail.salaryPerScale");
  if (min === -2) return t("jobDetail.salaryNegotiable");
  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`;
  if (min === max) return t("jobDetail.salarySingle", { amount: fmt(min) });
  return t("jobDetail.salaryRange", { min: fmt(min), max: fmt(max) });
}

const JobCard = memo(function JobCard({ job, onClick, index, enableAnimations = true, skipEntranceAnimation = false }: JobCardProps) {
  const t = useT();
  const shouldReduceMotion = useReducedMotion();
  const skipAnimations = !enableAnimations || shouldReduceMotion;

  const cardVariants = {
    hidden: { 
      opacity: (skipAnimations || skipEntranceAnimation) ? 1 : 0, 
      y: (skipAnimations || skipEntranceAnimation) ? 0 : 16 
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.25,
        delay: skipEntranceAnimation ? 0 : Math.min(index * 0.05, 0.3),
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  const isUnqualified = !job.qualificationsMet;

  if (!enableAnimations) {
    return (
      <div
        onClick={() => onClick(job)}
        style={{ position: "relative" }}
      >
        {/* Dim overlay for unqualified jobs */}
        {isUnqualified && (
          <div className="qualification-dim" />
        )}

        {/* Unqualified badge */}
        {isUnqualified && (
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 3,
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 100,
              padding: "3px 8px",
              fontSize: 10,
              fontWeight: 600,
              color: "#FCA5A5",
            }}
          >
            <AlertTriangle size={10} />
            {t("jobCard.requirementsNotMet")}
          </div>
        )}

        <div
          className="card"
          style={{
            padding: 16,
            cursor: "pointer",
            marginBottom: 12,
            opacity: isUnqualified ? 0.75 : 1,
          }}
        >
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
            {/* Business logo */}
            <EmployerAvatar name={job.businessName} logoUrl={job.logoUrl} size={48} radius={12} />

            {/* Business + title */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginBottom: 2,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {job.businessName}
              </p>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: 1.2,
                  marginBottom: 4,
                }}
              >
                {job.title}
              </h3>

              {/* Posted tag */}
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <Clock size={10} />
                Posted {timeAgo(job.postedAt, t.lang)}
              </span>
            </div>
          </div>

          {/* Description */}
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              marginBottom: 12,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {job.description}
          </p>

          {/* Tags row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {/* Salary */}
            <span className="badge badge-brand">
              {formatSalary(job.salaryMin, job.salaryMax, t)}
            </span>

            {/* Job type */}
            <span className="badge badge-navy">
              <Briefcase size={9} />
              {job.jobType}
            </span>

            {/* Location */}
            <span className="badge badge-navy">
              <MapPin size={9} />
              {job.neighborhood}
            </span>

            {/* Location mismatch */}
            {job.locationMismatch && (
              <span className="badge badge-warning">
                📍 Location mismatch
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileTap={skipAnimations ? {} : { scale: 0.98 }}
      onClick={() => onClick(job)}
      style={{ willChange: "transform", position: "relative" }}
    >
      {/* Dim overlay for unqualified jobs */}
      {isUnqualified && (
        <div className="qualification-dim" />
      )}

      {/* Unqualified badge */}
      {isUnqualified && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 3,
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 100,
            padding: "3px 8px",
            fontSize: 10,
            fontWeight: 600,
            color: "#FCA5A5",
          }}
        >
          <AlertTriangle size={10} />
          {t("jobCard.requirementsNotMet")}
        </div>
      )}

      <div
        className="card"
        style={{
          padding: 16,
          cursor: "pointer",
          marginBottom: 12,
          opacity: isUnqualified ? 0.75 : 1,
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          {/* Business logo */}
          <EmployerAvatar name={job.businessName} logoUrl={job.logoUrl} size={48} radius={12} />

          {/* Business + title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginBottom: 2,
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {job.businessName}
            </p>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.2,
                marginBottom: 4,
              }}
            >
              {job.title}
            </h3>

            {/* Posted tag */}
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Clock size={10} />
              Posted {timeAgo(job.postedAt, t.lang)}
            </span>
          </div>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
            marginBottom: 12,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {job.description}
        </p>

        {/* Tags row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {/* Salary */}
          <span className="badge badge-brand">
            {formatSalary(job.salaryMin, job.salaryMax, t)}
          </span>

          {/* Job type */}
          <span className="badge badge-navy">
            <Briefcase size={9} />
            {job.jobType}
          </span>

          {/* Location */}
          <span className="badge badge-navy">
            <MapPin size={9} />
            {job.neighborhood}
          </span>

          {/* Location mismatch */}
          {job.locationMismatch && (
            <span className="badge badge-warning">
              📍 Location mismatch
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default JobCard;
