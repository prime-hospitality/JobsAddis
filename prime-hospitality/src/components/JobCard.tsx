"use client";

import React, { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, Clock, Briefcase } from "lucide-react";
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
  // resolveSalary() writes -1 for negotiable and -2 for company scale, and it
  // is the only thing that writes either. These two were the wrong way round,
  // so every job posted as Negotiable advertised itself as Per Company Scale
  // and vice versa.
  if (min === -1) return t("jobDetail.salaryNegotiable");
  if (min === -2) return t("jobDetail.salaryPerScale");
  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`;
  if (min === max) return t("jobDetail.salarySingle", { amount: fmt(min) });
  return t("jobDetail.salaryRange", { min: fmt(min), max: fmt(max) });
}

/**
 * Everything inside the card surface. Shared by the animated and the
 * reduced-motion branch below, which are otherwise identical and used to be two
 * hand-kept copies of this markup.
 */
function CardBody({ job }: { job: Job }) {
  const t = useT();

  return (
    <div
      className="card"
      style={{
        padding: 16,
        cursor: "pointer",
        marginBottom: 12,
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
            {t("jobCard.posted", { when: timeAgo(job.postedAt, t.lang) })}
          </span>
        </div>
      </div>

      {/* Description — two lines, the rest on the detail screen */}
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

      {/* Tags row.
          One line, never two: wrapping dropped the location onto a row of its
          own under the salary, where it read as a second group rather than the
          tail of this one. At 375px the three don't always fit — "Per Company
          Scale" beside "Addis Industrial Park" needs half again the width — so
          the order of who gives ground is set deliberately here.

          The salary never shrinks. The job type gives ground three times as
          fast as the location, down to a floor that always leaves "Full…" /
          "Part…" — enough to tell them apart. Weights rather than a minimum
          width on the location, so a short name like "Bole" sits in a badge its
          own size instead of one padded out to a reserved width. */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
        {/* Salary */}
        <span
          className="badge badge-salary"
          style={{ flexShrink: 0, whiteSpace: "nowrap", padding: "4px 9px" }}
        >
          {formatSalary(job.salaryMin, job.salaryMax, t)}
        </span>

        {/* Job type */}
        <span
          className="badge badge-navy"
          style={{ flexShrink: 3, minWidth: 62, overflow: "hidden", padding: "4px 9px" }}
        >
          <Briefcase size={9} style={{ flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {job.jobType}
          </span>
        </span>

        {/* Location */}
        <span
          className="badge badge-navy"
          style={{ flexShrink: 1, minWidth: 0, overflow: "hidden", padding: "4px 9px" }}
        >
          <MapPin size={9} style={{ flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {job.neighborhood}
          </span>
        </span>
      </div>

      {/* Location mismatch — its own row, so it can never push the three above
          it out of shape. Nothing in production sets this today. */}
      {job.locationMismatch && (
        <div style={{ display: "flex", marginTop: 6 }}>
          <span className="badge badge-warning">
            📍 Location mismatch
          </span>
        </div>
      )}
    </div>
  );
}

const JobCard = memo(function JobCard({ job, onClick, index, enableAnimations = true, skipEntranceAnimation = false }: JobCardProps) {
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

  // Advisory: the card is never dimmed, hidden, or made unclickable by this.
  if (!enableAnimations) {
    return (
      <div
        onClick={() => onClick(job)}
        style={{ position: "relative" }}
      >
        <CardBody job={job} />
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
      <CardBody job={job} />
    </motion.div>
  );
});

export default JobCard;
