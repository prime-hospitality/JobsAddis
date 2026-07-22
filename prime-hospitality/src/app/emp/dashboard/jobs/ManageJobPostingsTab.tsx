"use client";

import React, { useState } from "react";
import PostTab from "./PostTab";
import VacancyTemplateTab from "./VacancyTemplateTab";

export default function ManageJobPostingsTab() {
  const [activeSubTab, setActiveSubTab] = useState<"post" | "templates">("post");

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden flex flex-col">
        {/* Sub Tabs */}
        <div className="flex border-b border-[#e2e8f0] bg-[#f8fafc]">
          <button
            onClick={() => setActiveSubTab("post")}
            className={`px-6 py-4 text-sm font-medium transition-colors ${activeSubTab === "post" ? "text-[#0284c7] border-b-2 border-[#0284c7] bg-white" : "text-[#64748b] hover:text-[#0f172a]"}`}
          >
            Post
          </button>
          <button
            onClick={() => setActiveSubTab("templates")}
            className={`px-6 py-4 text-sm font-medium transition-colors ${activeSubTab === "templates" ? "text-[#0284c7] border-b-2 border-[#0284c7] bg-white" : "text-[#64748b] hover:text-[#0f172a]"}`}
          >
            Vacancy Template
          </button>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
          {activeSubTab === "post" ? <PostTab /> : <VacancyTemplateTab />}
        </div>
      </div>
    </div>
  );
}
