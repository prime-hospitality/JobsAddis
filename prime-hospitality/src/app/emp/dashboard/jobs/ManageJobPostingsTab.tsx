"use client";

import React, { useCallback, useEffect, useState } from "react";
import { LayoutGrid, FileStack } from "lucide-react";
import { getEmployerPostingData } from "./actions";
import { PostingStyles } from "./postingUI";
import PostTab from "./PostTab";
import VacancyTemplateTab from "./VacancyTemplateTab";

export interface PostingData {
  jobs: any[];
  templates: any[];
  /** job id → number of applications received. */
  applicantCounts: Record<string, number>;
  autoPublish: boolean;
  dailyPostLimit: number;
  businessName: string;
  businessType: string;
  logoUrl: string | null;
}

const EMPTY: PostingData = {
  jobs: [],
  templates: [],
  applicantCounts: {},
  autoPublish: false,
  dailyPostLimit: 15,
  businessName: "Your Company",
  businessType: "",
  logoUrl: null,
};

export default function ManageJobPostingsTab() {
  const [activeSubTab, setActiveSubTab] = useState<"post" | "templates">("post");
  const [data, setData] = useState<PostingData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [reloadError, setReloadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await getEmployerPostingData();
      setData({
        jobs: res.jobs,
        templates: res.templates,
        applicantCounts: res.applicantCounts || {},
        autoPublish: res.autoPublish,
        dailyPostLimit: res.dailyPostLimit,
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

  return (
    <div className="mjp-scope" style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      <PostingStyles />

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
