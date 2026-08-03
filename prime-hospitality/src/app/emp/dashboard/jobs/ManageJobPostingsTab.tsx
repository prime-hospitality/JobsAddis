"use client";

import React, { useCallback, useEffect, useState } from "react";
import { LayoutGrid, FileStack } from "lucide-react";
import { getEmployerPostingData } from "./actions";
import { runSilently } from "@/lib/silentFetch";
import { writeEmployerUi } from "@/lib/employerUiCookie";
import { PostingStyles } from "./postingUI";
import PostTab from "./PostTab";
import VacancyTemplateTab from "./VacancyTemplateTab";
import RenewSubscriptionButton from "../RenewSubscriptionButton";
import { isSubscriptionExpired } from "@/lib/subscriptionStatus";

export interface PostingData {
  jobs: any[];
  templates: any[];
  /** job id → number of applications received. */
  applicantCounts: Record<string, number>;
  /** job id → number of those applications currently shortlisted. */
  shortlistedCounts: Record<string, number>;
  /** job id → number that arrived after the subscription lapsed and are
   *  locked from view until the employer renews. */
  lockedCounts: Record<string, number>;
  /** job id → times it has been announced to the Telegram group today,
   *  counting the original announcement. Absent means none yet. */
  groupPostsToday: Record<string, number>;
  /** Times one job may reach the group per day on this employer's plan. */
  groupBoostsPerDay: number;
  autoPublish: boolean;
  dailyPostLimit: number;
  /** Date (YYYY-MM-DD) this employer's current plan runs out, or null if
   *  they have none -- caps how far out a job deadline can be set. */
  packageExpiresAt: string | null;
  renewalRequestedAt: string | null;
  renewalSeenAt: string | null;
  employerId: string;
  businessName: string;
  businessType: string;
  logoUrl: string | null;
}

const EMPTY: PostingData = {
  jobs: [],
  templates: [],
  applicantCounts: {},
  shortlistedCounts: {},
  lockedCounts: {},
  groupPostsToday: {},
  groupBoostsPerDay: 3,
  autoPublish: false,
  dailyPostLimit: 15,
  packageExpiresAt: null,
  renewalRequestedAt: null,
  renewalSeenAt: null,
  employerId: "",
  businessName: "Your Company",
  businessType: "",
  logoUrl: null,
};

export default function ManageJobPostingsTab({
  initialSubTab = "post",
}: {
  initialSubTab?: "post" | "templates";
}) {
  const [activeSubTab, setActiveSubTab] = useState<"post" | "templates">(initialSubTab);
  const [data, setData] = useState<PostingData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [reloadError, setReloadError] = useState<string | null>(null);

  // Remember which sub-tab the employer was on so a reload lands back here.
  useEffect(() => {
    writeEmployerUi({ jobsSubTab: activeSubTab });
  }, [activeSubTab]);

  const reload = useCallback(async () => {
    try {
      // runSilently: this tab renders its own inline loading/skeleton state, so
      // the global full-screen overlay on top of it is redundant flicker — both
      // on mount and on the refresh that follows every mutation.
      const res = await runSilently(() => getEmployerPostingData());
      setData({
        jobs: res.jobs,
        templates: res.templates,
        applicantCounts: res.applicantCounts || {},
        shortlistedCounts: res.shortlistedCounts || {},
        lockedCounts: res.lockedCounts || {},
        groupPostsToday: res.groupPostsToday || {},
        groupBoostsPerDay: res.groupBoostsPerDay ?? 3,
        autoPublish: res.autoPublish,
        dailyPostLimit: res.dailyPostLimit,
        packageExpiresAt: res.packageExpiresAt ?? null,
        renewalRequestedAt: res.renewalRequestedAt ?? null,
        renewalSeenAt: res.renewalSeenAt ?? null,
        employerId: res.employerId,
        businessName: res.businessName || "Your Company",
        businessType: res.businessType || "",
        logoUrl: res.logoUrl || null,
      });
      setReloadError(null);
    } catch (e) {
      console.error(e);
      setReloadError("Couldn't refresh the latest data. Your change was saved, but this list may be out of date.");
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await reload();
      setLoading(false);
    })();
  }, [reload]);

  const expiresAt = data.packageExpiresAt ? new Date(data.packageExpiresAt) : null;
  const isExpired = isSubscriptionExpired(data.packageExpiresAt);
  const showRenewalNudge = !loading && (!expiresAt || expiresAt.getTime() - Date.now() <= 24 * 60 * 60 * 1000);

  return (
    <div className="mjp-scope" style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      <PostingStyles />

      {showRenewalNudge && (
        <div style={{ background: isExpired ? "#FDECEC" : "#fffbeb", border: `1px solid ${isExpired ? "#fecaca" : "#fde68a"}`, borderRadius: 10, padding: "14px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, color: isExpired ? "#E5484D" : "#B45309" }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>
              {isExpired ? "Your subscription has expired — posting is disabled" : "Your subscription expires in less than 24 hours"}
            </p>
            <p style={{ fontSize: 12.5, margin: "3px 0 0 0", opacity: 0.9 }}>
              {isExpired
                ? "You can still manage existing jobs and applicants, but new posts, reposts, and scheduled posts are blocked until you renew."
                : "Once it ends, you won't be able to post, repost, or schedule new jobs until you renew."}
            </p>
          </div>
          <RenewSubscriptionButton employerId={data.employerId} initialRequestedAt={data.renewalRequestedAt} initialSeenAt={data.renewalSeenAt} />
        </div>
      )}

      {reloadError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 14px",
            marginBottom: 16,
            borderRadius: 10,
            background: "#fffbeb",
            border: "1px solid #fde68a",
            color: "#b45309",
            fontSize: 13,
          }}
        >
          <span>{reloadError}</span>
          <button
            onClick={() => reload()}
            style={{
              flexShrink: 0,
              background: "transparent",
              border: "1px solid #fde68a",
              borderRadius: 6,
              padding: "4px 10px",
              color: "#b45309",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Segmented tab control */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
        <div className="mjp-tabs">
          <button className={`mjp-tab${activeSubTab === "post" ? " active" : ""}`} onClick={() => setActiveSubTab("post")}>
            <LayoutGrid size={16} />
            Post
            <span className="count">{loading ? "·" : data.jobs.length}</span>
          </button>
          <button className={`mjp-tab${activeSubTab === "templates" ? " active" : ""}`} onClick={() => setActiveSubTab("templates")}>
            <FileStack size={16} />
            Vacancy Template
            <span className="count">{loading ? "·" : data.templates.length}</span>
          </button>
        </div>
      </div>

      {activeSubTab === "post" ? (
        <PostTab data={data} loading={loading} reload={reload} />
      ) : (
        <VacancyTemplateTab data={data} loading={loading} reload={reload} />
      )}
    </div>
  );
}
