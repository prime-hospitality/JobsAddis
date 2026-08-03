"use client";

import { useState } from "react";
import { Users, CreditCard, Hourglass } from "lucide-react";
import { timeAgo } from "@/lib/i18n/format";

type SpecialRequest = {
  userId: string;
  telegramId: number;
  name?: string;
  requestedAt?: string;
  seenAt?: string;
};

type RenewalEmployer = {
  id: string;
  business_name: string;
  renewal_requested_at?: string | null;
  renewal_seen_at?: string | null;
};

type PendingJob = {
  id: string;
  title: string;
  created_at: string;
  employer_id: string;
  employers?: { business_name?: string };
};

type Entry = {
  key: string;
  sortDate: number;
  render: () => React.ReactNode;
};

export default function NotificationBell({
  specialRequests,
  renewalEmployers,
  pendingJobs,
  onOpenSpecialRequest,
  onAcknowledgeRenewal,
  onGoToEmployer,
  onGoToPendingJob,
}: {
  specialRequests: SpecialRequest[];
  renewalEmployers: RenewalEmployer[];
  pendingJobs: PendingJob[];
  onOpenSpecialRequest: (userId: string) => void;
  onAcknowledgeRenewal: (employerId: string) => void;
  onGoToEmployer: (employerId: string, businessName: string) => void;
  onGoToPendingJob: (employerId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // "Unseen" drives the badge; pending jobs have no seen concept of their
  // own since resolving one (approve/reject) is a single click that removes
  // it from this list entirely -- there's nothing useful a separate read
  // marker would add there.
  const unseenCount =
    specialRequests.filter((r) => !r.seenAt).length +
    renewalEmployers.filter((e) => !e.renewal_seen_at).length +
    pendingJobs.length;

  const entries: Entry[] = [
    ...specialRequests.map((req): Entry => {
      const name = req.name || "Unknown Name";
      const seen = !!req.seenAt;
      return {
        key: `sr-${req.userId}`,
        sortDate: req.requestedAt ? new Date(req.requestedAt).getTime() : 0,
        render: () => (
          <div className="p-4 border-b border-gray-50 hover:bg-[#F7F8FA] transition-colors last:border-b-0">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 bg-amber-100 p-1.5 rounded-full text-amber-600 shrink-0">
                <Users size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {!seen && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                  <p className="text-sm font-semibold text-black leading-tight truncate">{name}</p>
                </div>
                <p className="text-xs text-[#4C5361] mt-1">
                  Ex-employer wants to become a job seeker · Telegram {req.telegramId}
                </p>
                {req.requestedAt && (
                  <p className="text-[11px] text-[#9AA1B1] mt-0.5">{timeAgo(req.requestedAt, "en")}</p>
                )}
                <button
                  onClick={() => { onOpenSpecialRequest(req.userId); close(); }}
                  className="mt-2.5 text-xs font-semibold text-[#141821] hover:text-[#2c2c2e] bg-[#EFF1F5] hover:bg-[#EFF1F5] px-3 py-1.5 rounded-md transition-colors w-full text-center"
                  style={{ border: "none", cursor: "pointer" }}
                >
                  View or Fix
                </button>
              </div>
            </div>
          </div>
        ),
      };
    }),
    ...renewalEmployers.map((emp): Entry => {
      const seen = !!emp.renewal_seen_at;
      return {
        key: `renewal-${emp.id}`,
        sortDate: emp.renewal_requested_at ? new Date(emp.renewal_requested_at).getTime() : 0,
        render: () => (
          <div className="p-4 border-b border-gray-50 hover:bg-[#F7F8FA] transition-colors last:border-b-0">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 bg-blue-100 p-1.5 rounded-full text-blue-600 shrink-0">
                <CreditCard size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {!seen && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                  <p className="text-sm font-semibold text-black leading-tight truncate">{emp.business_name}</p>
                </div>
                <p className="text-xs text-[#4C5361] mt-1">Requested a subscription renewal</p>
                {emp.renewal_requested_at && (
                  <p className="text-[11px] text-[#9AA1B1] mt-0.5">{timeAgo(emp.renewal_requested_at, "en")}</p>
                )}
                {seen && (
                  <p className="text-xs text-emerald-700 mt-1.5 leading-relaxed">Marked as seen — follow up by phone.</p>
                )}
                <div className="flex gap-2 mt-2.5">
                  <button
                    onClick={() => onAcknowledgeRenewal(emp.id)}
                    disabled={seen}
                    className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-default px-3 py-1.5 rounded-md transition-colors flex-1 text-center"
                    style={{ border: "none", cursor: seen ? "default" : "pointer" }}
                  >
                    {seen ? "Received" : "Mark Received"}
                  </button>
                  <button
                    onClick={() => { onGoToEmployer(emp.id, emp.business_name); close(); }}
                    className="text-xs font-semibold text-[#141821] hover:text-[#2c2c2e] bg-[#EFF1F5] hover:bg-[#EFF1F5] px-3 py-1.5 rounded-md transition-colors flex-1 text-center"
                    style={{ border: "none", cursor: "pointer" }}
                  >
                    Go to Employer
                  </button>
                </div>
              </div>
            </div>
          </div>
        ),
      };
    }),
    ...pendingJobs.map((job): Entry => ({
      key: `job-${job.id}`,
      sortDate: job.created_at ? new Date(job.created_at).getTime() : 0,
      render: () => (
        <div className="p-4 border-b border-gray-50 hover:bg-[#F7F8FA] transition-colors last:border-b-0">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 bg-orange-100 p-1.5 rounded-full text-orange-600 shrink-0">
              <Hourglass size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <p className="text-sm font-semibold text-black leading-tight truncate">{job.title}</p>
              </div>
              <p className="text-xs text-[#4C5361] mt-1 truncate">
                <span className="font-medium text-[#141821]">{job.employers?.business_name || "Unknown employer"}</span> posted a job awaiting review
              </p>
              {job.created_at && <p className="text-[11px] text-[#9AA1B1] mt-0.5">{timeAgo(job.created_at, "en")}</p>}
              <button
                onClick={() => { onGoToPendingJob(job.employer_id); close(); }}
                className="mt-2.5 text-xs font-semibold text-[#141821] hover:text-[#2c2c2e] bg-[#EFF1F5] hover:bg-[#EFF1F5] px-3 py-1.5 rounded-md transition-colors w-full text-center"
                style={{ border: "none", cursor: "pointer" }}
              >
                Review Job
              </button>
            </div>
          </div>
        </div>
      ),
    })),
  ].sort((a, b) => b.sortDate - a.sortDate);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-[#4C5361] hover:text-[#141821] relative transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center"
      >
        {unseenCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full border border-white"
            style={{ width: 16, height: 16, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {unseenCount > 9 ? "9+" : unseenCount}
          </span>
        )}
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E2E5EC] rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="p-3 border-b border-[#EFF1F5] bg-[#F7F8FA] flex items-center justify-between">
              <h3 className="font-bold text-black text-sm">Notifications</h3>
              {unseenCount > 0 && (
                <span className="bg-[#141821] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unseenCount} new
                </span>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {entries.length > 0 ? entries.map((e) => <div key={e.key}>{e.render()}</div>) : (
                <div className="p-6 text-center text-[#4C5361] text-sm">No new notifications</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
