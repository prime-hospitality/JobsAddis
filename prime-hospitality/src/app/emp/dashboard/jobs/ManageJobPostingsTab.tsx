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
  autoPublish: boolean;
  dailyPostLimit: number;
  businessName: string;
  businessType: string;
  logoUrl: string | null;
}

const EMPTY: PostingData = {
  jobs: [],
  templates: [],
  autoPublish: false,
  dailyPostLimit: 3,
  businessName: "Your Company",
  businessType: "",
  logoUrl: null,
};

export default function ManageJobPostingsTab() {
  const [activeSubTab, setActiveSubTab] = useState<"post" | "templates">("post");
  const [data, setData] = useState<PostingData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await getEmployerPostingData();
      setData({
        jobs: res.jobs,
        templates: res.templates,
        autoPublish: res.autoPublish,
        dailyPostLimit: res.dailyPostLimit,
        businessName: res.businessName || "Your Company",
        businessType: res.businessType || "",
        logoUrl: res.logoUrl || null,
      });
    } catch (e) {
      console.error(e);
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
