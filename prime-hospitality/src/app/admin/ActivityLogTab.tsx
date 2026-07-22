"use client";

import React, { useState, useEffect } from "react";
import { getActivityLog } from "./actions";
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
  assign_package: "Assigned package",
  create_sub_admin: "Created sub-admin",
  update_sub_admin_permissions: "Updated sub-admin permissions",
  send_broadcast: "Sent broadcast",
};

export default function ActivityLogTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 25;

  const load = async (p: number) => {
    setLoading(true);
    try {
      const res = await getActivityLog(p, pageSize);
      setRows(res.rows);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    load(page);
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="bg-white rounded-2xl border border-[#c6c6c8] shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
        <div className="flex items-center gap-2 mb-6">
          <History size={20} className="text-[#0284c7]" />
          <h3 className="text-lg font-bold text-black">Activity Log</h3>
        </div>

        {loading ? (
          <p className="text-sm text-[#8e8e93]">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[#8e8e93]">No activity recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-4 bg-[#f8fafc] border border-[#e5e5ea] rounded-lg p-3">
                <div>
                  <p className="text-sm font-semibold text-[#1c1c1e] m-0">
                    {ACTION_LABELS[row.action] || row.action}
                    {row.target ? <span className="font-normal text-[#64748b]"> — {row.target}</span> : null}
                  </p>
                  <p className="text-xs text-[#8e8e93] mt-1">by {row.actor}</p>
                </div>
                <span className="text-xs text-[#8e8e93] whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#e5e5ea]">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#c6c6c8] disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-[#8e8e93]">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#c6c6c8] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
