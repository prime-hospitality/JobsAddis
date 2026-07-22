"use client";

import React, { useState, useEffect } from "react";
import { getVacancyReport, getApplicationReport, getUserGrowthReport, getPackagePerformanceReport } from "./actions";
import { BarChart3 } from "lucide-react";

type Report = {
  vacancy: Awaited<ReturnType<typeof getVacancyReport>> | null;
  application: Awaited<ReturnType<typeof getApplicationReport>> | null;
  growth: Awaited<ReturnType<typeof getUserGrowthReport>> | null;
  packages: Awaited<ReturnType<typeof getPackagePerformanceReport>> | null;
};

function StatTile({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl border border-[#e5e5ea] bg-[#f2f2f7]/80 p-4 flex flex-col gap-1">
      <p className="text-[10px] sm:text-xs text-[#8e8e93] font-bold tracking-wider uppercase leading-snug">{label}</p>
      <p className="text-2xl font-black tracking-tight leading-none" style={{ color }}>{value}</p>
    </div>
  );
}

function DayBarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-[130px] overflow-x-auto pb-1">
      {data.map((d) => (
        <div key={d.date} className="flex flex-col items-center gap-1" style={{ minWidth: 8 }}>
          <div
            title={`${d.count} on ${d.date}`}
            style={{ width: 8, height: `${Math.max((d.count / max) * 110, 3)}px`, background: "#6366f1", borderRadius: "3px 3px 0 0" }}
            className="hover:bg-indigo-400 cursor-pointer transition-colors"
          />
        </div>
      ))}
    </div>
  );
}

function HorizontalBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-xs text-[#64748b] w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-[#f1f5f9] rounded-full h-2.5 overflow-hidden">
        <div style={{ width: `${max > 0 ? (count / max) * 100 : 0}%`, background: color }} className="h-full rounded-full transition-all" />
      </div>
      <span className="text-xs font-bold text-[#1c1c1e] w-8 text-right shrink-0">{count}</span>
    </div>
  );
}

export default function ReportingTab() {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<Report>({ vacancy: null, application: null, growth: null, packages: null });
  const [loading, setLoading] = useState(true);

  const load = async (d: number) => {
    setLoading(true);
    try {
      const [vacancy, application, growth, packages] = await Promise.all([
        getVacancyReport(d),
        getApplicationReport(d),
        getUserGrowthReport(d),
        getPackagePerformanceReport(),
      ]);
      setReport({ vacancy, application, growth, packages });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    load(days);
  }, [days]);

  if (loading && !report.vacancy) {
    return <div className="p-8 text-center text-[#8e8e93]">Loading reports...</div>;
  }

  const maxCategory = Math.max(...(report.vacancy?.byCategory.map((c) => c.count) || [1]), 1);
  const maxPackage = Math.max(...(report.packages?.map((p) => p.activeSubscriptions) || [1]), 1);

  return (
    <div className="bg-white rounded-2xl border border-[#c6c6c8] shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-[#0284c7]" />
            <h3 className="text-lg font-bold text-black">Reporting & Analytics</h3>
          </div>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-[#c6c6c8] text-sm font-medium bg-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <StatTile label="New Job Posts" value={report.vacancy?.totalJobs ?? 0} color="#6366f1" />
          <StatTile label="Applications" value={report.application?.totalApplications ?? 0} color="#059669" />
          <StatTile label="Avg Apps / Job" value={report.application?.averageApplicationsPerJob ?? 0} color="#0284c7" />
          <StatTile label="New Signups" value={report.growth?.totalSignups ?? 0} color="#1c1c1e" />
        </div>

        {/* User growth */}
        <div className="mb-8">
          <h4 className="text-sm font-bold text-[#1c1c1e] uppercase tracking-wider mb-1">User Growth</h4>
          <p className="text-xs text-[#8e8e93] mb-3">
            {report.growth?.jobSeekerSignups ?? 0} job seekers, {report.growth?.employerSignups ?? 0} employers signed up in the last {days} days.
          </p>
          <DayBarChart data={report.growth?.signupsPerDay || []} />
        </div>

        {/* Application volume */}
        <div className="mb-8">
          <h4 className="text-sm font-bold text-[#1c1c1e] uppercase tracking-wider mb-3">Applications Per Day</h4>
          <DayBarChart data={report.application?.applicationsPerDay || []} />
        </div>

        {/* Vacancy by category */}
        <div className="mb-8">
          <h4 className="text-sm font-bold text-[#1c1c1e] uppercase tracking-wider mb-3">Job Posts by Category</h4>
          {(report.vacancy?.byCategory || []).length === 0 ? (
            <p className="text-sm text-[#8e8e93]">No job posts in this period.</p>
          ) : (
            report.vacancy?.byCategory.map((c) => (
              <HorizontalBar key={c.category} label={c.category} count={c.count} max={maxCategory} color="#6366f1" />
            ))
          )}
        </div>

        {/* Package performance */}
        <div>
          <h4 className="text-sm font-bold text-[#1c1c1e] uppercase tracking-wider mb-1">Package Performance</h4>
          <p className="text-xs text-[#8e8e93] mb-3">Currently active subscriptions per package (snapshot, not lifetime revenue).</p>
          {(report.packages || []).length === 0 ? (
            <p className="text-sm text-[#8e8e93]">No packages configured.</p>
          ) : (
            report.packages?.map((p) => (
              <div key={p.packageId} className="flex items-center justify-between mb-2">
                <HorizontalBar label={p.name} count={p.activeSubscriptions} max={maxPackage} color="#0284c7" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
