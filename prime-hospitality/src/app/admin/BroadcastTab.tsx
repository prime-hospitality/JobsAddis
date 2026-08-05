"use client";

import React, { useState, useEffect } from "react";
import { sendBroadcast, getRecentBroadcasts, updateBroadcast, deleteBroadcast, type BroadcastSummary } from "./actions";
import { runSilently } from "@/lib/silentFetch";
import { Send, Megaphone, Loader2, Pencil, Trash2, Check, X } from "lucide-react";

type Target = "all" | "job_seeker" | "employer";

export default function BroadcastTab() {
  const [target, setTarget] = useState<Target>("all");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [recent, setRecent] = useState<BroadcastSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // A broadcast is keyed by its created_at (see updateBroadcast in actions).
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [rowError, setRowError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<BroadcastSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadRecent = async () => {
    setLoading(true);
    setLoadError("");
    try {
      // Wrap in runSilently so this doesn't trip the global full-screen overlay
      // on reload — this tab renders its own loading state.
      const rows = await runSilently(() => getRecentBroadcasts());
      setRecent(rows);
    } catch (e: any) {
      console.error(e);
      setLoadError(e?.message || "Could not load recent broadcasts.");
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

  const startEdit = (b: BroadcastSummary) => {
    setRowError("");
    setEditingKey(b.created_at);
    setEditDraft(b.message);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditDraft("");
    setRowError("");
  };

  const handleSaveEdit = async (b: BroadcastSummary) => {
    const trimmed = editDraft.trim();
    if (!trimmed || trimmed === b.message) {
      cancelEdit();
      return;
    }
    setSavingEdit(true);
    setRowError("");
    try {
      await updateBroadcast(b.created_at, b.message, trimmed);
      cancelEdit();
      await loadRecent();
    } catch (e: any) {
      setRowError(e.message || "Failed to update broadcast");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setRowError("");
    try {
      await deleteBroadcast(confirmDelete.created_at, confirmDelete.message);
      setConfirmDelete(null);
      if (editingKey === confirmDelete.created_at) cancelEdit();
      await loadRecent();
    } catch (e: any) {
      setRowError(e.message || "Failed to delete broadcast");
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const targets: { id: Target; label: string }[] = [
    { id: "all", label: "Everyone" },
    { id: "job_seeker", label: "Job Seekers" },
    { id: "employer", label: "Employers" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#E2E5EC] shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
        <div className="flex items-center gap-2 mb-6">
          <Megaphone size={20} className="text-[#1B5CBF]" />
          <h3 className="text-lg font-bold text-black">Broadcast a Message</h3>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-[#4C5361] uppercase tracking-wider mb-2">Send to</label>
          <div className="flex gap-2">
            {targets.map((t) => (
              <button
                key={t.id}
                onClick={() => setTarget(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  target === t.id
                    ? "bg-[#1B5CBF] text-white border-[#1B5CBF]"
                    : "bg-white text-[#141821] border-[#E2E5EC] hover:bg-[#F7F8FA]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-[#4C5361] uppercase tracking-wider mb-2">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Write an announcement to send to the selected audience..."
            className="w-full p-3 rounded-lg border border-[#E2E5EC] text-sm resize-none focus:outline-none focus:border-[#1B5CBF]"
          />
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {successCount !== null && (
          <p className="text-sm text-emerald-600 mb-3">Broadcast sent to {successCount} recipient{successCount !== 1 ? "s" : ""}.</p>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="flex items-center gap-2 bg-[#141821] text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {sending ? "Sending..." : "Send Broadcast"}
        </button>

        <div className="mt-8 pt-6 border-t border-[#EFF1F5]">
          <h4 className="text-sm font-bold text-[#141821] uppercase tracking-wider mb-3">Recent Broadcasts</h4>
          {rowError && <p className="text-sm text-red-600 mb-3">{rowError}</p>}

          {loading ? (
            <p className="text-sm text-[#4C5361]">Loading...</p>
          ) : loadError ? (
            <p className="text-sm text-red-600">{loadError}</p>
          ) : recent.length === 0 ? (
            <p className="text-sm text-[#4C5361]">No broadcasts sent yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recent.map((r) => {
                const editing = editingKey === r.created_at;
                return (
                  <div key={r.created_at} className="bg-[#F7F8FA] border border-[#EFF1F5] rounded-lg p-3">
                    {editing ? (
                      <>
                        <textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          rows={3}
                          className="w-full p-2.5 mb-2 rounded-lg border border-[#E2E5EC] bg-white text-sm resize-none focus:outline-none focus:border-[#1B5CBF]"
                        />
                        <p className="text-xs text-[#4C5361] mb-3">
                          {r.pendingDms > 0
                            ? `${r.pendingDms === 1 ? "1 Telegram message hasn't" : `${r.pendingDms} Telegram messages haven't`} gone out yet and will use the new text.`
                            : "Telegram messages for this broadcast were already delivered — editing only changes the in-app announcement."}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveEdit(r)}
                            disabled={savingEdit || !editDraft.trim()}
                            className="flex items-center gap-1.5 bg-[#1B5CBF] text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {savingEdit ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            {savingEdit ? "Saving..." : "Save changes"}
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={savingEdit}
                            className="flex items-center gap-1.5 text-[#4C5361] px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#EFF1F5] transition-colors"
                          >
                            <X size={14} /> Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-[#141821] mb-1 whitespace-pre-wrap break-words">{r.message}</p>
                          <p className="text-xs text-[#4C5361]">
                            {new Date(r.created_at).toLocaleString()}
                            {" · "}
                            {r.recipients} recipient{r.recipients !== 1 ? "s" : ""}
                            {r.pendingDms > 0 ? ` · ${r.pendingDms} not yet delivered` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEdit(r)}
                            title="Edit broadcast"
                            className="p-2 text-[#9AA1B1] hover:text-[#1B5CBF] hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => { setRowError(""); setConfirmDelete(r); }}
                            title="Delete broadcast"
                            className="p-2 text-[#9AA1B1] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-xl font-bold text-black mb-2">Delete Broadcast</h3>
            <p className="text-[#4C5361] mb-6 text-sm">
              This removes the announcement from all {confirmDelete.recipients} recipient
              {confirmDelete.recipients !== 1 ? "s" : ""}&rsquo; notifications.{" "}
              {confirmDelete.pendingDms > 0
                ? <>{confirmDelete.pendingDms} Telegram message{confirmDelete.pendingDms !== 1 ? "s" : ""} still queued will be cancelled, but any already delivered cannot be recalled.</>
                : <>Telegram messages already delivered cannot be recalled.</>}
              {" "}This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-[#141821] bg-[#EFF1F5] hover:bg-[#E2E5EC] rounded-xl transition-colors"
              >
                No, cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
