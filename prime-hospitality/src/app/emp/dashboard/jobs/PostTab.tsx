"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, MapPin, Briefcase, Users, Clock, CalendarClock, CheckCircle2, Radio, Hourglass, ListChecks, ListFilter, RotateCw, UserCheck, AlertTriangle } from "lucide-react";
import { createEmployerJob, updateEmployerJobPost, deleteEmployerJob, repostEmployerJob, markJobAsFilled, boostJobToGroup } from "./actions";
import VacancyFormModal from "./VacancyFormModal";
import { VacancyFormState, emptyVacancyForm, jobRowToForm } from "./vacancyShared";
import { StatusPill, MetaChip, Stat, STATUS_META, salaryLabel, AttentionModal, ConfirmModal, GroupRepostIcon } from "./postingUI";
import type { PostingData } from "./ManageJobPostingsTab";
import EmployerAvatar from "@/components/EmployerAvatar";
import FilterSelect from "@/components/FilterSelect";
import { isSubscriptionExpired } from "@/lib/subscriptionStatus";
import { startOfAddisDay } from "@/lib/addisDay";

export default function PostTab({ data, loading, reload }: { data: PostingData; loading: boolean; reload: () => Promise<void>; }) {
  const { jobs, autoPublish, dailyPostLimit, packageExpiresAt, businessName, logoUrl, groupBoostsPerDay } = data;
  const subscriptionExpired = isSubscriptionExpired(packageExpiresAt);

  const [formModal, setFormModal] = useState<{ mode: "create" | "edit" | "repost"; jobId?: string; value: VacancyFormState } | null>(null);
  const [focusDeadlineOnOpen, setFocusDeadlineOnOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [fillTarget, setFillTarget] = useState<{ id: string; title: string } | null>(null);
  const [filling, setFilling] = useState(false);
  const [boostTarget, setBoostTarget] = useState<{ id: string; title: string; used: number } | null>(null);
  const [boosting, setBoosting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const closeFormModal = () => { setFormModal(null); setFocusDeadlineOnOpen(false); };
  const openEditForExtend = (job: any) => { setFocusDeadlineOnOpen(true); setFormModal({ mode: "edit", jobId: job.id, value: jobRowToForm(job) }); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteEmployerJob(deleteTarget.id);
      if (!res.success) { setDeleteTarget(null); setErrorModal(res.error || "Failed to delete job."); return; }
      setDeleteTarget(null);
      setSuccessNote("Job posting deleted.");
      setTimeout(() => setSuccessNote(null), 4000);
      await reload();
    } finally {
      setDeleting(false);
    }
  };

  const handleMarkFilled = async () => {
    if (!fillTarget) return;
    setFilling(true);
    try {
      const res = await markJobAsFilled(fillTarget.id);
      if (!res.success) { setFillTarget(null); setErrorModal(res.error || "Failed to update job."); return; }
      setFillTarget(null);
      setSuccessNote("Job marked as filled.");
      setTimeout(() => setSuccessNote(null), 4000);
      await reload();
    } finally {
      setFilling(false);
    }
  };

  const handleBoost = async () => {
    if (!boostTarget) return;
    setBoosting(true);
    try {
      const res = await boostJobToGroup(boostTarget.id);
      if (!res.success) { setBoostTarget(null); setErrorModal(res.error || "Failed to repost to the group."); return; }
      setBoostTarget(null);
      const left = res.limit - res.used;
      setSuccessNote(
        `Reposting to the Telegram group — it'll appear within a minute. ` +
        (left > 0 ? `${left} more today.` : `That's all for today.`)
      );
      setTimeout(() => setSuccessNote(null), 6000);
      await reload();
    } finally {
      setBoosting(false);
    }
  };

  // Mirror the server counter: reposts count as today's posts via last_posted_at,
  // and "today" is an Addis day on both sides so this can't disagree with the
  // limit actually being enforced.
  const postedToday = jobs.filter((j) => new Date(j.last_posted_at ?? j.created_at) >= startOfAddisDay()).length;
  const liveCount = jobs.filter((j) => j.status === "active").length;
  const reviewCount = jobs.filter((j) => j.status === "pending").length;
  const scheduledCount = jobs.filter((j) => j.status === "scheduled").length;
  const limitReached = dailyPostLimit !== -1 && postedToday >= dailyPostLimit;

  const filteredJobs = statusFilter === "all" ? jobs : jobs.filter((j) => j.status === statusFilter);

  const handleRepostClick = (job: any, focusDeadline = false) => {
    if (limitReached) {
      setErrorModal(`You've reached your daily posting limit of ${dailyPostLimit} job${dailyPostLimit === 1 ? "" : "s"}. Please try again tomorrow.`);
      return;
    }
    setFocusDeadlineOnOpen(focusDeadline);
    setFormModal({ mode: "repost", jobId: job.id, value: { ...jobRowToForm(job), deadline: "" } });
  };

  const handleSubmit = async () => {
    if (!formModal) return;
    setSaving(true);
    try {
      if (formModal.mode === "create") {
        const res = await createEmployerJob(formModal.value);
        if (!res.success) { setErrorModal(res.error || "Something went wrong."); return; }
        closeFormModal();
        setSuccessNote(res.status === "active" ? "Job posted and is now live!" : "Job submitted — it will go live once reviewed.");
      } else if (formModal.mode === "repost") {
        const res = await repostEmployerJob(formModal.jobId!, formModal.value);
        if (!res.success) { setErrorModal(res.error || "Something went wrong."); return; }
        closeFormModal();
        setSuccessNote(res.status === "active" ? "Job reposted and is now live!" : "Job reposted — it will go live once reviewed.");
      } else {
        const res = await updateEmployerJobPost(formModal.jobId!, formModal.value);
        if (!res.success) { setErrorModal(res.error || "Something went wrong."); return; }
        closeFormModal();
        setSuccessNote("Job updated successfully.");
      }
      setTimeout(() => setSuccessNote(null), 4000);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#141821", margin: 0, letterSpacing: "-.02em" }}>Your Job Postings</h2>
          <p style={{ fontSize: 13, color: "#6E7686", margin: "5px 0 0 0" }}>
            {autoPublish ? "Your posts go live instantly." : "New posts get a quick review before going live."}
          </p>
        </div>
        <button
          className="mjp-btn-primary"
          onClick={() => setFormModal({ mode: "create", value: emptyVacancyForm() })}
          disabled={limitReached}
          title={limitReached ? "Daily posting limit reached" : "Post a new job"}
        >
          <Plus size={16} /> Post Now
        </button>
      </div>

      {/* Stat strip */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
          <Stat icon={<ListChecks size={18} />} value={jobs.length} label="Total Posts" tint="#1B5CBF" />
          <Stat icon={<Radio size={18} />} value={liveCount} label="Live" tint="#12A150" />
          <Stat icon={<Hourglass size={18} />} value={reviewCount} label="Under Review" tint="#B45309" />
          {scheduledCount > 0 && (
            <Stat icon={<CalendarClock size={18} />} value={scheduledCount} label="Scheduled" tint="#4A80D3" />
          )}
          <Stat
            icon={<Clock size={18} />}
            value={dailyPostLimit === -1 ? postedToday : `${postedToday}/${dailyPostLimit}`}
            label="Posted Today"
            tint="#0891b2"
          />
        </div>
      )}

      {successNote && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#E7F7EE", border: "1px solid #8FD9B0", color: "#0E8442", borderRadius: 10, padding: "11px 14px", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          <CheckCircle2 size={16} /> {successNote}
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
          <p style={{ fontSize: 12.5, color: "#9AA1B1", fontWeight: 600, margin: 0 }}>
            Showing {filteredJobs.length} of {jobs.length} posting{jobs.length === 1 ? "" : "s"}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              ariaLabel="Filter postings by status"
              // Seven fixed statuses, all visible at once — nothing to search for.
              searchable={false}
              minWidth={190}
              icon={<ListFilter size={14} color="#9AA1B1" style={{ flexShrink: 0 }} />}
              options={[
                { value: "all", label: "All Statuses", count: jobs.length },
                // Same order and colours as the pills on the cards below, so the
                // filter reads as the same vocabulary rather than a second one.
                ...["active", "pending", "scheduled", "closed", "expired", "rejected"].map((s) => ({
                  value: s,
                  label: STATUS_META[s].label,
                  dot: STATUS_META[s].dot,
                  count: jobs.filter((j) => j.status === s).length,
                })),
              ]}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", color: "#9AA1B1", padding: "56px 0", fontSize: 14 }}>Loading your postings…</div>
      ) : jobs.length === 0 ? (
        <div className="mjp-empty">
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#EEF3FC", color: "#1B5CBF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Briefcase size={26} strokeWidth={1.75} />
          </div>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: "#141821", marginBottom: 6 }}>No job postings yet</h4>
          <p style={{ fontSize: 13.5, color: "#6E7686", margin: "0 0 20px 0" }}>Publish your first vacancy and it&apos;ll show up here.</p>
          <button className="mjp-btn-primary" style={{ margin: "0 auto" }} onClick={() => setFormModal({ mode: "create", value: emptyVacancyForm() })} disabled={limitReached}>
            <Plus size={16} /> Post Now
          </button>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="mjp-empty">
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#F7F8FA", color: "#9AA1B1", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <ListFilter size={24} strokeWidth={1.75} />
          </div>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: "#141821", marginBottom: 6 }}>No postings match this filter</h4>
          <p style={{ fontSize: 13.5, color: "#6E7686", margin: "0 0 20px 0" }}>Try a different status, or clear the filter.</p>
          <button className="mjp-btn-primary" style={{ margin: "0 auto" }} onClick={() => setStatusFilter("all")}>
            Clear Filter
          </button>
        </div>
      ) : (
        <div className="mjp-grid">
          {filteredJobs.map((job) => {
            const accent = (STATUS_META[job.status] || STATUS_META.pending).accent;
            // Reposted if it was made live again well after it was first created.
            const reposted = job.last_posted_at && new Date(job.last_posted_at).getTime() - new Date(job.created_at).getTime() > 60000;
            const applicantCount = data.applicantCounts[job.id] ?? 0;
            const shortlistedCount = data.shortlistedCounts?.[job.id] ?? 0;
            const lockedCount = data.lockedCounts?.[job.id] ?? 0;
            // Deadline is a plain date (midnight UTC of that day) -- the
            // countdown is exact, not "end of day" in any local sense.
            const msToDeadline = job.status === "active" && job.deadline ? new Date(job.deadline).getTime() - Date.now() : null;
            const deadlineSoon = msToDeadline !== null && msToDeadline > 0 && msToDeadline <= 5 * 60 * 60 * 1000;
            const needsAdvisory = job.status === "expired" && !job.filled_at;
            // Filled jobs are repostable; admin-closed and cancelled-scheduled
            // ones are not, and filled_at is what tells them apart. Mirrors the
            // same check on the server in repostEmployerJob.
            const repostable = job.status === "expired" || (job.status === "closed" && !!job.filled_at);
            // Group boost: live jobs only, and only while the deadline still
            // stands — the server checks both again, this just keeps the button
            // off cards where it could never work.
            const groupUsed = data.groupPostsToday?.[job.id] ?? 0;
            const groupLeft = Math.max(0, groupBoostsPerDay - groupUsed);
            const deadlinePassed = !!job.deadline && new Date(job.deadline).getTime() < Date.now();
            const canBoost = job.status === "active" && !deadlinePassed && !subscriptionExpired;
            const boostTitle = !canBoost
              ? "Repost to Telegram group"
              : groupLeft === 0
              ? `Posted to the group ${groupUsed}× today — that's your plan's limit. Resets tomorrow.`
              : `Repost to Telegram group — ${groupLeft} of ${groupBoostsPerDay} left today`;
            return (
              <div
                key={job.id}
                className="mjp-card"
                title={job.status === "rejected" ? "Your job post has been rejected. Contact the JobsAddis Support team for details." : undefined}
              >
                <div className="mjp-card-accent" style={{ background: accent }} />
                <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                  {/* Top: logo + title + status */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <EmployerAvatar name={businessName} logoUrl={logoUrl} size={46} radius={12} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="mjp-eyebrow">{job.category || "Other"}</p>
                      <h3 className="mjp-title" style={{ overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{job.title}</h3>
                    </div>
                    <StatusPill status={job.status} />
                  </div>

                  {/* Meta chips */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <MetaChip variant="salary">{salaryLabel(job.salary_min, job.salary_max)}</MetaChip>
                    <MetaChip icon={<Briefcase size={11} />}>{job.job_type || "Full Time"}</MetaChip>
                    {job.location && <MetaChip icon={<MapPin size={11} />}>{job.location}</MetaChip>}
                    {job.quantity > 1 && <MetaChip icon={<Users size={11} />}>{job.quantity} openings</MetaChip>}
                  </div>

                  {/* Applicants — links straight into the tracking page for this job. */}
                  <Link
                    href={`/emp/dashboard/applicants?job=${job.id}`}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start",
                      fontSize: 12, fontWeight: 700, textDecoration: "none",
                      color: applicantCount > 0 ? "#1B5CBF" : "#9AA1B1",
                    }}
                  >
                    <Users size={12} />
                    {applicantCount === 0
                      ? "No applicants yet"
                      : lockedCount > 0
                      ? `${applicantCount} applicant${applicantCount === 1 ? "" : "s"} (${lockedCount} new — renew to view) →`
                      : `${applicantCount} applicant${applicantCount === 1 ? "" : "s"} →`}
                  </Link>

                  {deadlineSoon && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fffbeb", border: "1px solid #fde68a", color: "#B45309", borderRadius: 8, padding: "6px 10px", fontSize: 11.5, fontWeight: 600 }}>
                      <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                      {subscriptionExpired ? (
                        // Extending is impossible while the subscription is lapsed --
                        // maxDeadline caps at a past date, so every choice in the
                        // picker would fail validation. Point at renewing instead of
                        // offering a link that can only ever dead-end.
                        <span>Deadline about to end in {Math.max(1, Math.ceil(msToDeadline! / 3600000))}h. Renew your subscription to extend it.</span>
                      ) : (
                        <>
                          <span>Deadline about to end in {Math.max(1, Math.ceil(msToDeadline! / 3600000))}h.</span>
                          <button
                            onClick={() => openEditForExtend(job)}
                            style={{ background: "none", border: "none", padding: 0, color: "#B45309", fontWeight: 700, textDecoration: "underline", cursor: "pointer", fontSize: 11.5 }}
                          >
                            Click here to extend
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {needsAdvisory && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "#FDECEC", border: "1px solid #fecaca", color: "#E5484D", borderRadius: 8, padding: "8px 10px", fontSize: 11.5 }}>
                      <span style={{ fontWeight: 600 }}>
                        Deadline ended — {applicantCount} applied, {shortlistedCount} shortlisted.
                      </span>
                      <div style={{ display: "flex", gap: 12 }}>
                        <button
                          onClick={() => setFillTarget({ id: job.id, title: job.title })}
                          style={{ background: "none", border: "none", padding: 0, color: "#E5484D", fontWeight: 700, textDecoration: "underline", cursor: "pointer", fontSize: 11.5 }}
                        >
                          Mark as filled
                        </button>
                        {!subscriptionExpired && (
                          <button
                            // Plain edit never touches status, so a deadline
                            // extended that way would update the date but leave
                            // the job stuck 'expired' forever -- repost is what
                            // actually revives it (same as the Repost icon
                            // button in the footer, which is already shown for
                            // this exact job).
                            onClick={() => handleRepostClick(job, true)}
                            style={{ background: "none", border: "none", padding: 0, color: "#E5484D", fontWeight: 700, textDecoration: "underline", cursor: "pointer", fontSize: 11.5 }}
                          >
                            Extend deadline
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ flex: 1 }} />
                  <div style={{ height: 1, background: "#EFF1F5" }} />

                  {/* Footer: dates + actions */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    {job.status === "scheduled" && job.scheduled_at ? (
                      <div style={{ fontSize: 11.5, color: "#164A9C", fontWeight: 600, display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                        <CalendarClock size={12} style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          Publishes {new Date(job.scheduled_at).toLocaleDateString()} at {new Date(job.scheduled_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                    ) : (
                      <div style={{ fontSize: 11.5, color: "#9AA1B1", display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                        <Clock size={12} style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {new Date(job.created_at).toLocaleDateString()}
                          {reposted && ` · Reposted ${new Date(job.last_posted_at).toLocaleDateString()}`}
                          {job.deadline && ` · ends ${new Date(job.deadline).toLocaleDateString()}`}
                        </span>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {repostable && (
                        <button className="mjp-iconbtn repost" title="Repost job" onClick={() => handleRepostClick(job)}>
                          <RotateCw size={15} />
                        </button>
                      )}
                      {canBoost && (
                        <button
                          className="mjp-iconbtn tgboost"
                          title={boostTitle}
                          disabled={groupLeft === 0}
                          onClick={() => setBoostTarget({ id: job.id, title: job.title, used: groupUsed })}
                        >
                          <GroupRepostIcon size={15} />
                        </button>
                      )}
                      {(job.status === "active" || job.status === "expired") && (
                        <button className="mjp-iconbtn hire" title="Mark as filled" onClick={() => setFillTarget({ id: job.id, title: job.title })}>
                          <UserCheck size={15} />
                        </button>
                      )}
                      <button className="mjp-iconbtn edit" title="Edit job" onClick={() => setFormModal({ mode: "edit", jobId: job.id, value: jobRowToForm(job) })}>
                        <Pencil size={15} />
                      </button>
                      <button className="mjp-iconbtn danger" title="Delete job" onClick={() => setDeleteTarget({ id: job.id, title: job.title })}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formModal && (
        <VacancyFormModal
          value={formModal.value}
          onChange={(next) => setFormModal({ ...formModal, value: next })}
          onClose={closeFormModal}
          onSubmit={handleSubmit}
          saving={saving}
          focusDeadline={focusDeadlineOnOpen}
          requireDeadline={formModal.mode === "repost"}
          maxDeadline={packageExpiresAt}
          saveLabel={formModal.mode === "create" ? "Post Now" : formModal.mode === "repost" ? "Repost Job" : "Save Changes"}
          headerTitle={formModal.mode === "create" ? "Post a New Job" : formModal.mode === "repost" ? "Repost This Job" : "Edit Job Posting"}
          headerSubtitle={
            formModal.mode === "create"
              ? "Fill in the details below to publish this vacancy."
              : formModal.mode === "repost"
              ? "Set a new deadline to bring this listing back."
              : "Update the details of this job posting."
          }
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete this job posting?"
          message={<><strong style={{ color: "#141821" }}>{deleteTarget.title}</strong> and any applications to it will be permanently removed. This can&apos;t be undone.</>}
          confirmLabel="Delete Posting"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {fillTarget && (
        <ConfirmModal
          title="Mark this job as filled?"
          message={<>Job seekers will still see <strong style={{ color: "#141821" }}>{fillTarget.title}</strong> in the app, but as "Position Filled" — they won't be able to apply. If the role opens up again, you can repost it from here with a new deadline.</>}
          confirmLabel="Mark as Filled"
          loadingLabel="Marking as filled…"
          icon={<UserCheck size={24} strokeWidth={1.75} />}
          tone="primary"
          loading={filling}
          onConfirm={handleMarkFilled}
          onCancel={() => setFillTarget(null)}
        />
      )}

      {boostTarget && (
        <ConfirmModal
          title="Repost to the Telegram group?"
          message={
            <>
              <strong style={{ color: "#141821" }}>{boostTarget.title}</strong> goes back to the top of the group.
              Nothing changes in the app — it stays live exactly as it is, and seekers already notified
              about this vacancy won&apos;t be messaged again.
              <br />
              <span style={{ display: "inline-block", marginTop: 8, color: "#6E7686" }}>
                Posted to the group <strong style={{ color: "#141821" }}>{boostTarget.used}</strong> of{" "}
                <strong style={{ color: "#141821" }}>{groupBoostsPerDay}</strong> times today
                {groupBoostsPerDay - boostTarget.used - 1 > 0
                  ? ` — ${groupBoostsPerDay - boostTarget.used - 1} left after this one.`
                  : `. This is your last one for today.`}
              </span>
            </>
          }
          confirmLabel="Repost to Group"
          loadingLabel="Queueing…"
          icon={<GroupRepostIcon size={24} />}
          tone="primary"
          loading={boosting}
          onConfirm={handleBoost}
          onCancel={() => setBoostTarget(null)}
        />
      )}

      {errorModal && <AttentionModal message={errorModal} onClose={() => setErrorModal(null)} />}
    </div>
  );
}
