"use client";

import React, { useState, useEffect } from "react";
import { sendBroadcast, getRecentBroadcasts } from "./actions";
import { Send, Megaphone, Loader2 } from "lucide-react";

type Target = "all" | "job_seeker" | "employer";

export default function BroadcastTab() {
  const [target, setTarget] = useState<Target>("all");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [recent, setRecent] = useState<{ message: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecent = async () => {
    setLoading(true);
    try {
      const rows = await getRecentBroadcasts();
      setRecent(rows);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRecent();
  }, []);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setError("");
    setSuccessCount(null);
    try {
      const res = await sendBroadcast(target, message);
      setSuccessCount(res.sentCount);
      setMessage("");
      loadRecent();
    } catch (e: any) {
      setError(e.message || "Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  const targets: { id: Target; label: string }[] = [
    { id: "all", label: "Everyone" },
    { id: "job_seeker", label: "Job Seekers" },
    { id: "employer", label: "Employers" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#c6c6c8] shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
        <div className="flex items-center gap-2 mb-6">
          <Megaphone size={20} className="text-[#0284c7]" />
          <h3 className="text-lg font-bold text-black">Broadcast a Message</h3>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-[#8e8e93] uppercase tracking-wider mb-2">Send to</label>
          <div className="flex gap-2">
            {targets.map((t) => (
              <button
                key={t.id}
                onClick={() => setTarget(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  target === t.id
                    ? "bg-[#0284c7] text-white border-[#0284c7]"
                    : "bg-white text-[#1c1c1e] border-[#c6c6c8] hover:bg-[#f2f2f7]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-[#8e8e93] uppercase tracking-wider mb-2">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Write an announcement to send to the selected audience..."
            className="w-full p-3 rounded-lg border border-[#c6c6c8] text-sm resize-none focus:outline-none focus:border-[#0284c7]"
          />
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {successCount !== null && (
          <p className="text-sm text-emerald-600 mb-3">Broadcast sent to {successCount} recipient{successCount !== 1 ? "s" : ""}.</p>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="flex items-center gap-2 bg-[#0f172a] text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {sending ? "Sending..." : "Send Broadcast"}
        </button>

        <div className="mt-8 pt-6 border-t border-[#e5e5ea]">
          <h4 className="text-sm font-bold text-[#1c1c1e] uppercase tracking-wider mb-3">Recent Broadcasts</h4>
          {loading ? (
            <p className="text-sm text-[#8e8e93]">Loading...</p>
          ) : recent.length === 0 ? (
            <p className="text-sm text-[#8e8e93]">No broadcasts sent yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recent.map((r, i) => (
                <div key={i} className="bg-[#f8fafc] border border-[#e5e5ea] rounded-lg p-3">
                  <p className="text-sm text-[#1c1c1e] mb-1">{r.message}</p>
                  <p className="text-xs text-[#8e8e93]">{new Date(r.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
