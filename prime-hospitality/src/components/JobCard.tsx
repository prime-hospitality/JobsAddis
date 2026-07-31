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
