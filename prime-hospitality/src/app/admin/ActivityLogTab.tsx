"use client";

import React, { useState, useEffect } from "react";
import { getActivityLog } from "./actions";
import { runSilently } from "@/lib/silentFetch";
import { History } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  approve_employer: "Approved employer",
  reject_employer: "Rejected employer",
  delete_employer: "Deleted employer",
  ban_user: "Banned user",
  unban_user: "Unbanned user",
  delete_user: "Deleted user",
  change_job_status: "Changed job status",
  repost_job: "Reposted job",
  pre_approve_scheduled_job: "Pre-approved scheduled job",
  cancel_scheduled_job: "Cancelled scheduled job",
  assign_package: "Assigned package",
  create_sub_admin: "Created sub-admin",
  update_sub_admin_permissions: "Updated sub-admin permissions",
  send_broadcast: "Sent broadcast",
  edit_broadcast: "Edited broadcast",
  delete_broadcast: "Deleted broadcast",
};

export default function ActivityLogTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 25;

  const load = async (p: number, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      // Always route through runSilently so neither the mount load nor the poll
      // trips the global full-screen overlay — this tab shows its own spinner.
      const res = await runSilently(() => getActivityLog(p, pageSize));
      setRows(res.rows);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    }
    if (!opts?.silent) setLoading(false);
  };

  useEffect(() => {
    load(page);
  }, [page]);

  // Keep the log live while this tab is open, not just on the page it was
  // fetched for — otherwise new entries only appear after a full reload.
  useEffect(() => {
    const interval = setInterval(() => load(page, { silent: true }), 30000);
    return () => clearInterval(interval);
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="bg-white rounded-2xl border border-[#E2E5EC] shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
        <div className="flex items-center gap-2 mb-6">
          <History size={20} className="text-[#1B5CBF]" />
          <h3 className="text-lg font-bold text-black">Activity Log</h3>
        </div>

        {loading ? (
          <p className="text-sm text-[#4C5361]">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[#4C5361]">No activity recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-4 bg-[#F7F8FA] border border-[#EFF1F5] rounded-lg p-3">
                <div>
                  <p className="text-sm font-semibold text-[#141821] m-0">
                    {ACTION_LABELS[row.action] || row.action}
                    {row.target ? <span className="font-normal text-[#6E7686]"> — {row.target}</span> : null}
                  </p>
                  <p className="text-xs text-[#4C5361] mt-1">by {row.actor}</p>
                </div>
                <span className="text-xs text-[#4C5361] whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#EFF1F5]">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E2E5EC] disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-[#4C5361]">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E2E5EC] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
