"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toggleUserBan, toggleJobStatus, scheduleJobPost, repostJob, approveScheduledJob, cancelScheduledJob, logoutAdmin, addEmployer, deleteEmployer, updateEmployer, updateEmployerAutoPublish, adminUpdateEmployerLogo, deleteUser, approveSpecialRequest, getPricingConfig, updatePricingConfig, getLoggedInAdmin, createSubAdmin, updateSubAdminPermissions, deleteSubAdmin, listSubAdmins, searchUsers, getProfessionCounts, searchEmployers, getPackages, upsertPackage, deletePackage, getBusinessTypes, addBusinessType, getPlatformEmployerProfile, updatePlatformEmployerLogo, getAdminData, acknowledgeEmployerRenewal, acknowledgeSpecialRequest } from "./actions";
import type { AdminPermissions, SubAdmin } from "./actions";
import { Trash2, Pencil, Image as ImageIcon, Menu, X, LayoutDashboard, Briefcase, FileText, Users, LogOut, Settings, CreditCard, CheckCircle, BookOpen, User, Building2, Hourglass, ChevronDown, Check, Plus, Megaphone, History, BarChart3 } from "lucide-react";
import EmployerAvatar from "@/components/EmployerAvatar";
import AvatarCropModal from "@/components/AvatarCropModal";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Gear } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { runSilently } from "@/lib/silentFetch";
import { AdminUiState, writeAdminUi, clearAdminUi } from "@/lib/adminUiCookie";
import { isSubscriptionExpired } from "@/lib/subscriptionStatus";
import { clearTabUser } from "@/lib/adminTabSession";
import ContentManagementTab from "./ContentManagementTab";
import BroadcastTab from "./BroadcastTab";
import ActivityLogTab from "./ActivityLogTab";
import ReportingTab from "./ReportingTab";
import { JobStatusBadge, JobActionButtons } from "./JobStatusActions";
import NotificationBell from "./NotificationBell";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Shared status read-out for an employer's package_expires_at: what the
// admin table/badge shows, and whether the Renew action should be enabled
// (from 24h before expiry onward, and it stays enabled after expiry too --
// that's exactly when renewal matters most).
function getSubscriptionStatus(packageExpiresAt: string | null | undefined) {
  const expiresAt = packageExpiresAt ? new Date(packageExpiresAt) : null;
  const msLeft = expiresAt ? expiresAt.getTime() - Date.now() : -Infinity;
  const expired = isSubscriptionExpired(packageExpiresAt);
  const daysLeft = expiresAt ? Math.ceil(msLeft / ONE_DAY_MS) : 0;
  return {
    expired,
    canRenew: expired || msLeft <= ONE_DAY_MS,
    label: expired ? "Expired" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
    color: expired ? "#E5484D" : "#0E8442",
    bg: expired ? "#fee2e2" : "#E7F7EE",
  };
}

// ── Draggable Floating Window ──────────────────────────────────────────────
function FloatingWindow({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 860, h: 620 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Center on first render
  useEffect(() => {
    setPos({
      x: Math.max(0, (window.innerWidth - size.w) / 2),
      y: Math.max(0, (window.innerHeight - size.h) / 2),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMaximized) return;
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    e.preventDefault();
  }, [isMaximized, pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const style: React.CSSProperties = isMaximized
    ? { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh" }
    : isMinimized
    ? { position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", width: size.w, height: 44 }
    : { position: "fixed", top: pos.y, left: pos.x, width: size.w, height: size.h };

  return (
    <div
      ref={windowRef}
      style={{ ...style, zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: isMaximized ? 0 : 10, boxShadow: "0 25px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.08)" }}
    >
      {/* Title bar */}
      <div
        onMouseDown={onMouseDown}
        style={{
          height: 44,
          background: "linear-gradient(180deg, #f0f0f0 0%, #e2e2e2 100%)",
          borderBottom: "1px solid #c0c0c0",
          display: "flex",
          alignItems: "center",
          paddingLeft: 12,
          paddingRight: 12,
          userSelect: "none",
          cursor: "default",
          flexShrink: 0,
          gap: 8,
        }}
      >
        {/* Traffic-light buttons */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Close — red */}
          <button
            onClick={onClose}
            title="Close"
            style={{ width: 13, height: 13, borderRadius: "50%", background: "#FF5F57", border: "1px solid #E0443E", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          />
          {/* Minimize — yellow */}
          <button
            onClick={() => setIsMinimized(v => !v)}
            title="Minimize"
            style={{ width: 13, height: 13, borderRadius: "50%", background: "#FEBC2E", border: "1px solid #D4A017", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          />
          {/* Maximize — green */}
          <button
            onClick={() => { setIsMaximized(v => !v); setIsMinimized(false); }}
            title="Maximize"
            style={{ width: 13, height: 13, borderRadius: "50%", background: "#28C840", border: "1px solid #1AAB29", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          />
        </div>
        {/* Title */}
        <span style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 600, color: "#333", letterSpacing: "-0.01em", marginRight: 45 }}>{title}</span>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div style={{ flex: 1, overflow: "auto", background: "#F7F8FA" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function CustomInput(props: any) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-3 bg-[#F7F8FA]/50 hover:bg-white border border-[#E2E5EC] rounded-xl text-sm text-black focus:outline-none focus:ring-4 focus:ring-[#1B5CBF]/20 focus:border-[#1B5CBF] transition-all placeholder-[#9AA1B1] font-medium ${props.className || ""}`}
      style={undefined}
    />
  );
}

function CustomSelect({ value, onChange, options, placeholder, className = "", searchable = false, maxDisplay }: { value: string, onChange: (v: string) => void, options: {value: string | number, label: string}[], placeholder: string, className?: string, searchable?: boolean, maxDisplay?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find(o => String(o.value) === String(value));
  const filteredOptions = searchable && search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;
  const displayedOptions = maxDisplay ? filteredOptions.slice(0, maxDisplay) : filteredOptions;

  const handleOpen = () => {
    setIsOpen(!isOpen);
    setSearch("");
  };
  
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleOpen}
        className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-[#F7F8FA]/50 hover:bg-white border border-[#E2E5EC] rounded-xl text-xs sm:text-sm text-black focus:outline-none focus:ring-4 focus:ring-[#1B5CBF]/20 focus:border-[#1B5CBF] transition-all flex items-center justify-between text-left font-medium"
      >
        <span className={`${selected ? "text-black" : "text-[#9AA1B1]"} truncate mr-1.5`}>{selected ? selected.label : placeholder}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-[#9AA1B1] flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); setSearch(""); }} />
          <div className="absolute z-50 w-full mt-2 bg-white border border-[#E2E5EC] rounded-xl shadow-xl top-full overflow-hidden">
            {searchable && (
              <div className="p-2 border-b border-[#EFF1F5]">
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9AA1B1] pointer-events-none"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  <input
                    autoFocus
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search employer..."
                    onClick={e => e.stopPropagation()}
                    className="w-full pl-7 pr-3 py-1.5 text-xs bg-[#F7F8FA] border border-[#EFF1F5] rounded-lg text-black placeholder-[#9AA1B1] font-medium focus:outline-none focus:ring-2 focus:ring-[#1B5CBF]/20 focus:border-[#1B5CBF] transition-all"
                  />
                </div>
              </div>
            )}
            <div className="max-h-52 overflow-y-auto py-1">
              {displayedOptions.length === 0 ? (
                <p className="px-4 py-3 text-xs text-[#9AA1B1] font-medium">No employers found</p>
              ) : displayedOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`w-full text-left px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm hover:bg-[#F7F8FA] transition-colors flex items-center justify-between ${String(value) === String(opt.value) ? "text-[#141821] bg-[#EFF1F5]" : "text-[#141821]"}`}
                  onClick={() => {
                    onChange(String(opt.value));
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  <span className={`${String(value) === String(opt.value) ? "font-bold" : "font-medium"} truncate mr-2`}>{opt.label}</span>
                  {String(value) === String(opt.value) && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#141821] flex-shrink-0"><path d="M20 6 9 17l-5-5"/></svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PackageDropdown({ packages, selectedId, onSelect }: { packages: any[], selectedId: string, onSelect: (id: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedPkg = packages.find(p => p.id === selectedId);

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="admin-input"
        style={{
          width: "100%", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "#F7F8FA", border: isOpen ? "1.5px solid #1B5CBF" : "1.5px solid #E2E5EC", cursor: "pointer",
          borderRadius: 10, outline: "none", boxShadow: isOpen ? "0 0 0 3px rgba(27,92,191,0.12)" : "none", transition: "border-color 0.2s, box-shadow 0.2s"
        }}
      >
        <span style={{ color: selectedPkg ? "#141821" : "#4C5361", fontSize: 14, fontWeight: 500 }}>
          {selectedPkg ? selectedPkg.name : "Select a package"}
        </span>
        <ChevronDown size={16} color="#4C5361" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
              background: "#ffffff", borderRadius: 12, border: "1px solid #EFF1F5",
              boxShadow: "0 10px 25px rgba(0,0,0,0.08)", overflow: "hidden"
            }}
          >
            <div style={{ maxHeight: 240, overflowY: "auto", padding: 6 }}>
              {packages.map(pkg => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => { onSelect(pkg.id); setIsOpen(false); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", padding: "10px 12px", gap: 10,
                    background: selectedId === pkg.id ? "#F7F8FA" : "transparent", border: "none", borderRadius: 8, cursor: "pointer",
                    textAlign: "left", marginTop: 2
                  }}
                  onMouseEnter={(e) => { if(selectedId !== pkg.id) e.currentTarget.style.background = "#F7F8FA" }}
                  onMouseLeave={(e) => { if(selectedId !== pkg.id) e.currentTarget.style.background = "transparent" }}
                >
                  <div style={{ width: 16, display: "flex", justifyContent: "center", flexShrink: 0 }}>
                    {selectedId === pkg.id && <Check size={16} color="#1B5CBF" />}
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#141821" }}>{pkg.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ padding: "4px 8px", background: "#EFF1F5", borderRadius: 100, fontSize: 11, fontWeight: 600, color: "#343A46" }}>
                      {pkg.duration_days} Days
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#141821" }}>{Number(pkg.price).toLocaleString("en-US")} ETB</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BusinessTypeSelect({ value, onChange, businessTypes, onAddType }: { value: string, onChange: (name: string) => void, businessTypes: { id: string, name: string }[], onAddType: (name: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherValue, setOtherValue] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmitOther = () => {
    const trimmed = otherValue.trim();
    if (!trimmed) return;
    onAddType(trimmed);
    setShowOtherInput(false);
    setOtherValue("");
  };

  return (
    <div>
      <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: "100%", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#F7F8FA", border: isOpen ? "1.5px solid #1B5CBF" : "1.5px solid #E2E5EC", cursor: "pointer",
            borderRadius: 10, outline: "none", boxShadow: isOpen ? "0 0 0 3px rgba(27,92,191,0.12)" : "none", transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box"
          }}
        >
          <span style={{ color: value ? "#141821" : "#4C5361", fontSize: 14, fontWeight: 500 }}>
            {value || "Select business type"}
          </span>
          <ChevronDown size={16} color="#4C5361" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -5, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
                background: "#ffffff", borderRadius: 12, border: "1px solid #EFF1F5",
                boxShadow: "0 10px 25px rgba(0,0,0,0.08)", overflow: "hidden"
              }}
            >
              <div style={{ maxHeight: 240, overflowY: "auto", padding: 6 }}>
                {businessTypes.map(bt => (
                  <button
                    key={bt.id}
                    type="button"
                    onClick={() => { onChange(bt.name); setIsOpen(false); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", padding: "10px 12px", gap: 10,
                      background: value === bt.name ? "#F7F8FA" : "transparent", border: "none", borderRadius: 8, cursor: "pointer",
                      textAlign: "left", marginTop: 2
                    }}
                    onMouseEnter={(e) => { if (value !== bt.name) e.currentTarget.style.background = "#F7F8FA" }}
                    onMouseLeave={(e) => { if (value !== bt.name) e.currentTarget.style.background = "transparent" }}
                  >
                    <div style={{ width: 16, display: "flex", justifyContent: "center", flexShrink: 0 }}>
                      {value === bt.name && <Check size={16} color="#1B5CBF" />}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "#141821" }}>{bt.name}</span>
                  </button>
                ))}
                <div style={{ height: 1, background: "#EFF1F5", margin: "6px 4px" }} />
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); setShowOtherInput(true); setOtherValue(""); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", padding: "10px 12px", gap: 10,
                    background: "transparent", border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#F7F8FA" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
                >
                  <div style={{ width: 16, display: "flex", justifyContent: "center", flexShrink: 0 }}>
                    <Plus size={14} color="#1B5CBF" />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#1B5CBF" }}>Other</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showOtherInput && (
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <input
            autoFocus
            type="text"
            value={otherValue}
            onChange={e => setOtherValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSubmitOther(); } }}
            placeholder="e.g. Bakery, Lounge, NGO"
            style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1.5px solid #E2E5EC", fontSize: 14, fontWeight: 500, color: "#141821", background: "#F7F8FA", boxSizing: "border-box", outline: "none" }}
          />
          <button
            type="button"
            onClick={handleSubmitOther}
            disabled={!otherValue.trim()}
            style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: !otherValue.trim() ? "#93c5fd" : "#1B5CBF", color: "#fff", fontSize: 13, fontWeight: 700, cursor: !otherValue.trim() ? "not-allowed" : "pointer" }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setShowOtherInput(false); setOtherValue(""); }}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid #E2E5EC", background: "#F7F8FA", color: "#6E7686", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Employer Performance line chart ─────────────────────────────────────────
// Two real series (daily post count, daily active count) plotted as trend
// lines rather than bars — a sparse day-by-day post count reads as one
// dominant spike as a bar chart; as a line it reads as a trend.
const CHART_COLOR_POSTS = "#2a78d6";
const CHART_COLOR_ACTIVE = "#1baf7a";

function niceStep(max: number) {
  if (max <= 5) return 1;
  if (max <= 10) return 2;
  if (max <= 25) return 5;
  if (max <= 50) return 10;
  return Math.ceil(max / 5 / 10) * 10;
}

function EmployerPerformanceChart({ data }: { data: { name: string; posts: number; active: number }[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const n = data.length;
  const rawMax = Math.max(...data.map((d) => d.posts), 1);
  const step = niceStep(rawMax);
  const yMax = Math.max(step, Math.ceil((rawMax + 1) / step) * step);

  const padLeft = 30;
  const padRight = 16;
  const padTop = 14;
  const plotH = 140;
  const axisBand = 26;
  const totalH = padTop + plotH + axisBand;
  const plotW = Math.max(n > 1 ? (n - 1) * 14 : 0, 420);
  const totalW = padLeft + plotW + padRight;

  const x = (i: number) => padLeft + (n > 1 ? (i * plotW) / (n - 1) : plotW / 2);
  const y = (v: number) => padTop + plotH - (v / yMax) * plotH;

  const linePath = (key: "posts" | "active") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`).join(" ");

  const ticks: number[] = [];
  for (let v = 0; v <= yMax; v += step) ticks.push(v);

  const labelEvery = Math.max(1, Math.ceil(n / 6));
  const last = data[n - 1];

  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const px = ((e.clientX - rect.left) / rect.width) * totalW;
    const rel = (px - padLeft) / (plotW || 1);
    const idx = Math.round(rel * (n - 1));
    setHoverIdx(Math.max(0, Math.min(n - 1, idx)));
  };

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div style={{ position: "relative" }}>
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${totalW} ${totalH}`}
          width={totalW}
          height={totalH}
          style={{ display: "block", overflow: "visible" }}
          onPointerMove={handleMove}
          onPointerLeave={() => setHoverIdx(null)}
        >
          {/* Gridlines — hairline, recessive, clean numbers */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padLeft} x2={padLeft + plotW} y1={y(t)} y2={y(t)} stroke="#e1e0d9" strokeWidth={1} />
              <text x={padLeft - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#898781">{t}</text>
            </g>
          ))}
          <line x1={padLeft} x2={padLeft + plotW} y1={y(0)} y2={y(0)} stroke="#c3c2b7" strokeWidth={1} />

          {/* Sparse x-axis date labels */}
          {data.map((d, i) => (
            (i % labelEvery === 0 || i === n - 1) ? (
              <text key={i} x={x(i)} y={totalH - 6} textAnchor="middle" fontSize={10} fill="#898781">{d.name}</text>
            ) : null
          ))}

          {/* Crosshair — finds the X on hover */}
          {hovered && (
            <line x1={x(hoverIdx!)} x2={x(hoverIdx!)} y1={padTop} y2={padTop + plotH} stroke="#c3c2b7" strokeWidth={1} />
          )}

          {/* Trend lines */}
          <path d={linePath("posts")} fill="none" stroke={CHART_COLOR_POSTS} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <path d={linePath("active")} fill="none" stroke={CHART_COLOR_ACTIVE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* End markers + direct value labels (text stays in ink, never the series color) */}
          <circle cx={x(n - 1)} cy={y(last.posts)} r={4} fill={CHART_COLOR_POSTS} stroke="#fff" strokeWidth={2} />
          <text x={x(n - 1) + 8} y={y(last.posts)} dominantBaseline="middle" fontSize={11} fontWeight={700} fill="#141821">{last.posts}</text>
          <circle cx={x(n - 1)} cy={y(last.active)} r={4} fill={CHART_COLOR_ACTIVE} stroke="#fff" strokeWidth={2} />
          <text x={x(n - 1) + 8} y={y(last.active)} dominantBaseline="middle" fontSize={11} fontWeight={700} fill="#141821">{last.active}</text>

          {/* Hover markers */}
          {hovered && (
            <>
              <circle cx={x(hoverIdx!)} cy={y(hovered.posts)} r={4} fill={CHART_COLOR_POSTS} stroke="#fff" strokeWidth={2} />
              <circle cx={x(hoverIdx!)} cy={y(hovered.active)} r={4} fill={CHART_COLOR_ACTIVE} stroke="#fff" strokeWidth={2} />
            </>
          )}
        </svg>
      </div>

      {/* Tooltip — every series, values lead */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            left: Math.min(Math.max((x(hoverIdx!) / totalW) * 100, 8), 92) + "%",
            top: 0,
            transform: "translate(-50%, calc(-100% - 8px))",
            background: "#0b0b0b",
            color: "#fff",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4, color: "#fff" }}>{hovered.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 2, background: CHART_COLOR_POSTS, display: "inline-block", borderRadius: 1 }} />
            <span style={{ color: "#c3c2b7" }}>Posts</span> <strong>{hovered.posts}</strong>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 2, background: CHART_COLOR_ACTIVE, display: "inline-block", borderRadius: 1 }} />
            <span style={{ color: "#c3c2b7" }}>Active</span> <strong>{hovered.active}</strong>
          </div>
        </div>
      )}

      {/* Legend — line keys, mirrors the mark */}
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <span style={{ width: 12, height: 2, background: CHART_COLOR_POSTS, display: "inline-block", borderRadius: 1 }} />
          <span className="text-xs text-[#4C5361]">Total Posts</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 12, height: 2, background: CHART_COLOR_ACTIVE, display: "inline-block", borderRadius: 1 }} />
          <span className="text-xs text-[#4C5361]">Active Jobs</span>
        </div>
      </div>
    </div>
  );
}

// Default employer for the Overview → Employer Performance panel: whoever
// posted the most jobs in the trailing 7 days (active-job count breaks ties).
// Computed once from the server-rendered snapshot so a live data push mid-session
// doesn't yank the admin's own selection back to the top performer.
function computeTopPerformerId(employers: any[], jobs: any[]): string {
  if (!employers || employers.length === 0) return "";
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const scores = new Map<string, { posts: number; active: number }>();
  for (const emp of employers) scores.set(emp.id, { posts: 0, active: 0 });
  for (const j of jobs || []) {
    const s = scores.get(j.employer_id);
    if (!s || new Date(j.created_at) < cutoff) continue;
    s.posts++;
    if (j.status === "active") s.active++;
  }

  let best = employers[0];
  let bestScore = scores.get(best.id)!;
  for (const emp of employers) {
    const score = scores.get(emp.id)!;
    if (score.posts > bestScore.posts || (score.posts === bestScore.posts && score.active > bestScore.active)) {
      best = emp;
      bestScore = score;
    }
  }
  return best.id;
}

type Tab = "overview" | "employers" | "jobs" | "configuration" | "monetization" | "reporting" | "settings";
type ConfigSubTab = "users" | "content" | "broadcast" | "activity";
type SeekerSubTab = "user-config" | "tab2" | "tab3" | "tab4";
type MonSubTab = "monetization" | "pricing";
type EmpSubTab = "emp_config" | null;
type EmpConfigSubTab = "view_emp" | "add_emp" | null;

export default function AdminDashboard({ initialData, initialUi = {} }: { initialData: any; initialUi?: Partial<AdminUiState> }) {
  const [data, setData] = useState(initialData);
  const VALID_TABS: Tab[] = ["overview", "employers", "jobs", "configuration", "monetization", "reporting", "settings"];
  // Seed each tab/sub-tab from the persisted UI cookie (passed in from the server
  // component) so SSR and the client agree on first render — no reload flash.
  const seed = <T,>(value: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(value as T) ? (value as T) : fallback;

  const [activeTab, setActiveTab] = useState<Tab>(() => seed(initialUi.tab, VALID_TABS, "overview"));
  const [configSubTab, setConfigSubTab] = useState<ConfigSubTab>(() => seed(initialUi.configSubTab, ["users", "content", "broadcast", "activity"], "users"));
  const [monSubTab, setMonSubTab] = useState<MonSubTab>(() => seed(initialUi.monSubTab, ["monetization", "pricing"], "monetization"));
  const [empSubTab, setEmpSubTab] = useState<EmpSubTab>(() => seed(initialUi.empSubTab, ["emp_config", null], "emp_config"));
  const [empConfigSubTab, setEmpConfigSubTab] = useState<EmpConfigSubTab>(() => seed(initialUi.empConfigSubTab, ["view_emp", "add_emp", null], null));
  const [selectedEmployerId, setSelectedEmployerId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const [empViewSearch, setEmpViewSearch] = useState("");
  const [empResults, setEmpResults] = useState<any[]>([]);
  const [empTotal, setEmpTotal] = useState(0);
  const [empPage, setEmpPage] = useState(1);
  const [empLoading, setEmpLoading] = useState(false);
  // Briefly highlights a single employer row after jumping here from a
  // renewal notification, so the admin doesn't have to hunt for it in the list.
  const [highlightEmployerId, setHighlightEmployerId] = useState<string | null>(null);
  const empPageSize = 20;
  const [newTelegramId, setNewTelegramId] = useState("");
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newBusinessType, setNewBusinessType] = useState("");
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [businessTypes, setBusinessTypes] = useState<{ id: string, name: string }[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [authNumberResult, setAuthNumberResult] = useState<{ name: string; number: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [deleteUserModal, setDeleteUserModal] = useState<{ id: string; name: string } | null>(null);
  const [banUserModal, setBanUserModal] = useState<{ id: string; name: string; is_banned: boolean } | null>(null);
  const [approveReqModal, setApproveReqModal] = useState<string | null>(null);
  const [userActionPassword, setUserActionPassword] = useState("");
  const [userActionLoading, setUserActionLoading] = useState(false);
  const [userActionError, setUserActionError] = useState("");

  const [editModal, setEditModal] = useState<{ id: string; name: string; type: string; postLimit: number; packageId: string; packageExpiresAt: string | null } | null>(null);
  const [renewLoading, setRenewLoading] = useState(false);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editPostLimit, setEditPostLimit] = useState<number>(15);
  const [editPackageId, setEditPackageId] = useState<string>("");
  const [editLoading, setEditLoading] = useState(false);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editCropFile, setEditCropFile] = useState<File | null>(null);
  const [editError, setEditError] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [settingsTab, setSettingsTab] = useState<"edit" | "publishing">(() => seed(initialUi.settingsTab, ["edit", "publishing"], "edit"));
  const [autoPublishSaving, setAutoPublishSaving] = useState(false);

  const [pricingState, setPricingState] = useState({
    pinVacancy: "1,000",
    companyName: "Prime Hospitality Business Group PLC",
    bankName: "Awash Bank",
    accountNo: "013041457659800",
    ...(initialData?.pricingConfig || {})
  });
  const [isEditingPricing, setIsEditingPricing] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [packageModal, setPackageModal] = useState<{ id?: string; name: string; duration_days: string; price: string; category: "standard" | "premium" } | null>(null);
  const [packageModalSaving, setPackageModalSaving] = useState(false);
  const [packageModalError, setPackageModalError] = useState("");
  const [deletePackageModal, setDeletePackageModal] = useState<{ id: string; name: string } | null>(null);
  const [deletePackageError, setDeletePackageError] = useState("");
  const [deletePackageLoading, setDeletePackageLoading] = useState(false);

  // Sub-admin management state
  const [loggedInAdmin, setLoggedInAdmin] = useState<{ username: string; role: "super_admin" | "sub_admin"; permissions: AdminPermissions } | null>(initialData?.loggedInAdmin || null);
  const [subAdmins, setSubAdmins] = useState<(SubAdmin & { password: string })[]>(initialData?.subAdmins || []);
  const [newSubUsername, setNewSubUsername] = useState("");
  const [newSubPassword, setNewSubPassword] = useState("");
  const [subAdminLoading, setSubAdminLoading] = useState(false);
  const [subAdminError, setSubAdminError] = useState("");
  const [subAdminSuccess, setSubAdminSuccess] = useState("");
  const [showSubAdminForm, setShowSubAdminForm] = useState(false);
  const [expandedSubAdmins, setExpandedSubAdmins] = useState<Record<string, boolean>>({});
  const [deleteSubAdminModal, setDeleteSubAdminModal] = useState<{ id: string; username: string } | null>(null);

  // Scheduled publication state
  const [scheduleModal, setScheduleModal] = useState<{ id: string; title: string; scheduledAt?: string } | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  // Job reposting state
  const [repostModal, setRepostModal] = useState<{ id: string; title: string } | null>(null);
  const [repostDeadline, setRepostDeadline] = useState("");
  const [repostLoading, setRepostLoading] = useState(false);
  const [repostError, setRepostError] = useState("");

  const handleSavePricing = async () => {
    if (!isEditingPricing) {
      // Enter edit mode
      setIsEditingPricing(true);
      return;
    }
    // Save mode
    setPricingSaving(true);
    try {
      await updatePricingConfig(pricingState);
    } catch (e) {
      console.error("Failed to save pricing:", e);
    } finally {
      setPricingSaving(false);
      setIsEditingPricing(false);
    }
  };

  const refreshPackages = async () => {
    try {
      const res = await getPackages();
      setPackages(res);
    } catch (e) {
      console.error("Failed to refresh packages:", e);
    }
  };

  const handleSavePackage = async () => {
    if (!packageModal) return;
    const duration = parseInt(packageModal.duration_days, 10);
    const price = parseFloat(packageModal.price);
    setPackageModalError("");
    setPackageModalSaving(true);
    try {
      await upsertPackage(packageModal.id ?? null, packageModal.name, duration, price, packageModal.category);
      setPackageModal(null);
      await refreshPackages();
    } catch (e) {
      setPackageModalError(e instanceof Error ? e.message : "Failed to save package.");
    } finally {
      setPackageModalSaving(false);
    }
  };

  const handleDeletePackage = async () => {
    if (!deletePackageModal) return;
    setDeletePackageError("");
    setDeletePackageLoading(true);
    try {
      await deletePackage(deletePackageModal.id);
      setDeletePackageModal(null);
      await refreshPackages();
    } catch (e) {
      setDeletePackageError(e instanceof Error ? e.message : "Failed to delete package.");
    } finally {
      setDeletePackageLoading(false);
    }
  };

  const [viewingJob, setViewingJob] = useState<any | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [overviewEmployerId, setOverviewEmployerId] = useState<string>(() => computeTopPerformerId(initialData.employers, initialData.jobs));
  const [overviewDuration, setOverviewDuration] = useState<"7" | "30" | "90">("7");
  const [activityDuration, setActivityDuration] = useState<"all" | "1" | "7" | "30">("all");
  const [employerSearch, setEmployerSearch] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalLoading, setProfileModalLoading] = useState(false);
  const [profileModalSaving, setProfileModalSaving] = useState(false);
  const [profileModalError, setProfileModalError] = useState("");
  const [platformBusinessName, setPlatformBusinessName] = useState("");
  const [platformLogoUrl, setPlatformLogoUrl] = useState<string | null>(null);
  const [platformLogoFile, setPlatformLogoFile] = useState<File | null>(null);
  const [platformLogoPreview, setPlatformLogoPreview] = useState<string | null>(null);
  const [platformRemoveLogo, setPlatformRemoveLogo] = useState(false);
  const [platformCropFile, setPlatformCropFile] = useState<File | null>(null);
  const platformFileInputRef = useRef<HTMLInputElement>(null);
  const [seekerSubTab, setSeekerSubTab] = useState<SeekerSubTab>(() => seed(initialUi.seekerSubTab, ["user-config", "tab2", "tab3", "tab4"], "user-config"));
  const [userSearchName, setUserSearchName] = useState("");
  const [userSearchPhone, setUserSearchPhone] = useState("");

  const [userResults, setUserResults] = useState<any[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userLoading, setUserLoading] = useState(false);
  const userPageSize = 25;

  const [professionsData, setProfessionsData] = useState<{name: string, count: number}[]>([]);
  const [professionsLoading, setProfessionsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "configuration" && configSubTab === "users" && seekerSubTab === "tab2") {
      const fetchProfessions = async () => {
        setProfessionsLoading(true);
        try {
          const res = await getProfessionCounts();
          setProfessionsData(res);
        } catch (e) {
          console.error(e);
        } finally {
          setProfessionsLoading(false);
        }
      };
      fetchProfessions();
    }
  }, [activeTab, configSubTab, seekerSubTab]);

  useEffect(() => {
    if (activeTab === "configuration" && configSubTab === "users" && seekerSubTab === "user-config") {
      const handler = setTimeout(async () => {
        setUserLoading(true);
        try {
          const res = await searchUsers(userSearchName, userSearchPhone, userPage, userPageSize);
          setUserResults(res.users);
          setUserTotal(res.total);
        } catch (e) {
          console.error(e);
        } finally {
          setUserLoading(false);
        }
      }, 300);
      return () => clearTimeout(handler);
    }
  }, [activeTab, configSubTab, seekerSubTab, userSearchName, userSearchPhone, userPage]);

  useEffect(() => {
    if (activeTab === "employers" && empSubTab === "emp_config" && empConfigSubTab === "view_emp") {
      const handler = setTimeout(async () => {
        setEmpLoading(true);
        try {
          const res = await searchEmployers(empViewSearch, empPage, empPageSize);
          // If the data set shrank under us (e.g. an employer was deleted while
          // on the last page), snap back to the last real page instead of
          // stranding the admin on a now-empty page.
          const lastPage = Math.max(1, Math.ceil(res.total / empPageSize));
          if (empPage > lastPage) {
            setEmpPage(lastPage);
            return;
          }
          setEmpResults(res.employers);
          setEmpTotal(res.total);
        } catch (e) {
          console.error(e);
        } finally {
          setEmpLoading(false);
        }
      }, 300);
      return () => clearTimeout(handler);
    }
  }, [activeTab, empSubTab, empConfigSubTab, empViewSearch, empPage]);

  useEffect(() => {
    if ((activeTab === "employers" && empSubTab === "emp_config") || (activeTab === "monetization" && monSubTab === "pricing")) {
      const fetchPkgs = async () => {
        try {
          const res = await getPackages();
          setPackages(res);
        } catch (e) {
          console.error(e);
        }
      };
      fetchPkgs();
    }
  }, [activeTab, empSubTab, monSubTab]);

  useEffect(() => {
    if (activeTab === "employers" && empSubTab === "emp_config") {
      const fetchTypes = async () => {
        try {
          const res = await getBusinessTypes();
          setBusinessTypes(res);
        } catch (e) {
          console.error(e);
        }
      };
      fetchTypes();
    }
  }, [activeTab, empSubTab]);

  // Persist tab + sub-tab position to a cookie so a full reload restores the
  // same spot (the server reads this cookie to render the right tab up front).
  useEffect(() => {
    writeAdminUi({ tab: activeTab, configSubTab, monSubTab, empSubTab, empConfigSubTab, settingsTab, seekerSubTab });
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [activeTab, configSubTab, monSubTab, empSubTab, empConfigSubTab, settingsTab, seekerSubTab]);

  // `data` is otherwise only ever set once (server-rendered on page load) or
  // patched locally right after this admin's own action. Anything that
  // happens elsewhere — an employer posting a job, another sub-admin acting —
  // was invisible until a full page reload. Poll the same data the initial
  // page load fetches so jobs/employers/activity stay live in the background.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const fresh = await runSilently(() => getAdminData());
        setData((prev: any) => ({
          ...prev,
          employers: fresh.employers,
          jobs: fresh.jobs,
          employerActivityLog: fresh.employerActivityLog,
          userCount: fresh.userCount,
        }));
      } catch (e) {
        // Silent — next tick will retry, no need to surface a background poll failure
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!highlightEmployerId) return;
    const t = setTimeout(() => setHighlightEmployerId(null), 3000);
    return () => clearTimeout(t);
  }, [highlightEmployerId]);

  const perms = loggedInAdmin?.permissions;
  const isSuperAdmin = loggedInAdmin?.role === "super_admin";

  const allNavItems = [
    { id: "overview", label: "Admin Overview", icon: LayoutDashboard, perm: null },
    { id: "employers", label: "Employers & Companies", icon: Briefcase, perm: "manageEmployers" as keyof AdminPermissions },
    { id: "jobs", label: "Job Posting Moderation", icon: FileText, perm: "manageJobs" as keyof AdminPermissions },
    { id: "configuration", label: "Configuration", icon: Settings, perm: "manageConfiguration" as keyof AdminPermissions },
    { id: "monetization", label: "Monetization & Pricing", icon: CreditCard, perm: "manageConfiguration" as keyof AdminPermissions },
    { id: "reporting", label: "Reporting & Analytics", icon: BarChart3, perm: "manageReports" as keyof AdminPermissions },
  ] as const;

  // For super admin show all; for sub-admin only tabs they have permission for
  const navItems = allNavItems.filter((item) => {
    if (!item.perm) return true; // overview always visible
    if (isSuperAdmin) return true;
    return perms?.[item.perm] ?? false;
  });

  const POST_LIMIT_OPTIONS = [
    { value: 15, label: "15 / day", description: "Standard" },
    { value: 30, label: "30 / day", description: "Premium" },
    { value: -1, label: "Unlimited", description: "Platform / Internal" },
  ];

  const getPostLimitLabel = (limit: number) => {
    if (limit === -1) return "Unlimited";
    return `${limit}/day`;
  };

  const handleEditLogoCropConfirm = (blob: Blob) => {
    const croppedFile = new File([blob], "avatar.png", { type: "image/png" });
    setEditCropFile(null);
    setEditLogoFile(croppedFile);
  };

  const handleEditEmployer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;
    setEditLoading(true);
    setEditError("");
    try {
      const pendingType = businessTypes.find(t => t.name === editType && t.id.startsWith("pending-"));
      if (pendingType) {
        try {
          const created = await addBusinessType(pendingType.name);
          setBusinessTypes(prev => prev.map(t => t.id === pendingType.id ? created : t));
        } catch (_) {
          // Best-effort: employer's business_type is stored as text regardless of the lookup table.
        }
      }

      // Upload the logo first: it's the most failure-prone step (file type/size,
      // network, storage), so if it fails, nothing else should have been saved yet.
      let logoUrl = null;
      if (editLogoFile) {
        const currentEmployer = data.employers.find((emp: any) => emp.id === editModal.id);
        const oldLogoUrl = currentEmployer?.logo_url;
        if (oldLogoUrl) {
          const oldPath = oldLogoUrl.split("/logos/")[1];
          if (oldPath) {
            await supabase.storage.from("logos").remove([oldPath]);
          }
        }

        const fileExt = editLogoFile.name.split(".").pop();
        const fileName = `${editModal.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("logos").upload(fileName, editLogoFile);
        if (uploadError) throw new Error("Logo upload failed: " + uploadError.message);

        const { data: publicUrlData } = supabase.storage.from("logos").getPublicUrl(fileName);
        logoUrl = publicUrlData.publicUrl;

        // Update the logo on the backend
        await adminUpdateEmployerLogo(editModal.id, logoUrl);
      }

      // Only send a package id if the admin actually changed the selection —
      // otherwise the server leaves package/expiry untouched (see updateEmployer).
      const packageChanged = editPackageId !== editModal.packageId;
      const res = await updateEmployer(editModal.id, editName, editType, editPostLimit, editPassword, packageChanged ? editPackageId : undefined);

      if (res.success && res.employer) {
        const finalEmployer = { ...res.employer };
        if (logoUrl) finalEmployer.logo_url = logoUrl;
        setData((prev: any) => ({
          ...prev,
          employers: prev.employers.map((emp: any) => emp.id === editModal.id ? finalEmployer : emp)
        }));
        setEmpResults((prev: any[]) => prev.map((emp: any) => emp.id === editModal.id ? { ...emp, ...finalEmployer } : emp));
        setEditModal(null);
        setEditPassword("");
      }
    } catch (err: any) {
      setEditError(err.message || "Failed to update employer");
    } finally {
      setEditLoading(false);
    }
  };

  // Renews the currently-selected package for a fresh cycle starting today.
  // Runs independently of the Save Changes submit, which only touches
  // package/expiry when the admin actually changes the dropdown selection --
  // renewing needs to force that recompute even when the package is unchanged.
  const handleRenewSubscription = async () => {
    if (!editModal || !editPackageId || !editPassword) return;
    setRenewLoading(true);
    setEditError("");
    try {
      const res = await updateEmployer(editModal.id, editName, editType, editPostLimit, editPassword, editPackageId);
      if (res.success && res.employer) {
        const finalEmployer = res.employer;
        setData((prev: any) => ({
          ...prev,
          employers: prev.employers.map((emp: any) => emp.id === editModal.id ? finalEmployer : emp)
        }));
        setEmpResults((prev: any[]) => prev.map((emp: any) => emp.id === editModal.id ? { ...emp, ...finalEmployer } : emp));
        setEditModal({ ...editModal, packageExpiresAt: finalEmployer.package_expires_at || null });
        setEditPassword("");
      }
    } catch (err: any) {
      setEditError(err.message || "Failed to renew subscription");
    } finally {
      setRenewLoading(false);
    }
  };

  const openProfileModal = async () => {
    setProfileModalOpen(true);
    setProfileModalLoading(true);
    setProfileModalError("");
    const res = await getPlatformEmployerProfile();
    if (res.success) {
      setPlatformBusinessName(res.businessName);
      setPlatformLogoUrl(res.logoUrl);
    } else {
      setProfileModalError(res.error);
    }
    setProfileModalLoading(false);
  };

  const closeProfileModal = () => {
    setProfileModalOpen(false);
    if (platformLogoPreview) URL.revokeObjectURL(platformLogoPreview);
    setPlatformLogoFile(null);
    setPlatformLogoPreview(null);
    setPlatformRemoveLogo(false);
    setPlatformCropFile(null);
    setProfileModalError("");
  };

  const handlePlatformFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) { setProfileModalError("Please choose an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setProfileModalError("Image must be smaller than 5MB."); return; }

    setProfileModalError("");
    setPlatformCropFile(file);
  };

  const handlePlatformCropConfirm = (blob: Blob) => {
    const croppedFile = new File([blob], "avatar.png", { type: "image/png" });
    setPlatformCropFile(null);
    setPlatformRemoveLogo(false);
    if (platformLogoPreview) URL.revokeObjectURL(platformLogoPreview);
    setPlatformLogoFile(croppedFile);
    setPlatformLogoPreview(URL.createObjectURL(croppedFile));
  };

  const handleRemovePlatformLogo = () => {
    if (platformLogoPreview) URL.revokeObjectURL(platformLogoPreview);
    setPlatformLogoFile(null);
    setPlatformLogoPreview(null);
    setPlatformRemoveLogo(true);
  };

  const handleSavePlatformProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileModalSaving(true);
    setProfileModalError("");
    try {
      const formData = new FormData();
      if (platformLogoFile) formData.set("logo", platformLogoFile);
      if (platformRemoveLogo) formData.set("removeLogo", "true");

      const res = await updatePlatformEmployerLogo(formData);
      if (!res.success) { setProfileModalError(res.error); return; }

      setPlatformLogoUrl(res.logoUrl);
      if (platformLogoPreview) URL.revokeObjectURL(platformLogoPreview);
      setPlatformLogoFile(null);
      setPlatformLogoPreview(null);
      setPlatformRemoveLogo(false);
      setProfileModalOpen(false);
    } finally {
      setProfileModalSaving(false);
    }
  };

  const handleToggleAutoPublish = async () => {
    if (!editModal) return;
    const current = data.employers.find((emp: any) => emp.id === editModal.id);
    const nextValue = !current?.auto_publish;
    setAutoPublishSaving(true);
    try {
      const res = await updateEmployerAutoPublish(editModal.id, nextValue);
      if (res.success) {
        setData((prev: any) => ({
          ...prev,
          employers: prev.employers.map((emp: any) => emp.id === editModal.id ? { ...emp, auto_publish: nextValue } : emp)
        }));
        setEmpResults((prev: any[]) => prev.map((emp: any) => emp.id === editModal.id ? { ...emp, auto_publish: nextValue } : emp));
      }
    } finally {
      setAutoPublishSaving(false);
    }
  };

  const handleDeleteEmployer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteModal) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await deleteEmployer(deleteModal.id, adminPassword);
      if (!res.success) {
        setDeleteError(res.error || "Failed to delete employer");
        return;
      }
      setData((prev: any) => ({
        ...prev,
        employers: prev.employers.filter((emp: any) => emp.id !== deleteModal.id),
        jobs: prev.jobs.filter((job: any) => job.employer_id !== deleteModal.id)
      }));
      setEmpResults((prev: any[]) => prev.filter((emp: any) => emp.id !== deleteModal.id));
      setEmpTotal((prev: number) => Math.max(0, prev - 1));
      setDeleteModal(null);
      setAdminPassword("");
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete employer");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddEmployer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");
    try {
      const trimmedTgId = newTelegramId.trim();
      
      // Perform regex check
      if (!/^[1-9][0-9]{4,11}$/.test(trimmedTgId)) {
        throw new Error("Telegram ID must be a valid number between 5 and 12 digits, and cannot start with 0.");
      }

      const parsedTelegramId = parseInt(trimmedTgId, 10);
      if (isNaN(parsedTelegramId)) {
        throw new Error("Invalid Telegram ID");
      }

      const pendingType = businessTypes.find(t => t.name === newBusinessType && t.id.startsWith("pending-"));
      if (pendingType) {
        try {
          const created = await addBusinessType(pendingType.name);
          setBusinessTypes(prev => prev.map(t => t.id === pendingType.id ? created : t));
        } catch (_) {
          // Best-effort: employer's business_type is stored as text regardless of the lookup table.
        }
      }

      const res = await addEmployer(parsedTelegramId, newBusinessName, newBusinessType, selectedPackageId || null);
      if (res.success && res.employer) {
        setData((prev: any) => ({
          ...prev,
          employers: [res.employer, ...(prev.employers || [])],
          ...(prev.users ? { users: prev.users.filter((u: any) => u.telegram_id !== parsedTelegramId) } : {})
        }));
        setEmpResults((prev: any[]) => [res.employer, ...prev]);
        setEmpTotal((prev: number) => prev + 1);
        setEmpConfigSubTab("view_emp");
        setAuthNumberResult({ name: newBusinessName, number: res.authorizationNumber });
        setNewTelegramId("");
        setNewBusinessName("");
        setNewBusinessType("");
        setSelectedPackageId("");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to add employer");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banUserModal) return;
    setUserActionLoading(true);
    setUserActionError("");
    try {
      const res = await toggleUserBan(banUserModal.id, !banUserModal.is_banned, userActionPassword);
      if (!res.success) {
        setUserActionError(res.error || "Failed to update ban status");
        return;
      }
      setData((prev: any) => ({
        ...prev,
        ...(prev.users ? { users: prev.users.map((u: any) => u.id === banUserModal.id ? { ...u, is_banned: !banUserModal.is_banned } : u) } : {})
      }));
      setBanUserModal(null);
      setUserActionPassword("");
    } catch (err: any) {
      setUserActionError(err.message || "Failed to update ban status");
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleDeleteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteUserModal) return;

    setUserActionLoading(true);
    setUserActionError("");

    try {
      const res = await deleteUser(deleteUserModal.id, userActionPassword);
      if (res.success) {
        setData((prev: any) => ({
          ...prev,
          ...(prev.users ? { users: prev.users.filter((u: any) => u.id !== deleteUserModal.id) } : {})
        }));
        setDeleteUserModal(null);
        setUserActionPassword("");
      } else {
        setUserActionError(res.error || "Failed to delete user");
      }
    } catch (err: any) {
      setUserActionError(err.message || "An unexpected error occurred");
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleDeleteSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteSubAdminModal) return;

    setUserActionLoading(true);
    setUserActionError("");

    try {
      const res = await deleteSubAdmin(deleteSubAdminModal.id, userActionPassword);
      if (res.success) {
        setSubAdmins((prev) => prev.filter((a) => a.id !== deleteSubAdminModal.id));
        setDeleteSubAdminModal(null);
        setUserActionPassword("");
      } else {
        setUserActionError(res.error || "Failed to delete admin");
      }
    } catch (err: any) {
      setUserActionError(err.message || "Failed to delete admin");
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleApproveSpecialRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveReqModal) return;

    setUserActionLoading(true);
    setUserActionError("");

    try {
      const res = await approveSpecialRequest(approveReqModal, userActionPassword);
      if (res.success) {
        setData((prev: any) => {
          const updatedUsers = prev.users ? prev.users.map((u: any) => u.id === approveReqModal ? { ...u, role: "job_seeker" } : u) : undefined;
          return {
            ...prev,
            ...(updatedUsers ? { users: updatedUsers } : {}),
            specialRequests: prev.specialRequests?.filter((r: any) => r.userId !== approveReqModal) || []
          };
        });
        setApproveReqModal(null);
        setUserActionPassword("");
      } else {
        setUserActionError(res.error || "Failed to approve request");
      }
    } catch (err: any) {
      setUserActionError(err.message || "An unexpected error occurred");
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleJobStatus = async (id: string, status: "active" | "closed" | "pending" | "scheduled" | "rejected") => {
    setLoading(`job-${id}`);
    try {
      await toggleJobStatus(id, status);
      setData((prev: any) => ({
        ...prev,
        jobs: prev.jobs.map((j: any) => j.id === id ? { ...j, status } : j)
      }));
      if (viewingJob?.id === id) {
        setViewingJob((prev: any) => prev ? { ...prev, status } : null);
      }
    } finally {
      setLoading(null);
    }
  };

  // Pre-approves a still-waiting scheduled job so job-expiration-cron routes
  // it straight to 'active' at its scheduled time instead of 'pending'.
  const handleApproveScheduled = async (id: string) => {
    setLoading(`job-${id}`);
    try {
      await approveScheduledJob(id);
      setData((prev: any) => ({
        ...prev,
        jobs: prev.jobs.map((j: any) => j.id === id ? { ...j, pre_approved: true } : j)
      }));
      if (viewingJob?.id === id) {
        setViewingJob((prev: any) => prev ? { ...prev, pre_approved: true } : null);
      }
    } finally {
      setLoading(null);
    }
  };

  // Cancels a scheduled job before it goes live -- closes it outright.
  const handleCancelSchedule = async (id: string) => {
    setLoading(`job-${id}`);
    try {
      await cancelScheduledJob(id);
      setData((prev: any) => ({
        ...prev,
        jobs: prev.jobs.map((j: any) => j.id === id ? { ...j, status: "closed", scheduled_at: null, pre_approved: false } : j)
      }));
      if (viewingJob?.id === id) {
        setViewingJob((prev: any) => prev ? { ...prev, status: "closed", scheduled_at: null, pre_approved: false } : null);
      }
    } finally {
      setLoading(null);
    }
  };

  const handleScheduleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleModal || !scheduleDate || !scheduleTime) return;
    setScheduleLoading(true);
    setScheduleError("");
    try {
      const scheduledIso = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      await scheduleJobPost(scheduleModal.id, scheduledIso);
      setData((prev: any) => ({
        ...prev,
        jobs: prev.jobs.map((j: any) => j.id === scheduleModal.id ? { ...j, status: "scheduled", scheduled_at: scheduledIso } : j)
      }));
      if (viewingJob?.id === scheduleModal.id) {
        setViewingJob((prev: any) => prev ? { ...prev, status: "scheduled", scheduled_at: scheduledIso } : null);
      }
      setScheduleModal(null);
      setScheduleDate("");
      setScheduleTime("");
    } catch (err: any) {
      setScheduleError(err.message || "Failed to schedule publication");
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleRepostConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repostModal || !repostDeadline) return;
    setRepostLoading(true);
    setRepostError("");
    try {
      const deadlineIso = new Date(repostDeadline).toISOString();
      const nowIso = new Date().toISOString();
      await repostJob(repostModal.id, deadlineIso);
      setData((prev: any) => ({
        ...prev,
        jobs: prev.jobs.map((j: any) => j.id === repostModal.id ? { ...j, status: "active", deadline: deadlineIso, scheduled_at: null, pre_approved: false, last_posted_at: nowIso } : j)
      }));
      if (viewingJob?.id === repostModal.id) {
        setViewingJob((prev: any) => prev ? { ...prev, status: "active", deadline: deadlineIso, scheduled_at: null, pre_approved: false, last_posted_at: nowIso } : null);
      }
      setRepostModal(null);
      setRepostDeadline("");
    } catch (err: any) {
      setRepostError(err.message || "Failed to repost job");
    } finally {
      setRepostLoading(false);
    }
  };

  const handleLogout = async () => {
    clearAdminUi();
    clearTabUser();
    await logoutAdmin();
    window.location.reload();
  };

  // Employers with an outstanding renewal request, surfaced in the
  // notification bell alongside special requests. Stays listed (just with
  // a "Seen" state) until an admin actually renews the package.
  const renewalRequests = (data.employers || []).filter((e: any) => e.renewal_requested);

  // Jobs awaiting moderation -- same definition as the Overview "Pending
  // Moderation" tile, now also surfaced in the bell since it's the one
  // recurring admin task that previously had no notification at all.
  const pendingJobs = (data.jobs || []).filter((j: any) => j.status === "pending");

  const handleAcknowledgeRenewal = async (employerId: string) => {
    try {
      const res = await acknowledgeEmployerRenewal(employerId);
      if (res.success && res.employer) {
        setData((prev: any) => ({
          ...prev,
          employers: prev.employers.map((e: any) => e.id === employerId ? { ...e, ...res.employer } : e)
        }));
      }
    } catch (err) {
      console.error("Failed to acknowledge renewal request:", err);
    }
  };

  const handleAcknowledgeSpecialRequest = async (userId: string) => {
    setData((prev: any) => ({
      ...prev,
      specialRequests: (prev.specialRequests || []).map((r: any) => r.userId === userId ? { ...r, seenAt: new Date().toISOString() } : r)
    }));
    try {
      await acknowledgeSpecialRequest(userId);
    } catch (err) {
      console.error("Failed to acknowledge special request:", err);
    }
  };

  const jumpToEmployerInViewEmp = (employerId: string, businessName: string) => {
    setActiveTab("employers");
    setEmpSubTab("emp_config");
    setEmpConfigSubTab("view_emp");
    setEmpViewSearch(businessName);
    setEmpPage(1);
    setHighlightEmployerId(employerId);
  };

  const jumpToPendingJob = (employerId: string) => {
    setActiveTab("jobs");
    setSelectedEmployerId(employerId);
  };

  return (
    <div className="admin-shell flex h-screen overflow-hidden">
      <style>{`@keyframes adminEmpRowBlink { 0%, 100% { background-color: transparent; } 50% { background-color: #FDF1E7; } }`}</style>
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-gray-900/50 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-[#E2E5EC] transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:shrink-0 flex flex-col ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-[#EFF1F5] shrink-0">
          <div
            style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
              marginRight: 10,
              background: "#F2F012",
              border: "1.5px solid #E2E5EC",
              boxShadow: "0 1px 4px 0 rgba(27,58,92,0.10)",
            }}
          >
            <img src="/addis_jobs_logo.webp" alt="JobsAdis Logo" style={{ width: "80%", height: "80%", objectFit: "contain" }} />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-black leading-none mt-1">JobsAdis</span>
            <span className="text-[11px] font-semibold text-[#1B5CBF] tracking-[0.03em] mt-1">Where Talent Meets Opportunity</span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="ml-auto md:hidden text-[#4C5361] hover:text-[#141821]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            // Add a visual separator before the Monetization tab for better grouping
            const isBottomSection = item.id === "monetization" || item.id === "configuration";
            
            return (
              <div key={item.id}>
                {isBottomSection && <div className="h-px bg-[#EFF1F5] my-4 mx-2" />}
                <button
                  onClick={() => { setActiveTab(item.id as Tab); setSelectedEmployerId(null); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center px-4 py-3 text-[14px] rounded-xl transition-all duration-200 ${
                    isActive 
                      ? "bg-[#1B5CBF] text-white shadow-md shadow-gray-500/20 font-semibold"
                      : "text-[#343A46] font-medium hover:bg-[#EFF1F5] hover:text-[#141821]"
                  }`}
                  style={{ border: "none", cursor: "pointer", textAlign: "left" }}
                >
                  <Icon className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? "text-white" : "text-[#9AA1B1]"}`} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-[#EFF1F5] shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-[#141821] rounded-lg hover:bg-[#EFF1F5] hover:text-black transition-colors"
            style={{ border: "none", cursor: "pointer", textAlign: "left" }}
          >
            <LogOut className="mr-3 flex-shrink-0 h-5 w-5 text-[#9AA1B1] group-hover:text-[#4C5361]" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-[#E2E5EC] h-16 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center">
            <span className="text-lg font-bold text-black tracking-tight">Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell
              specialRequests={data.specialRequests || []}
              renewalEmployers={renewalRequests}
              pendingJobs={pendingJobs}
              onOpenSpecialRequest={(userId) => {
                handleAcknowledgeSpecialRequest(userId);
                setActiveTab("configuration");
                setConfigSubTab("users");
              }}
              onAcknowledgeRenewal={handleAcknowledgeRenewal}
              onGoToEmployer={jumpToEmployerInViewEmp}
              onGoToPendingJob={jumpToPendingJob}
            />
            <button onClick={() => setMobileMenuOpen(true)} className="text-[#4C5361] hover:text-[#141821] focus:outline-none">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex bg-white h-[72px] items-center justify-between px-8 shrink-0 shadow-sm z-10 border-b border-[#E2E5EC]">
          <h1 className="text-2xl font-bold text-black tracking-tight">Admin Dashboard</h1>
          <div className="flex items-center gap-6">
            <NotificationBell
              specialRequests={data.specialRequests || []}
              renewalEmployers={renewalRequests}
              pendingJobs={pendingJobs}
              onOpenSpecialRequest={(userId) => {
                handleAcknowledgeSpecialRequest(userId);
                setActiveTab("configuration");
                setConfigSubTab("users");
              }}
              onAcknowledgeRenewal={handleAcknowledgeRenewal}
              onGoToEmployer={jumpToEmployerInViewEmp}
              onGoToPendingJob={jumpToPendingJob}
            />

            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-3 focus:outline-none hover:bg-[#F7F8FA] rounded-lg p-1.5 -m-1.5 transition-colors cursor-pointer"
              >
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(data.adminUsername || "Admin")}&background=random`} alt={data.adminUsername || "Admin"} className="w-10 h-10 rounded-full object-cover border border-[#E2E5EC]" />
                <div className="flex flex-col text-left">
                  <span className="text-sm font-bold text-black leading-none mb-1">{data.adminUsername || "Admin"}</span>
                  <span className="text-xs text-[#4C5361] font-medium leading-none">{isSuperAdmin ? "Super Admin" : "Sub Admin"}</span>
                </div>
              </button>

              {profileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E2E5EC] rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                    {isSuperAdmin && (
                      <button 
                        onClick={() => { setProfileMenuOpen(false); setSettingsOpen(true); }}
                        className="w-full text-left px-4 py-2.5 text-sm font-semibold text-[#141821] hover:bg-[#F7F8FA] hover:text-[#1B5CBF] transition-colors flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" /> Settings
                      </button>
                    )}
                    <button
                      onClick={() => { setProfileMenuOpen(false); openProfileModal(); }}
                      className="w-full text-left px-4 py-2.5 text-sm font-semibold text-[#141821] hover:bg-[#F7F8FA] hover:text-[#1B5CBF] transition-colors flex items-center gap-2"
                    >
                      <User className="w-4 h-4" /> Profile
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">

          {/* ========== ADMIN OVERVIEW ========== */}
          {activeTab === "overview" && (() => {
            const employers: any[] = data.employers;
            const jobs: any[] = data.jobs;
            const userCount: number = data.userCount;

            const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
            const cutoff = daysAgo(Number(overviewDuration));
            const inWindow = (dateStr: string) => new Date(dateStr) >= cutoff;

            // Employer performance - only for a selected employer
            const perfEmployer = employers.find(e => e.id === overviewEmployerId);
            const perfData = perfEmployer ? (() => {
              const empJobs = jobs.filter(j => j.employer_id === perfEmployer.id && inWindow(j.created_at));
              
              const duration = Number(overviewDuration);
              const days: { dateStr: string; label: string; posts: number; active: number }[] = [];
              for (let i = duration - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                days.push({
                  dateStr: d.toISOString().split('T')[0],
                  label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  posts: 0,
                  active: 0
                });
              }

              empJobs.forEach(j => {
                const jDate = new Date(j.created_at).toISOString().split('T')[0];
                const dayMatch = days.find(d => d.dateStr === jDate);
                if (dayMatch) {
                  dayMatch.posts++;
                  if (j.status === "active") {
                    dayMatch.active++;
                  }
                }
              });

              return days.map(d => ({
                name: d.label,
                posts: d.posts,
                active: d.active
              }));
            })() : [];

            // Activity feed — a real, employer-authored trail from activity_log
            // (written by the employer server actions, tagged metadata.source
            // = "employer"). Not derived from current `jobs` row state: that
            // approach couldn't tell an employer's action from an admin's
            // (e.g. "Close Job" is admin-only, yet used to be shown as
            // employer activity), always used the job's created_at even for
            // later status changes, and lost all history the moment a job
            // was deleted.
            const employerActivityLog: any[] = data.employerActivityLog || [];
            const activityCutoff = activityDuration === "all" ? new Date(0) : daysAgo(Number(activityDuration));

            const describeEmployerActivity = (action: string, meta: any): { label: string; dot: string } => {
              const live = meta?.status === "active";
              switch (action) {
                case "employer_post_job":
                  return live ? { label: "Posted a new job — now live", dot: "#12A150" } : { label: "Posted a new job — pending review", dot: "#B45309" };
                case "employer_post_from_template":
                  return live ? { label: "Posted a job from a template — now live", dot: "#12A150" } : { label: "Posted a job from a template — pending review", dot: "#B45309" };
                case "employer_repost_job":
                  return live ? { label: "Reposted an expired job — now live", dot: "#12A150" } : { label: "Reposted an expired job — pending review", dot: "#B45309" };
                case "employer_schedule_post":
                  return { label: "Scheduled a job posting", dot: "#4A80D3" };
                case "employer_edit_job":
                  return { label: "Edited a job posting", dot: "#1B5CBF" };
                case "employer_delete_job":
                  return { label: "Deleted a job posting", dot: "#E5484D" };
                case "employer_create_template":
                  return { label: "Created a vacancy template", dot: "#1B5CBF" };
                case "employer_edit_template":
                  return { label: "Updated a vacancy template", dot: "#1B5CBF" };
                case "employer_delete_template":
                  return { label: "Deleted a vacancy template", dot: "#E5484D" };
                case "employer_edit_profile":
                  return { label: "Updated company profile", dot: "#1B5CBF" };
                default:
                  return { label: action.replace(/^employer_/, "").replace(/_/g, " "), dot: "#6E7686" };
              }
            };

            const activityFeed = employerActivityLog
              .filter(e => new Date(e.created_at) >= activityCutoff)
              .slice(0, 20)
              .map(e => {
                const { label, dot } = describeEmployerActivity(e.action, e.metadata);
                return {
                  id: e.id,
                  employer: e.actor || "Unknown Employer",
                  action: label,
                  detail: e.target || "",
                  dot,
                  time: e.created_at,
                };
              });

            const fmtTime = (iso: string) => {
              const d = new Date(iso);
              const diff = Math.floor((Date.now() - d.getTime()) / 1000);
              if (diff < 60) return `${diff}s ago`;
              if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
              if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
              return `${Math.floor(diff / 86400)}d ago`;
            };

            return (
              <div className="max-w-6xl mx-auto space-y-5">

                {/* ---- ROW 1: Overall Stats — full width ---- */}
                <div className="bg-white rounded-xl border border-[#E2E5EC] shadow-sm p-6">
                  <h2 className="text-base font-bold text-[#141821] mb-5">Overall Stats</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Total Employers", value: employers.length, icon: <Building2 className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" color="#1B5CBF" strokeWidth={1.5} />, color: "#1B5CBF" },
                      { label: "Active Job Seekers", value: userCount, icon: <Users className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" color="#141821" strokeWidth={1.5} />, color: "#141821" },
                      { label: "Pending Moderation", value: jobs.filter(j => j.status === "pending").length, icon: <Hourglass className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" color="#B45309" strokeWidth={1.5} />, color: "#B45309" },
                      { label: "Total Job Posts", value: jobs.length, icon: <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" color="#12A150" strokeWidth={1.5} />, color: "#12A150" },
                    ].map(stat => (
                      <div key={stat.label} className="rounded-xl border border-[#EFF1F5] bg-[#F7F8FA]/80 p-3 sm:p-4 flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-4 transition-all hover:bg-white hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                        <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl bg-white shadow-sm border border-[#EFF1F5] flex-shrink-0">
                          {stat.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs text-[#4C5361] font-bold tracking-wider uppercase mb-1 leading-snug">{stat.label}</p>
                          <p className="text-xl sm:text-2xl font-black tracking-tight leading-none" style={{ color: stat.color }}>{stat.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ---- ROW 2: Employer Performance ---- */}
                <div className="bg-white rounded-xl border border-[#E2E5EC] shadow-sm p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                      <h2 className="text-base font-bold text-[#141821]">Employer Performance</h2>
                      <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
                        <CustomSelect
                          value={overviewEmployerId}
                          onChange={(v) => setOverviewEmployerId(v)}
                          placeholder="Select Employer"
                          options={employers.map(emp => ({ value: emp.id, label: emp.business_name }))}
                          className="flex-1 min-w-0 sm:w-48"
                          searchable
                          maxDisplay={5}
                        />
                        <CustomSelect
                          value={overviewDuration}
                          onChange={(v) => setOverviewDuration(v as "7" | "30" | "90")}
                          placeholder="Duration"
                          options={[
                            { value: "7", label: "Last 7 days" },
                            { value: "30", label: "Last 30 days" },
                            { value: "90", label: "Last 90 days" }
                          ]}
                          className="w-24 shrink-0 sm:w-40"
                        />
                      </div>
                    </div>

                    {!overviewEmployerId ? (
                      <div className="text-center py-12 text-[#9AA1B1] text-sm">Select an employer above to view their performance.</div>
                    ) : perfData.length === 0 || perfData.every(d => d.posts === 0) ? (
                      <div className="text-center py-12 text-[#9AA1B1] text-sm">No job activity in this period for the selected employer.</div>
                    ) : (
                      <EmployerPerformanceChart data={perfData} />
                    )}
                  </div>

                {/* ---- ROW 3: Employer Activity — full width ---- */}
                <div className="bg-white rounded-xl border border-[#E2E5EC] shadow-sm p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                    <div>
                      <h2 className="text-base font-bold text-[#141821] mb-1">Employer Activity</h2>
                      <p className="text-xs text-[#9AA1B1]">Latest actions taken by employers on the platform</p>
                    </div>
                    <CustomSelect
                      value={activityDuration}
                      onChange={(v) => setActivityDuration(v as "all" | "1" | "7" | "30")}
                      placeholder="Filter by Date"
                      options={[
                        { value: "all", label: "All Time" },
                        { value: "1", label: "Today" },
                        { value: "7", label: "Last 7 Days" },
                        { value: "30", label: "Last 30 Days" }
                      ]}
                      className="w-32 shrink-0 sm:w-40"
                    />
                  </div>
                  {activityFeed.length === 0 ? (
                    <div className="text-center py-10 text-[#9AA1B1] text-sm">No activity yet.</div>
                  ) : (
                    <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto pr-1">
                      {activityFeed.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 py-3">
                          <div className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                            style={{ background: item.dot + "20" }}
                          >
                            <div className="w-3 h-3 rounded-full" style={{ background: item.dot }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#141821]">{item.employer}</p>
                            <p className="text-sm text-[#4C5361]">{item.action}{item.detail ? <> — <span className="font-medium text-[#141821]">{item.detail}</span></> : null}</p>
                          </div>
                          <span className="text-xs text-[#9AA1B1] whitespace-nowrap mt-1 flex-shrink-0">{fmtTime(item.time)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            );
          })()}

          {/* ========== OTHER TABS ========== */}
          {activeTab !== "overview" && (
          <div className="max-w-6xl mx-auto bg-white rounded-xl border border-[#E2E5EC] shadow-sm overflow-hidden">
          <div className="p-4 md:p-6 border-b border-[#E2E5EC] flex justify-between items-center">
            <h2 className="m-0 text-lg md:text-xl font-semibold capitalize text-[#141821]">
              {activeTab === "jobs" && selectedEmployerId ? "Jobs by Employer" : activeTab === "configuration" ? "Configuration" : navItems.find(n => n.id === activeTab)?.label || activeTab}
            </h2>
            {activeTab === "jobs" && selectedEmployerId && (
              <button 
                onClick={() => setSelectedEmployerId(null)} 
                className="bg-transparent border border-[#E2E5EC] px-3 py-1.5 rounded-lg cursor-pointer text-sm font-medium hover:bg-[#F7F8FA] transition-colors"
              >
                ← Back to Employers
              </button>
            )}
            {activeTab === "jobs" && !selectedEmployerId && (
              <input
                type="text"
                placeholder="Search employers..."
                value={employerSearch}
                onChange={(e) => setEmployerSearch(e.target.value)}
                className="ml-auto px-3 py-2 border border-[#E2E5EC] rounded-lg text-sm w-48 md:w-64 focus:outline-none focus:ring-2 focus:ring-[#141821] focus:border-transparent transition-all"
              />
            )}
          </div>

          <div className="overflow-x-auto">
            {/* ========== EMPLOYERS SUB-TABS ========== */}
            {activeTab === "employers" && (
              <div>
                <div className="flex border-b border-[#E2E5EC] bg-[#F7F8FA]/60 px-6 pt-4 gap-1">
                  <button
                    onClick={() => setEmpSubTab("emp_config")}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border border-b-0 transition-all ${
                      empSubTab === "emp_config"
                        ? "bg-white border-[#E2E5EC] text-[#141821] shadow-sm -mb-px"
                        : "bg-transparent border-transparent text-[#4C5361] hover:text-[#141821]"
                    }`}
                    style={{ cursor: "pointer" }}
                  >
                    <span className="flex items-center gap-2"><Settings size={15} /> Emp Config</span>
                  </button>
                </div>
                {empSubTab === "emp_config" && (
                  <div className="flex border-b border-[#E2E5EC] bg-white px-6 pt-2 gap-2">
                    <button
                      onClick={() => setEmpConfigSubTab("view_emp")}
                      className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-all ${
                        empConfigSubTab === "view_emp"
                          ? "border-[#141821] text-[#141821]"
                          : "border-transparent text-[#4C5361] hover:text-[#141821]"
                      }`}
                      style={{ cursor: "pointer" }}
                    >
                      <span className="flex items-center gap-2"><Users size={14} /> View Emp</span>
                    </button>
                    <button
                      onClick={() => { setEmpConfigSubTab("add_emp"); setFormError(""); setNewTelegramId(""); setNewBusinessName(""); setNewBusinessType(""); setSelectedPackageId(""); }}
                      className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-all ${
                        empConfigSubTab === "add_emp"
                          ? "border-[#141821] text-[#141821]"
                          : "border-transparent text-[#4C5361] hover:text-[#141821]"
                      }`}
                      style={{ cursor: "pointer" }}
                    >
                      <span className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                        Add
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "employers" && empSubTab === "emp_config" && empConfigSubTab === "view_emp" && (
              <div style={{ padding: "16px 24px", background: "#F7F8FA", borderBottom: "1px solid #E2E5EC", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                <input
                  type="text"
                  placeholder="Search employers..."
                  value={empViewSearch}
                  onChange={(e) => { setEmpViewSearch(e.target.value); setEmpPage(1); }}
                  className="px-3 py-2 border border-[#E2E5EC] rounded-lg text-sm w-48 md:w-64 focus:outline-none focus:ring-2 focus:ring-[#141821] focus:border-transparent transition-all"
                />
              </div>
            )}

            {activeTab === "employers" && empSubTab === "emp_config" && empConfigSubTab === "add_emp" && (
              <div style={{ padding: "32px 24px", maxWidth: 600, margin: "0 auto" }}>
                <div style={{ background: "#fff", borderRadius: 16, padding: 32, border: "1px solid #E2E5EC", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                  <h3 style={{ margin: "0 0 24px 0", fontSize: 20, fontWeight: 800, color: "#141821", letterSpacing: "-0.02em" }}>Add New Employer</h3>
                  <form onSubmit={handleAddEmployer} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#141821", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Telegram ID</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={newTelegramId}
                        onChange={e => setNewTelegramId(e.target.value.replace(/[^0-9]/g, ""))}
                        required
                        placeholder="e.g. 123456789"
                        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #E2E5EC", fontSize: 14, fontWeight: 500, color: "#141821", background: "#F7F8FA", boxSizing: "border-box", outline: "none", transition: "border-color 0.2s" }}
                      />
                      <p style={{ margin: "5px 0 0 0", fontSize: 11, color: "#9AA1B1" }}>Must be 5–12 digits, no leading zero.</p>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#141821", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Business Name</label>
                      <input
                        type="text"
                        value={newBusinessName}
                        onChange={e => setNewBusinessName(e.target.value)}
                        required
                        placeholder="e.g. Hilton Addis Ababa"
                        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #E2E5EC", fontSize: 14, fontWeight: 500, color: "#141821", background: "#F7F8FA", boxSizing: "border-box", outline: "none" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#141821", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Business Type</label>
                      <BusinessTypeSelect
                        value={newBusinessType}
                        onChange={setNewBusinessType}
                        businessTypes={businessTypes}
                        onAddType={(name) => {
                          setBusinessTypes(prev => prev.some(t => t.name.toLowerCase() === name.toLowerCase()) ? prev : [...prev, { id: `pending-${name}`, name }]);
                          setNewBusinessType(name);
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#141821", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Subscription Package</label>
                      <PackageDropdown packages={packages} selectedId={selectedPackageId} onSelect={setSelectedPackageId} />
                    </div>
                    {formError && <p style={{ margin: 0, fontSize: 13, color: "#E5484D", background: "#FDECEC", padding: "10px 14px", borderRadius: 8, border: "1px solid #fecaca" }}>{formError}</p>}
                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                      <button type="button" onClick={() => setEmpConfigSubTab("view_emp")} disabled={formLoading} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1.5px solid #E2E5EC", background: "#F7F8FA", color: "#6E7686", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                      <button type="submit" disabled={formLoading || !newTelegramId || !newBusinessName || !newBusinessType || !selectedPackageId} style={{ flex: 2, padding: "12px", borderRadius: 10, border: "none", background: formLoading ? "#93c5fd" : "linear-gradient(135deg, #141821, #2c2c2e)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: formLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}>
                        {formLoading ? (<><svg style={{ animation: "spin 1s linear infinite" }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Registering...</>) : (<>Register Employer</>)}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            {/* ========== CONFIGURATION SUB-TABS ========== */}
            {activeTab === "configuration" && (
              <div>
                {/* Sub-tab switcher */}
                <div className="flex border-b border-[#E2E5EC] bg-[#F7F8FA]/60 px-6 pt-4 gap-1">
                  <button
                    onClick={() => setConfigSubTab("users")}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border border-b-0 transition-all ${
                      configSubTab === "users"
                        ? "bg-white border-[#E2E5EC] text-[#141821] shadow-sm -mb-px"
                        : "bg-transparent border-transparent text-[#4C5361] hover:text-[#141821]"
                    }`}
                    style={{ cursor: "pointer" }}
                  >
                    <span className="flex items-center gap-2"><Users size={15} /> Job Seeker Profiles</span>
                  </button>
                  <button
                    onClick={() => setConfigSubTab("content")}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border border-b-0 transition-all ${
                      configSubTab === "content"
                        ? "bg-white border-[#E2E5EC] text-[#141821] shadow-sm -mb-px"
                        : "bg-transparent border-transparent text-[#4C5361] hover:text-[#141821]"
                    }`}
                    style={{ cursor: "pointer" }}
                  >
                    <span className="flex items-center gap-2"><BookOpen size={15} /> Content Management</span>
                  </button>
                  <button
                    onClick={() => setConfigSubTab("broadcast")}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border border-b-0 transition-all ${
                      configSubTab === "broadcast"
                        ? "bg-white border-[#E2E5EC] text-[#141821] shadow-sm -mb-px"
                        : "bg-transparent border-transparent text-[#4C5361] hover:text-[#141821]"
                    }`}
                    style={{ cursor: "pointer" }}
                  >
                    <span className="flex items-center gap-2"><Megaphone size={15} /> Broadcast</span>
                  </button>
                  <button
                    onClick={() => setConfigSubTab("activity")}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border border-b-0 transition-all ${
                      configSubTab === "activity"
                        ? "bg-white border-[#E2E5EC] text-[#141821] shadow-sm -mb-px"
                        : "bg-transparent border-transparent text-[#4C5361] hover:text-[#141821]"
                    }`}
                    style={{ cursor: "pointer" }}
                  >
                    <span className="flex items-center gap-2"><History size={15} /> Activity Log</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === "configuration" && configSubTab === "users" && (
              <div className="flex border-t border-[#E2E5EC]" style={{ minHeight: 500 }}>
                {/* ===== 4-TAB SIDE NAV ===== */}
                <aside className="w-52 shrink-0 border-r border-[#E2E5EC] bg-[#F7F8FA]/50 py-4 flex flex-col gap-1 px-3">
                  {([
                    { id: "user-config", label: "User Configuration", icon: Users },
                    { id: "tab2", label: "Professions", icon: Briefcase },
                    { id: "tab3", label: "Tab 3", icon: BookOpen },
                    { id: "tab4", label: "Tab 4", icon: CreditCard },
                  ] as { id: SeekerSubTab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setSeekerSubTab(id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all text-left ${
                        seekerSubTab === id
                          ? "bg-[#141821] text-white shadow-sm"
                          : "text-[#4C5361] hover:bg-[#EFF1F5] hover:text-black"
                      }`}
                      style={{ border: "none", cursor: "pointer" }}
                    >
                      <Icon size={15} className="shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </aside>

                {/* ===== PANEL CONTENT ===== */}
                <div className="flex-1 min-w-0 overflow-hidden">

                  {/* ---- USER CONFIGURATION TAB ---- */}
                  {seekerSubTab === "user-config" && (() => {
                    return (
                      <div className="flex flex-col h-full">
                        {/* Special Requests Banner */}
                        {data.specialRequests && data.specialRequests.length > 0 && (
                          <div style={{ padding: "14px 20px", background: "#fffbeb", borderBottom: "1px solid #fde68a" }}>
                            <h3 style={{ margin: "0 0 10px 0", fontSize: 14, fontWeight: 700, color: "#B45309", display: "flex", alignItems: "center", gap: 7 }}>
                              <Users size={16} />
                              Special Requests ({data.specialRequests.length})
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {data.specialRequests.map((req: any) => {
                                const name = req.name || "Unknown Name";
                                return (
                                  <div key={req.userId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "10px 14px", borderRadius: 8, border: "1px solid #fde68a" }}>
                                    <div>
                                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#141821" }}>{name} (Telegram: {req.telegramId})</p>
                                      <p style={{ margin: "3px 0 0 0", fontSize: 12, color: "#b45309" }}>Ex-employer wants now to become a job seeker.</p>
                                    </div>
                                    <button
                                      onClick={() => setApproveReqModal(req.userId)}
                                      style={{ background: "#12A150", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                                    >
                                      <CheckCircle size={13} />
                                      Approve
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Search Bar */}
                        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-[#EFF1F5] bg-white">
                          <div className="flex-1 relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA1B1]" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                            <input
                              type="text"
                              placeholder="Search by name..."
                              value={userSearchName}
                              onChange={e => setUserSearchName(e.target.value)}
                              className="w-full pl-9 pr-4 py-2.5 bg-[#F7F8FA] border border-[#E2E5EC] rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#1B5CBF]/20 focus:border-[#1B5CBF] transition-all placeholder-[#9AA1B1] font-medium"
                            />
                          </div>
                          <div className="flex-1 relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA1B1]" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            <input
                              type="text"
                              placeholder="Search by phone number..."
                              value={userSearchPhone}
                              onChange={e => setUserSearchPhone(e.target.value)}
                              className="w-full pl-9 pr-4 py-2.5 bg-[#F7F8FA] border border-[#E2E5EC] rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#1B5CBF]/20 focus:border-[#1B5CBF] transition-all placeholder-[#9AA1B1] font-medium"
                            />
                          </div>
                          {(userSearchName || userSearchPhone) && (
                            <button
                              onClick={() => { setUserSearchName(""); setUserSearchPhone(""); }}
                              className="px-3 py-2 text-xs font-semibold text-[#4C5361] hover:text-[#141821] bg-[#EFF1F5] hover:bg-[#EFF1F5] rounded-xl transition-colors whitespace-nowrap"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {/* Result count */}
                        <div className="px-5 py-2 bg-[#F7F8FA] border-b border-[#EFF1F5]">
                          <div className="text-xs text-[#4C5361] mt-2 text-right">
                              {userTotal} total job seeker{userTotal !== 1 ? 's' : ''}
                            </div>
                        </div>

                        {/* Desktop Table */}
                        <div className="flex-1 overflow-y-auto min-h-0 bg-[#F7F8FA]">
                          <div className="p-4 md:p-6 pb-20">
                            {userLoading ? (
                              <div className="text-center py-10 text-[#9AA1B1] text-sm">Loading users...</div>
                            ) : userResults.length === 0 ? (
                              <div className="text-center py-10 text-[#9AA1B1] text-sm">No users found.</div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {userResults.map((u: any) => (
                                  <div key={u.id} className="bg-white p-4 rounded-xl border border-[#E2E5EC] shadow-sm flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h4 className="font-semibold text-[#141821] m-0">
                                          {u.profiles?.full_name || "Unonboarded"}
                                          {u.is_banned && <span className="text-red-500 text-xs ml-2">(Banned)</span>}
                                        </h4>
                                        <p className="text-xs text-[#4C5361] m-0 mt-1">{u.profiles?.phone_number || "No phone"}</p>
                                        <p className="text-xs text-[#9AA1B1] m-0 mt-0.5 font-mono">TG: {u.telegram_id}</p>
                                      </div>
                                      <span className="text-xs font-medium text-[#4C5361] bg-[#EFF1F5] border border-[#E2E5EC] px-2 py-1 rounded-md capitalize">{u.role}</span>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-3 border-t border-[#EFF1F5]">
                                      <button
                                        disabled={!!loading}
                                        onClick={() => { setBanUserModal({ id: u.id, name: u.profiles?.full_name || "Unonboarded", is_banned: u.is_banned }); setUserActionPassword(""); setUserActionError(""); }}
                                        style={{ background: u.is_banned ? "#12A150" : "#E5484D" }}
                                        className="text-white border-none px-3 py-1.5 rounded-lg text-xs font-medium"
                                      >
                                        {u.is_banned ? "Unban" : "Ban"}
                                      </button>
                                      <button
                                        disabled={!!loading}
                                        onClick={() => { setDeleteUserModal({ id: u.id, name: u.profiles?.full_name || "Unonboarded" }); setUserActionPassword(""); setUserActionError(""); }}
                                        className="bg-transparent text-red-500 p-1.5 cursor-pointer flex items-center"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Pagination Controls */}
                            {userTotal > 0 && (
                              <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#EFF1F5]">
                                <span className="text-sm text-[#4C5361]">
                                  Showing {(userPage - 1) * userPageSize + 1} to {Math.min(userPage * userPageSize, userTotal)} of {userTotal} users
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    disabled={userPage === 1 || userLoading}
                                    onClick={() => setUserPage(p => p - 1)}
                                    className="px-3 py-1.5 rounded-lg border border-[#E2E5EC] bg-white text-sm font-medium text-[#141821] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F7F8FA]"
                                  >
                                    Previous
                                  </button>
                                  <button
                                    disabled={userPage * userPageSize >= userTotal || userLoading}
                                    onClick={() => setUserPage(p => p + 1)}
                                    className="px-3 py-1.5 rounded-lg border border-[#E2E5EC] bg-white text-sm font-medium text-[#141821] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F7F8FA]"
                                  >
                                    Next
                                  </button>
                                </div>
                              </div>
                            )}

                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ---- PLACEHOLDER TABS ---- */}
                  {seekerSubTab === "tab2" && (
                    <div className="flex flex-col h-full bg-[#F7F8FA]">
                      <div className="p-4 md:p-6 pb-20 overflow-y-auto">
                        <h2 className="text-lg font-bold text-black mb-4">Job Seeker Professions</h2>
                        {professionsLoading ? (
                          <div className="text-center py-10 text-[#9AA1B1] text-sm">Loading professions...</div>
                        ) : professionsData.length === 0 ? (
                          <div className="text-center py-10 text-[#9AA1B1] text-sm">No professions found.</div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {professionsData.map((prof, idx) => (
                              <div key={idx} className="bg-white p-4 rounded-xl border border-[#E2E5EC] shadow-sm flex items-center justify-between">
                                <span className="font-semibold text-[#141821] capitalize truncate mr-2" title={prof.name}>{prof.name}</span>
                                <span className="bg-[#EFF1F5] text-[#141821] text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                                  {prof.count} {prof.count === 1 ? 'person' : 'people'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {seekerSubTab === "tab3" && (
                    <div className="flex flex-col items-center justify-center py-20 text-[#9AA1B1]">
                      <BookOpen size={40} className="mb-3 text-[#E2E5EC]" />
                      <p className="text-base font-semibold">Tab 3</p>
                      <p className="text-sm mt-1">Coming soon</p>
                    </div>
                  )}
                  {seekerSubTab === "tab4" && (
                    <div className="flex flex-col items-center justify-center py-20 text-[#9AA1B1]">
                      <CreditCard size={40} className="mb-3 text-[#E2E5EC]" />
                      <p className="text-base font-semibold">Tab 4</p>
                      <p className="text-sm mt-1">Coming soon</p>
                    </div>
                  )}

                </div>
              </div>
            )}
            {/* Desktop Table View */}
            <div className="hidden md:block w-full">
              <table className="w-full text-left border-collapse min-w-[960px]">
                <thead>
                  <tr className="bg-[#F7F8FA] border-b border-[#E2E5EC]">
                    {activeTab === "employers" && empSubTab === "emp_config" && empConfigSubTab === "view_emp" && (
                      <>
                        <th style={{ padding: "12px 24px", color: "#4C5361", fontSize: 12, textTransform: "uppercase" }}>Business Name</th>
                        <th style={{ padding: "12px 24px", color: "#4C5361", fontSize: 12, textTransform: "uppercase" }}>Telegram ID</th>
                        <th style={{ padding: "12px 24px", color: "#4C5361", fontSize: 12, textTransform: "uppercase" }}>Registered</th>
                        <th style={{ padding: "12px 24px", color: "#4C5361", fontSize: 12, textTransform: "uppercase" }}>Active Jobs</th>
                        <th style={{ padding: "12px 24px", color: "#4C5361", fontSize: 12, textTransform: "uppercase" }}>Subscription</th>
                        <th style={{ padding: "12px 24px", color: "#4C5361", fontSize: 12, textTransform: "uppercase" }}>Post Limit</th>
                        <th style={{ padding: "12px 24px", color: "#4C5361", fontSize: 12, textTransform: "uppercase" }}>Status</th>
                        <th style={{ padding: "12px 24px", color: "#4C5361", fontSize: 12, textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                      </>
                    )}
                    {activeTab === "jobs" && !selectedEmployerId && (
                      <>
                        <th style={{ padding: "12px 24px", color: "#4C5361", fontSize: 12, textTransform: "uppercase" }}>Business Name</th>
                        <th style={{ padding: "12px 24px", color: "#4C5361", fontSize: 12, textTransform: "uppercase" }}>Total Jobs</th>
                        <th style={{ padding: "12px 24px", color: "#4C5361", fontSize: 12, textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                      </>
                    )}
                    {activeTab === "jobs" && selectedEmployerId && (
                      <>
                        <th style={{ padding: "12px 24px", color: "#4C5361", fontSize: 12, textTransform: "uppercase" }}>Job Title</th>
                        <th style={{ padding: "12px 24px", color: "#4C5361", fontSize: 12, textTransform: "uppercase" }}>Status</th>
                        <th style={{ padding: "12px 24px", color: "#4C5361", fontSize: 12, textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                      </>
                    )}

                  </tr>
                </thead>
                <tbody>
                  {activeTab === "employers" && empSubTab === "emp_config" && empConfigSubTab === "view_emp" && empResults.map((item: any) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6", animation: item.id === highlightEmployerId ? "adminEmpRowBlink 0.8s ease-in-out 3" : undefined }}>
                      <td style={{ padding: "16px 24px", fontWeight: 500 }}>
                        {item.business_name}
                      </td>
                      <td style={{ padding: "16px 24px", color: "#4C5361" }}>{item.users?.telegram_id || "—"}</td>
                      <td style={{ padding: "16px 24px", color: "#4C5361" }}>{new Date(item.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: "16px 24px", color: "#141821" }}>{item.activeJobCount ?? 0}</td>
                      <td style={{ padding: "16px 24px" }}>
                        {(() => {
                          const sub = getSubscriptionStatus(item.package_expires_at);
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                              <span style={{ padding: "2px 8px", borderRadius: 100, fontSize: 12, fontWeight: 600, background: sub.bg, color: sub.color }}>
                                {sub.label}
                              </span>
                              {item.renewal_requested && (
                                <span style={{ padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: "#FDF1E7", color: "#B45309" }}>
                                  Renewal Requested
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                          background: (item.daily_post_limit ?? 15) === -1 ? "#EEF3FC" : "#EFF1F5",
                          color: (item.daily_post_limit ?? 15) === -1 ? "#164A9C" : "#141821",
                          border: `1px solid ${(item.daily_post_limit ?? 15) === -1 ? "#ddd6fe" : "#D9E5F8"}`,
                        }}>
                          {getPostLimitLabel(item.daily_post_limit ?? 15)}
                        </span>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                          background: item.status === "approved" ? "#E7F7EE" : item.status === "rejected" ? "#fee2e2" : "#FDF1E7",
                          color: item.status === "approved" ? "#0E8442" : item.status === "rejected" ? "#E5484D" : "#B45309"
                        }}>{item.status}</span>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right", display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                        <button
                          onClick={() => { setEditModal({ id: item.id, name: item.business_name, type: item.business_type || "", postLimit: item.daily_post_limit ?? 15, packageId: item.active_package_id || "", packageExpiresAt: item.package_expires_at || null }); setEditName(item.business_name); setEditType(item.business_type || ""); setEditPostLimit(item.daily_post_limit ?? 15); setEditPackageId(item.active_package_id || ""); setEditLogoFile(null); setEditError(""); setEditPassword(""); setSettingsTab("edit"); }}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#6E7686", padding: "6px", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}
                          title="Employer settings"
                        >
                          <Gear size={16} />
                        </button>
                        <button
                          disabled={!!loading}
                          onClick={() => { setDeleteModal({ id: item.id, name: item.business_name }); setAdminPassword(""); setDeleteError(""); }}
                          style={{ background: "transparent", color: "#E5484D", border: "none", padding: "6px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center" }}
                          title="Delete Employer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {activeTab === "jobs" && !selectedEmployerId && data.employers.filter((emp: any) => (emp.business_name || "").toLowerCase().includes(employerSearch.toLowerCase())).map((emp: any) => {
                    const jobCount = data.jobs.filter((j: any) => j.employer_id === emp.id).length;
                    if (jobCount === 0) return null;
                    return (
                      <tr key={emp.id} onClick={() => setSelectedEmployerId(emp.id)} style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }} className="hover:bg-[#F7F8FA] transition-colors">
                        <td style={{ padding: "16px 24px", fontWeight: 500 }}>{emp.business_name}</td>
                        <td style={{ padding: "16px 24px", color: "#4C5361" }}>{jobCount} Job{jobCount !== 1 && "s"}</td>
                        <td style={{ padding: "16px 24px", textAlign: "right" }}>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedEmployerId(emp.id); }} style={{ background: "#f3f4f6", color: "#141821", border: "1px solid #CBD0DA", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                            View Jobs
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {activeTab === "jobs" && selectedEmployerId && data.jobs.filter((j: any) => j.employer_id === selectedEmployerId).map((item: any) => (
                    <tr key={item.id} onClick={() => setViewingJob(item)} style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }} className="hover:bg-[#F7F8FA] transition-colors">
                      <td style={{ padding: "16px 24px", fontWeight: 500 }}>{item.title}</td>
                      <td style={{ padding: "16px 24px" }}>
                        <JobStatusBadge job={item} />
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right", display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                        <JobActionButtons
                          job={item}
                          loading={!!loading}
                          onApprove={() => handleJobStatus(item.id, "active")}
                          onReject={() => handleJobStatus(item.id, "rejected")}
                          onPause={() => handleJobStatus(item.id, "pending")}
                          onClose={() => handleJobStatus(item.id, "closed")}
                          onApproveScheduled={() => handleApproveScheduled(item.id)}
                          onCancelSchedule={() => handleCancelSchedule(item.id)}
                          onRepost={() => { setRepostModal({ id: item.id, title: item.title }); setRepostDeadline(""); setRepostError(""); }}
                        />
                      </td>
                    </tr>
                  ))}


                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col p-4 bg-[#F7F8FA]/50">
              {activeTab === "employers" && empSubTab === "emp_config" && empConfigSubTab === "view_emp" && empResults.map((item: any) => (
                <div key={item.id} className="bg-white p-4 rounded-xl border border-[#E2E5EC] shadow-sm flex flex-col gap-3 mb-3" style={{ animation: item.id === highlightEmployerId ? "adminEmpRowBlink 0.8s ease-in-out 3" : undefined }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-[#141821] m-0">{item.business_name}</h4>
                      <p className="text-xs text-[#4C5361] m-0 mt-1 font-mono">ID: {item.users?.telegram_id || "—"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span style={{
                        padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 600,
                        background: item.status === "approved" ? "#E7F7EE" : item.status === "rejected" ? "#fee2e2" : "#FDF1E7",
                        color: item.status === "approved" ? "#0E8442" : item.status === "rejected" ? "#E5484D" : "#B45309"
                      }}>{item.status}</span>
                      <span style={{
                        padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 600,
                        background: (item.daily_post_limit ?? 15) === -1 ? "#EEF3FC" : "#EFF1F5",
                        color: (item.daily_post_limit ?? 15) === -1 ? "#164A9C" : "#141821",
                        border: `1px solid ${(item.daily_post_limit ?? 15) === -1 ? "#ddd6fe" : "#D9E5F8"}`,
                      }}>
                        {getPostLimitLabel(item.daily_post_limit ?? 15)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#4C5361] pt-1">
                    <span>Registered {new Date(item.created_at).toLocaleDateString()}</span>
                    <span>{item.activeJobCount ?? 0} Active Job{(item.activeJobCount ?? 0) === 1 ? "" : "s"}</span>
                  </div>
                  {(() => {
                    const sub = getSubscriptionStatus(item.package_expires_at);
                    return (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: sub.bg, color: sub.color }}>
                          {sub.label}
                        </span>
                        {item.renewal_requested && (
                          <span style={{ padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: "#FDF1E7", color: "#B45309" }}>
                            Renewal Requested
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  <div className="flex gap-2 justify-end mt-2 pt-3 border-t border-[#EFF1F5]">
                    <button
                      onClick={() => { setEditModal({ id: item.id, name: item.business_name, type: item.business_type || "", postLimit: item.daily_post_limit ?? 15, packageId: item.active_package_id || "", packageExpiresAt: item.package_expires_at || null }); setEditName(item.business_name); setEditType(item.business_type || ""); setEditPostLimit(item.daily_post_limit ?? 15); setEditPackageId(item.active_package_id || ""); setEditLogoFile(null); setEditError(""); setEditPassword(""); setSettingsTab("edit"); }}
                      className="bg-[#f3f4f6] text-[#343A46] border-none px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                    >
                      <Gear size={14} /> Settings
                    </button>
                    <button
                      disabled={!!loading}
                      onClick={() => { setDeleteModal({ id: item.id, name: item.business_name }); setAdminPassword(""); setDeleteError(""); }}
                      className="bg-transparent text-red-500 p-1.5 cursor-pointer ml-1 flex items-center"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {activeTab === "jobs" && !selectedEmployerId && data.employers.filter((emp: any) => (emp.business_name || "").toLowerCase().includes(employerSearch.toLowerCase())).map((emp: any) => {
                const jobCount = data.jobs.filter((j: any) => j.employer_id === emp.id).length;
                if (jobCount === 0) return null;
                return (
                  <div key={emp.id} onClick={() => setSelectedEmployerId(emp.id)} className="bg-white p-4 rounded-xl border border-[#E2E5EC] shadow-sm flex flex-col gap-3 mb-3 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-[#141821] m-0">{emp.business_name}</h4>
                      <span className="text-xs font-medium text-[#4C5361] bg-[#EFF1F5] border border-[#E2E5EC] px-2 py-1 rounded-md">{jobCount} Job{jobCount !== 1 && "s"}</span>
                    </div>
                    <div className="flex justify-end mt-1">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedEmployerId(emp.id); }} className="bg-[#EFF1F5] text-[#141821] border border-[#E2E5EC] px-3 py-1.5 rounded-lg text-xs font-medium">
                        View Jobs
                      </button>
                    </div>
                  </div>
                );
              })}

              {activeTab === "jobs" && selectedEmployerId && data.jobs.filter((j: any) => j.employer_id === selectedEmployerId).map((item: any) => (
                <div key={item.id} onClick={() => setViewingJob(item)} style={{ cursor: "pointer" }} className="bg-white p-4 rounded-xl border border-[#E2E5EC] shadow-sm flex flex-col gap-3 mb-3 hover:bg-[#F7F8FA] transition-colors">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-[#141821] m-0">{item.title}</h4>
                    <JobStatusBadge job={item} />
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end mt-2 pt-3 border-t border-[#EFF1F5]" onClick={(e) => e.stopPropagation()}>
                    <JobActionButtons
                      job={item}
                      loading={!!loading}
                      onApprove={() => handleJobStatus(item.id, "active")}
                      onReject={() => handleJobStatus(item.id, "rejected")}
                      onPause={() => handleJobStatus(item.id, "pending")}
                      onClose={() => handleJobStatus(item.id, "closed")}
                      onApproveScheduled={() => handleApproveScheduled(item.id)}
                      onCancelSchedule={() => handleCancelSchedule(item.id)}
                      onRepost={() => { setRepostModal({ id: item.id, title: item.title }); setRepostDeadline(""); setRepostError(""); }}
                    />
                  </div>
                </div>
              ))}


            </div>
            
            {activeTab === "employers" && empSubTab === "emp_config" && empConfigSubTab === "view_emp" && !empLoading && empResults.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#4C5361" }}>
                No employers found.
              </div>
            )}

            {activeTab === "employers" && empSubTab === "emp_config" && empConfigSubTab === "view_emp" && empLoading && (
              <div style={{ padding: 40, textAlign: "center", color: "#4C5361" }}>
                Loading employers...
              </div>
            )}

            {activeTab === "employers" && empSubTab === "emp_config" && empConfigSubTab === "view_emp" && empTotal > 0 && (
              <div className="flex justify-between items-center p-4 md:p-6 border-t border-[#EFF1F5] bg-white mt-auto">
                <span className="text-sm text-[#4C5361]">
                  Showing {(empPage - 1) * empPageSize + 1} to {Math.min(empPage * empPageSize, empTotal)} of {empTotal} employers
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={empPage === 1 || empLoading}
                    onClick={() => setEmpPage(p => p - 1)}
                    className="px-3 py-1.5 rounded-lg border border-[#E2E5EC] bg-white text-sm font-medium text-[#141821] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F7F8FA]"
                  >
                    Previous
                  </button>
                  <button
                    disabled={empPage * empPageSize >= empTotal || empLoading}
                    onClick={() => setEmpPage(p => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-[#E2E5EC] bg-white text-sm font-medium text-[#141821] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F7F8FA]"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}


            {activeTab === "configuration" && configSubTab === "content" && (
              <ContentManagementTab initialActiveSubTab={initialUi.contentSubTab} initialVacancyManagementSubTab={initialUi.vacancyMgmtSubTab} />
            )}

            {activeTab === "configuration" && configSubTab === "broadcast" && (
              <BroadcastTab />
            )}

            {activeTab === "configuration" && configSubTab === "activity" && (
              <ActivityLogTab />
            )}
            
            {activeTab === "monetization" && (
              <div className="max-w-4xl mx-auto">
                {/* Sub-tab bar */}
                <div className="flex gap-1 bg-[#F7F8FA] rounded-xl p-1 mb-6 w-fit">
                  {(["monetization", "pricing"] as MonSubTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setMonSubTab(tab)}
                      className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                        monSubTab === tab
                          ? "bg-white text-[#141821] shadow-sm"
                          : "text-[#4C5361] hover:text-[#141821]"
                      }`}
                    >
                      {tab === "monetization" ? "Monetization" : "Pricing"}
                    </button>
                  ))}
                </div>

                {/* Monetization sub-tab */}
                {monSubTab === "monetization" && (
                  <div className="bg-white rounded-xl border border-[#E2E5EC] shadow-sm p-10 text-center flex flex-col items-center">
                    <div className="bg-[#F7F8FA] rounded-full p-4 mb-4">
                      <CreditCard className="w-8 h-8 text-[#9AA1B1]" />
                    </div>
                    <h3 className="text-lg font-bold text-black mb-2">Monetization</h3>
                    <p className="text-sm text-[#4C5361] max-w-sm">
                      Configure revenue streams, commission settings, and payment gateway integrations. Coming soon.
                    </p>
                  </div>
                )}

                {/* Pricing sub-tab */}
                {monSubTab === "pricing" && (
                  <div className="space-y-6">

                    {/* Header */}
                    <div className="bg-white rounded-xl border border-[#E2E5EC] shadow-sm p-6 flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-[#141821] mb-1">Employer Pricing Packages</h3>
                        <p className="text-sm text-[#4C5361]">All prices are in Ethiopian Birr (ETB). No position limitations on any package.</p>
                      </div>
                      <button
                        onClick={handleSavePricing}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${isEditingPricing ? 'bg-[#141821] text-white border-[#141821]' : 'bg-white text-[#141821] border-[#E2E5EC] hover:bg-[#F7F8FA]'}`}
                      >
                        {pricingSaving ? "Saving..." : isEditingPricing ? "Save Changes" : "Edit Pricing"}
                      </button>
                    </div>

                    {/* Package tiers, sourced live from the `packages` table — the same table
                        used to assign a package to an employer and to compute their billing
                        dashboard, so there is exactly one place prices/durations live. */}
                    {([
                      { category: "standard" as const, badge: "15×", title: "Standard Packages", subtitle: "Posted 15 times per day" },
                      { category: "premium" as const, badge: "30×", title: "Premium Memberships", subtitle: "Posted 30 times per day" },
                    ]).map(section => {
                      const rows = packages.filter(p => (p.category || "standard") === section.category);
                      return (
                        <div key={section.category} className="bg-white rounded-xl border border-[#E2E5EC] shadow-sm overflow-hidden">
                          <div className="flex items-center gap-3 px-6 py-4 border-b border-[#EFF1F5] bg-[#F7F8FA]/60">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#141821] text-white text-xs font-black">{section.badge}</div>
                            <div>
                              <p className="text-sm font-bold text-[#141821]">{section.title}</p>
                              <p className="text-xs text-[#4C5361] font-medium">{section.subtitle}</p>
                            </div>
                          </div>
                          <div className="divide-y divide-[#EFF1F5]">
                            {rows.length === 0 && (
                              <div className="px-6 py-5 text-sm text-[#4C5361]">No packages in this category yet.</div>
                            )}
                            {rows.map(pkg => (
                              <div key={pkg.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#F7F8FA] transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-[#141821] flex-shrink-0" />
                                  <span className="text-sm font-semibold text-[#141821]">{pkg.name}</span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF1F5] text-[#343A46] tracking-wide">{pkg.duration_days} Days</span>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                  <span className="text-base font-black text-[#141821]">ETB {Number(pkg.price).toLocaleString("en-US")}</span>
                                  {isEditingPricing && (
                                    <div className="flex items-center gap-1 ml-2">
                                      <button
                                        type="button"
                                        onClick={() => setPackageModal({ id: pkg.id, name: pkg.name, duration_days: String(pkg.duration_days), price: String(pkg.price), category: section.category })}
                                        className="p-1.5 rounded-md hover:bg-[#EFF1F5] text-[#343A46]"
                                        title="Edit package"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => { setDeletePackageError(""); setDeletePackageModal({ id: pkg.id, name: pkg.name }); }}
                                        className="p-1.5 rounded-md hover:bg-[#fee2e2] text-[#E5484D]"
                                        title="Delete package"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          {isEditingPricing && (
                            <button
                              type="button"
                              onClick={() => setPackageModal({ name: "", duration_days: "", price: "", category: section.category })}
                              className="w-full flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#1B5CBF] hover:bg-[#F7F8FA] border-t border-[#EFF1F5]"
                            >
                              <Plus size={15} /> Add Package
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Pin Vacancy */}
                    <div className="bg-white rounded-xl border border-[#E2E5EC] shadow-sm">
                      <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#141821] text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#141821]">Pin Your Vacancy</p>
                            <p className="text-xs text-[#4C5361] font-medium">Per day pinned promotion</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          {isEditingPricing ? (
                            <div className="flex items-center">
                              <span className="text-sm text-[#4C5361] mr-2">ETB</span>
                              <input
                                type="text"
                                value={pricingState.pinVacancy}
                                onChange={(e) => setPricingState({...pricingState, pinVacancy: e.target.value})}
                                className="w-20 px-2 py-1 border border-[#E2E5EC] rounded text-sm text-[#141821] focus:outline-none focus:border-[#1B5CBF]"
                              />
                              <span className="text-sm text-[#4C5361] ml-2">/ day</span>
                            </div>
                          ) : (
                            <span className="text-base font-black text-[#141821]">ETB {pricingState.pinVacancy} / day</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-[#F7F8FA] border border-[#EFF1F5] rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#141821" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                          <div>
                            <p className="text-xs font-bold text-[#141821] mb-1">No Position Limit</p>
                            <p className="text-xs text-[#4C5361] leading-relaxed">Any package allows posting multiple positions. There is no cap on the number of roles per package.</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-[#F7F8FA] border border-[#EFF1F5] rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#141821" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          <div>
                            <p className="text-xs font-bold text-[#141821] mb-1">Consecutive Days Only</p>
                            <p className="text-xs text-[#4C5361] leading-relaxed">Posting days are only consecutive days starting from the package activation date.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div className="bg-white rounded-xl border border-[#E2E5EC] shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#EFF1F5] bg-[#F7F8FA]/60">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#141821" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                        <p className="text-sm font-bold text-[#141821]">Payment Details</p>
                      </div>
                      <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { label: "Company Name", key: "companyName" },
                          { label: "Bank", key: "bankName" },
                          { label: "Account No.", key: "accountNo" },
                        ].map(item => (
                          <div key={item.label}>
                            <p className="text-[10px] font-bold text-[#4C5361] uppercase tracking-wider mb-1">{item.label}</p>
                            {isEditingPricing ? (
                              <input 
                                type="text" 
                                value={pricingState[item.key as keyof typeof pricingState]} 
                                onChange={(e) => setPricingState({...pricingState, [item.key]: e.target.value})}
                                className="w-full px-2 py-1.5 border border-[#E2E5EC] rounded text-sm text-[#141821] font-bold focus:outline-none focus:border-[#1B5CBF]"
                              />
                            ) : (
                              <p className="text-sm font-bold text-[#141821]">{pricingState[item.key as keyof typeof pricingState]}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}
            {activeTab === "reporting" && (
              <ReportingTab />
            )}
            {activeTab === "jobs" && !selectedEmployerId && data.jobs.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#4C5361" }}>
                No jobs found.
              </div>
            )}
            {activeTab === "jobs" && selectedEmployerId && data.jobs.filter((j: any) => j.employer_id === selectedEmployerId).length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#4C5361" }}>
                This employer has no jobs.
              </div>
            )}
          </div>
          </div>
          )}
        </main>
      </div>

      {/* Admin Profile Modal — picture shown on jobs posted from vacancy templates */}
      {profileModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: "0 16px" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 380, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 6px 0", fontSize: 18, fontWeight: 700, color: "#111827" }}>Posting Picture</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "#6E7686", lineHeight: 1.5 }}>
              This is the picture job seekers see on any job posted from a vacancy template — shared
              across all admins, since those posts all go out under one platform identity
              {platformBusinessName ? ` ("${platformBusinessName}")` : ""}.
            </p>

            {profileModalLoading ? (
              <p style={{ fontSize: 13, color: "#9AA1B1", textAlign: "center", padding: "20px 0" }}>Loading…</p>
            ) : (
              <form onSubmit={handleSavePlatformProfile} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                <div style={{ cursor: "pointer" }} onClick={() => platformFileInputRef.current?.click()}>
                  <EmployerAvatar
                    name={platformBusinessName || "Platform"}
                    logoUrl={platformRemoveLogo ? null : (platformLogoPreview || platformLogoUrl)}
                    size={96}
                    radius={20}
                  />
                </div>
                <input ref={platformFileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePlatformFileChange} />
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => platformFileInputRef.current?.click()}
                    style={{ background: "#f3f4f6", color: "#141821", border: "none", padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    Choose Photo
                  </button>
                  {(platformLogoUrl || platformLogoPreview) && !platformRemoveLogo && (
                    <button
                      type="button"
                      onClick={handleRemovePlatformLogo}
                      style={{ background: "none", border: "none", color: "#E5484D", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                    >
                      Remove photo
                    </button>
                  )}
                </div>

                {profileModalError && <p style={{ color: "#E5484D", margin: 0, fontSize: 13, textAlign: "center" }}>{profileModalError}</p>}

                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8, width: "100%" }}>
                  <button
                    type="button"
                    onClick={closeProfileModal}
                    disabled={profileModalSaving}
                    style={{ background: "#f3f4f6", color: "#141821", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileModalSaving}
                    style={{ background: "#111827", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: profileModalSaving ? "not-allowed" : "pointer", opacity: profileModalSaving ? 0.6 : 1 }}
                  >
                    {profileModalSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {platformCropFile && (
        <AvatarCropModal file={platformCropFile} onCancel={() => setPlatformCropFile(null)} onConfirm={handlePlatformCropConfirm} />
      )}

      {editCropFile && (
        <AvatarCropModal file={editCropFile} onCancel={() => setEditCropFile(null)} onConfirm={handleEditLogoCropConfirm} />
      )}

      {/* Delete Employer Modal */}
      {deleteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 400, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700, color: "#111827" }}>Delete Employer</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#4b5563", lineHeight: 1.5 }}>
              Are you sure you want to completely delete <strong>{deleteModal.name}</strong>? This action cannot be undone and will remove all their jobs.
            </p>
            <form onSubmit={handleDeleteEmployer} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#141821", marginBottom: 6 }}>Admin Password Required</label>
                <input 
                  type="password" 
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD0DA", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              {deleteError && <p style={{ color: "#E5484D", margin: 0, fontSize: 13 }}>{deleteError}</p>}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <button 
                  type="button" 
                  onClick={() => setDeleteModal(null)}
                  disabled={deleteLoading}
                  style={{ background: "#f3f4f6", color: "#141821", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={deleteLoading || !adminPassword}
                  style={{ background: "#E5484D", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: (deleteLoading || !adminPassword) ? "not-allowed" : "pointer", opacity: (deleteLoading || !adminPassword) ? 0.5 : 1, display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Trash2 size={16} />
                  {deleteLoading ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT PACKAGE MODAL */}
      {packageModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: "0 16px" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 400, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700, color: "#111827" }}>{packageModal.id ? "Edit Package" : "Add Package"}</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleSavePackage(); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#141821", marginBottom: 6 }}>Package Name</label>
                <input
                  type="text"
                  required
                  value={packageModal.name}
                  onChange={(e) => setPackageModal({ ...packageModal, name: e.target.value })}
                  placeholder="e.g. Ten Days Package"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD0DA", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#141821", marginBottom: 6 }}>Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={packageModal.duration_days}
                    onChange={(e) => setPackageModal({ ...packageModal, duration_days: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD0DA", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#141821", marginBottom: 6 }}>Price (ETB)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={packageModal.price}
                    onChange={(e) => setPackageModal({ ...packageModal, price: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD0DA", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#141821", marginBottom: 6 }}>Category</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["standard", "premium"] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPackageModal({ ...packageModal, category: cat })}
                      style={{
                        flex: 1, padding: "10px 6px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                        border: packageModal.category === cat ? "2px solid #141821" : "1px solid #CBD0DA",
                        background: packageModal.category === cat ? "#141821" : "#fff",
                        color: packageModal.category === cat ? "#fff" : "#141821",
                      }}
                    >
                      {cat === "standard" ? "Standard (15×/day)" : "Premium (30×/day)"}
                    </button>
                  ))}
                </div>
              </div>
              {packageModalError && <p style={{ color: "#E5484D", margin: 0, fontSize: 13 }}>{packageModalError}</p>}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setPackageModal(null)}
                  disabled={packageModalSaving}
                  style={{ background: "#f3f4f6", color: "#141821", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={packageModalSaving}
                  style={{ background: "#1B5CBF", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: packageModalSaving ? "wait" : "pointer", opacity: packageModalSaving ? 0.7 : 1 }}
                >
                  {packageModalSaving ? "Saving..." : packageModal.id ? "Save Changes" : "Add Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE PACKAGE MODAL */}
      {deletePackageModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: "0 16px" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 400, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700, color: "#111827" }}>Delete Package</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#4b5563", lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>{deletePackageModal.name}</strong>? This cannot be undone.
            </p>
            {deletePackageError && <p style={{ color: "#E5484D", margin: "0 0 16px 0", fontSize: 13 }}>{deletePackageError}</p>}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setDeletePackageModal(null)}
                disabled={deletePackageLoading}
                style={{ background: "#f3f4f6", color: "#141821", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePackage}
                disabled={deletePackageLoading}
                style={{ background: "#E5484D", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: deletePackageLoading ? "not-allowed" : "pointer", opacity: deletePackageLoading ? 0.5 : 1, display: "flex", alignItems: "center", gap: 8 }}
              >
                <Trash2 size={16} />
                {deletePackageLoading ? "Deleting..." : "Delete Package"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE SPECIAL REQUEST MODAL */}
      {approveReqModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => { setApproveReqModal(null); setUserActionError(""); setUserActionPassword(""); }} />
          <div style={{ position: "relative", width: "100%", maxWidth: 400, background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 700, color: "#111827" }}>Approve Request</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#4b5563" }}>
              Convert this ex-employer to a Job Seeker? Please enter the admin password to confirm.
            </p>

            <form onSubmit={handleApproveSpecialRequest} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 500, color: "#141821" }}>Admin Password</label>
                <input type="password" required value={userActionPassword} onChange={(e: any) => setUserActionPassword(e.target.value)} placeholder="••••••••" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD0DA", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              {userActionError && <p style={{ margin: 0, fontSize: 13, color: "#E5484D" }}>{userActionError}</p>}
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <button type="button" onClick={() => { setApproveReqModal(null); setUserActionError(""); setUserActionPassword(""); }} style={{ flex: 1, padding: "10px", background: "#f3f4f6", border: "none", borderRadius: 10, color: "#141821", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={userActionLoading} style={{ flex: 1, padding: "10px", background: "#12A150", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: userActionLoading ? "wait" : "pointer", opacity: userActionLoading ? 0.7 : 1 }}>
                  {userActionLoading ? "Approving..." : "Approve"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employer Settings Modal */}
      {editModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: "0 16px" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <Gear size={22} color="#111827" />
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#111827" }}>Employer Settings</h3>
            </div>
            <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#4C5361" }}>{editModal.name}</p>

            <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #E2E5EC", marginBottom: 24 }}>
              <button
                type="button"
                onClick={() => setSettingsTab("edit")}
                style={{
                  padding: "12px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer",
                  background: "transparent", border: "none",
                  color: settingsTab === "edit" ? "#111827" : "#9AA1B1",
                  borderBottom: settingsTab === "edit" ? "3px solid #111827" : "3px solid transparent",
                  marginBottom: -1,
                }}
              >
                Edit Employer
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab("publishing")}
                style={{
                  padding: "12px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer",
                  background: "transparent", border: "none",
                  color: settingsTab === "publishing" ? "#111827" : "#9AA1B1",
                  borderBottom: settingsTab === "publishing" ? "3px solid #111827" : "3px solid transparent",
                  marginBottom: -1,
                }}
              >
                Auto-Publish
              </button>
            </div>
            {settingsTab === "edit" && (
              <>
                <p style={{ margin: "-12px 0 20px 0", fontSize: 13, color: "#4C5361" }}>Update business details and daily job post limit.</p>
                <form onSubmit={handleEditEmployer} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#141821", marginBottom: 6 }}>Business Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      required
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD0DA", fontSize: 14, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#141821", marginBottom: 6 }}>Business Type</label>
                    <BusinessTypeSelect
                      value={editType}
                      onChange={setEditType}
                      businessTypes={businessTypes}
                      onAddType={(name) => {
                        setBusinessTypes(prev => prev.some(t => t.name.toLowerCase() === name.toLowerCase()) ? prev : [...prev, { id: `pending-${name}`, name }]);
                        setEditType(name);
                      }}
                    />
                  </div>

                  {/* Logo Upload */}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#141821", marginBottom: 6 }}>Business Profile Photo (Logo)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        if (!file.type.startsWith("image/")) { setEditError("Please choose an image file."); return; }
                        if (file.size > 5 * 1024 * 1024) { setEditError("Image must be smaller than 5MB."); return; }
                        setEditError("");
                        setEditCropFile(file);
                      }}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px dashed #CBD0DA", fontSize: 13, boxSizing: "border-box", background: "#F7F8FA" }}
                    />
                    {editLogoFile && <p style={{ fontSize: 12, color: "#12A150", marginTop: 4 }}>New photo selected and cropped.</p>}
                  </div>

                  {/* Subscription Package */}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#141821", marginBottom: 6 }}>Subscription Package</label>
                    <select
                      value={editPackageId}
                      onChange={e => setEditPackageId(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD0DA", fontSize: 14, boxSizing: "border-box" }}
                    >
                      <option value="" disabled>Select a package</option>
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} — {pkg.duration_days} Days ({Number(pkg.price).toLocaleString("en-US")} ETB)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Renew Subscription */}
                  {(() => {
                    const sub = getSubscriptionStatus(editModal.packageExpiresAt);
                    return (
                      <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #E2E5EC", background: "#F7F8FA", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: sub.expired ? "#E5484D" : "#141821" }}>
                            {editModal.packageExpiresAt
                              ? (sub.expired ? "Subscription expired" : `Expires ${new Date(editModal.packageExpiresAt).toLocaleDateString()} (${sub.label})`)
                              : "No expiry on record"}
                          </div>
                          <div style={{ fontSize: 12, color: "#4C5361", marginTop: 2 }}>
                            {sub.canRenew ? "Starts a fresh billing cycle from today, using the selected package above." : "Renew becomes available within 24 hours of expiry."}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRenewSubscription}
                          disabled={!sub.canRenew || renewLoading || editLoading || !editPackageId || !editPassword}
                          title={!editPassword ? "Enter the admin password to renew" : undefined}
                          style={{
                            background: "#12A150", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8,
                            fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                            cursor: (!sub.canRenew || renewLoading || editLoading || !editPackageId || !editPassword) ? "not-allowed" : "pointer",
                            opacity: (!sub.canRenew || renewLoading || editLoading || !editPackageId || !editPassword) ? 0.5 : 1,
                          }}
                        >
                          {renewLoading ? "Renewing..." : "Renew Subscription"}
                        </button>
                      </div>
                    );
                  })()}

                  {/* Daily Post Limit */}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#141821", marginBottom: 8 }}>Daily Job Post Limit</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {POST_LIMIT_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setEditPostLimit(opt.value)}
                          style={{
                            flex: 1,
                            padding: "10px 6px",
                            borderRadius: 8,
                            border: editPostLimit === opt.value ? "2px solid #141821" : "1px solid #CBD0DA",
                            background: editPostLimit === opt.value ? "#EFF1F5" : "#F7F8FA",
                            cursor: "pointer",
                            textAlign: "center",
                            transition: "all 0.15s",
                          }}
                        >
                          <div style={{ fontSize: 15, fontWeight: 700, color: editPostLimit === opt.value ? "#141821" : "#343A46" }}>{opt.label}</div>
                          <div style={{ fontSize: 11, color: editPostLimit === opt.value ? "#141821" : "#9AA1B1", marginTop: 2 }}>{opt.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Super Admin Password */}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#141821", marginBottom: 6 }}>Admin Password Required</label>
                    <input
                      type="password"
                      value={editPassword}
                      onChange={e => setEditPassword(e.target.value)}
                      placeholder="Enter admin password"
                      required
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD0DA", fontSize: 14, boxSizing: "border-box" }}
                    />
                  </div>

                  {editError && <p style={{ color: "#E5484D", margin: 0, fontSize: 13 }}>{editError}</p>}
                  <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => setEditModal(null)}
                      disabled={editLoading}
                      style={{ background: "#f3f4f6", color: "#141821", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editLoading || !editName.trim() || !editPackageId || !editPassword}
                      style={{ background: "#141821", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <Pencil size={14} />
                      {editLoading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </>
            )}

            {settingsTab === "publishing" && (() => {
              const currentEmployer = data.employers.find((emp: any) => emp.id === editModal.id);
              const isAutoPublish = !!currentEmployer?.auto_publish;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#4C5361", lineHeight: 1.5 }}>
                    By default, an employer's job posts go through moderation review before going live.
                    Turn this on for trusted employers so their posts publish instantly instead, skipping review.
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderRadius: 12, border: "1px solid #E2E5EC", background: "#F7F8FA" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Post without review</div>
                      <div style={{ fontSize: 12, color: "#4C5361", marginTop: 2 }}>
                        {isAutoPublish ? "New job posts go live instantly." : "New job posts require admin review."}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleAutoPublish}
                      disabled={autoPublishSaving}
                      style={{
                        width: 48, height: 28, borderRadius: 999, border: "none", cursor: autoPublishSaving ? "default" : "pointer",
                        background: isAutoPublish ? "#12A150" : "#CBD0DA",
                        position: "relative", padding: 0, flexShrink: 0, opacity: autoPublishSaving ? 0.6 : 1,
                        transition: "background 0.15s",
                      }}
                      title={isAutoPublish ? "Turn off auto-publish" : "Turn on auto-publish"}
                    >
                      <span style={{
                        position: "absolute", top: 3, left: isAutoPublish ? 23 : 3,
                        width: 22, height: 22, borderRadius: "50%", background: "#fff",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.15s",
                      }} />
                    </button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => setEditModal(null)}
                      style={{ background: "#f3f4f6", color: "#141821", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteUserModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 400, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700, color: "#111827" }}>Delete User</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#4b5563", lineHeight: 1.5 }}>
              Are you sure you want to completely delete <strong>{deleteUserModal.name}</strong>? This action cannot be undone and will remove all their data including CV and applications.
            </p>
            <form onSubmit={handleDeleteUser} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#141821", marginBottom: 6 }}>Admin Password Required</label>
                <input 
                  type="password" 
                  value={userActionPassword}
                  onChange={(e) => setUserActionPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD0DA", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              {userActionError && <p style={{ color: "#E5484D", margin: 0, fontSize: 13 }}>{userActionError}</p>}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <button 
                  type="button" 
                  onClick={() => setDeleteUserModal(null)}
                  disabled={userActionLoading}
                  style={{ background: "#f3f4f6", color: "#141821", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={userActionLoading || !userActionPassword}
                  style={{ background: "#E5484D", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: (userActionLoading || !userActionPassword) ? "not-allowed" : "pointer", opacity: (userActionLoading || !userActionPassword) ? 0.5 : 1, display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Trash2 size={16} />
                  {userActionLoading ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Sub Admin Modal */}
      {deleteSubAdminModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 400, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700, color: "#111827" }}>Delete Admin</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#4b5563", lineHeight: 1.5 }}>
              Are you sure you want to delete admin <strong>{deleteSubAdminModal.username}</strong>? This action cannot be undone.
            </p>
            <form onSubmit={handleDeleteSubAdmin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#141821", marginBottom: 6 }}>Admin Password Required</label>
                <input 
                  type="password" 
                  value={userActionPassword}
                  onChange={(e) => setUserActionPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD0DA", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              {userActionError && <p style={{ color: "#E5484D", margin: 0, fontSize: 13 }}>{userActionError}</p>}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <button 
                  type="button" 
                  onClick={() => setDeleteSubAdminModal(null)}
                  disabled={userActionLoading}
                  style={{ background: "#f3f4f6", color: "#141821", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={userActionLoading || !userActionPassword}
                  style={{ background: "#E5484D", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: (userActionLoading || !userActionPassword) ? "not-allowed" : "pointer", opacity: (userActionLoading || !userActionPassword) ? 0.5 : 1, display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Trash2 size={16} />
                  {userActionLoading ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ban User Modal */}
      {banUserModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 400, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700, color: "#111827" }}>{banUserModal.is_banned ? "Unban" : "Ban"} User</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#4b5563", lineHeight: 1.5 }}>
              Are you sure you want to {banUserModal.is_banned ? "unban" : "ban"} <strong>{banUserModal.name}</strong>?
            </p>
            <form onSubmit={handleToggleBan} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#141821", marginBottom: 6 }}>Admin Password Required</label>
                <input 
                  type="password" 
                  value={userActionPassword}
                  onChange={(e) => setUserActionPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD0DA", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              {userActionError && <p style={{ color: "#E5484D", margin: 0, fontSize: 13 }}>{userActionError}</p>}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <button 
                  type="button" 
                  onClick={() => setBanUserModal(null)}
                  disabled={userActionLoading}
                  style={{ background: "#f3f4f6", color: "#141821", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={userActionLoading || !userActionPassword}
                  style={{ background: banUserModal.is_banned ? "#12A150" : "#E5484D", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: (userActionLoading || !userActionPassword) ? "not-allowed" : "pointer", opacity: (userActionLoading || !userActionPassword) ? 0.5 : 1, display: "flex", alignItems: "center", gap: 8 }}
                >
                  {userActionLoading ? "Saving..." : banUserModal.is_banned ? "Unban User" : "Ban User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* View Job Details Modal */}
      {viewingJob && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: "0 16px" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <JobStatusBadge job={viewingJob} />
                <h3 style={{ margin: "8px 0 2px 0", fontSize: 20, fontWeight: 800, color: "#111827" }}>{viewingJob.title}</h3>
                <p style={{ margin: 0, fontSize: 13, color: "#141821", fontWeight: 600 }}>
                  {Array.isArray(viewingJob.employers) ? viewingJob.employers[0]?.business_name : viewingJob.employers?.business_name || "Employer"}
                </p>
              </div>
              <button
                onClick={() => setViewingJob(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9AA1B1", fontWeight: "bold" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 14, color: "#141821" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "#F7F8FA", padding: 12, borderRadius: 8 }}>
                <div>
                  <span style={{ fontSize: 11, color: "#9AA1B1", textTransform: "uppercase", fontWeight: 600 }}>Category</span>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{viewingJob.category}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#9AA1B1", textTransform: "uppercase", fontWeight: 600 }}>Job Type</span>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{viewingJob.job_type || "—"}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#9AA1B1", textTransform: "uppercase", fontWeight: 600 }}>Location</span>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{viewingJob.neighborhood || viewingJob.location}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#9AA1B1", textTransform: "uppercase", fontWeight: 600 }}>Salary</span>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>
                    {/* -1 negotiable, -2 company scale, per resolveSalary(). Swapped. */}
                    {viewingJob.salary_min === -1
                      ? "Negotiable"
                      : viewingJob.salary_min === -2
                      ? "Per Company Scale"
                      : viewingJob.salary_min === viewingJob.salary_max
                      ? `${viewingJob.salary_min.toLocaleString()} ${viewingJob.currency || "ETB"}`
                      : `${viewingJob.salary_min.toLocaleString()} - ${viewingJob.salary_max.toLocaleString()} ${viewingJob.currency || "ETB"}`}
                  </div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: "#9AA1B1", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 4 }}>Required Experience</span>
                {/* Experience moved to jobs.min_years_experience; requirements
                    .experience is the abandoned jsonb field and is unset on
                    everything posted since. Reading it meant every recent job
                    displayed the "Entry Level" fallback whatever the employer
                    asked for. Legacy rows that still carry a label are shown
                    as written rather than guessed at. */}
                <span style={{ background: "#EFF1F5", color: "#164A9C", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                  {viewingJob.min_years_experience != null
                    ? viewingJob.min_years_experience <= 0
                      ? "No experience required"
                      : `${viewingJob.min_years_experience}+ years`
                    : viewingJob.requirements?.experience || "Not specified"}
                </span>
              </div>

              {/* Absent, not "Any", when the employer set no restriction --
                  matching every other surface. A moderator reviewing a pending
                  job needs to see a gender requirement that IS there; inventing
                  a row for one that is not would make an open job look screened. */}
              {(viewingJob.gender_preference === "male" || viewingJob.gender_preference === "female") && (
                <div>
                  <span style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 4 }}>Gender</span>
                  <span style={{ background: "#f1f5f9", color: "#1e40af", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                    {viewingJob.gender_preference === "female" ? "Female only" : "Male only"}
                  </span>
                </div>
              )}

              <div>
                <span style={{ fontSize: 11, color: "#9AA1B1", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 4 }}>Job Description</span>
                <div style={{ background: "#F7F8FA", padding: 12, borderRadius: 8, whiteSpace: "pre-wrap", lineHeight: 1.5, fontSize: 13, border: "1px solid #E2E5EC" }}>
                  {viewingJob.description || viewingJob.full_description}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={{ fontSize: 11, color: "#9AA1B1", textTransform: "uppercase", fontWeight: 600 }}>Deadline</span>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{new Date(viewingJob.deadline).toLocaleDateString()}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#9AA1B1", textTransform: "uppercase", fontWeight: 600 }}>Posted</span>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>
                    {viewingJob.created_at ? new Date(viewingJob.created_at).toLocaleDateString() : "—"}
                    {viewingJob.last_posted_at && new Date(viewingJob.last_posted_at).getTime() - new Date(viewingJob.created_at).getTime() > 60000 && (
                      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#12A150", marginTop: 2 }}>
                        Reposted {new Date(viewingJob.last_posted_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end", marginTop: 24, borderTop: "1px solid #E2E5EC", paddingTop: 16 }}>
              <JobActionButtons
                job={viewingJob}
                loading={!!loading}
                size="md"
                onApprove={() => handleJobStatus(viewingJob.id, "active")}
                onReject={() => handleJobStatus(viewingJob.id, "rejected")}
                onPause={() => handleJobStatus(viewingJob.id, "pending")}
                onClose={() => handleJobStatus(viewingJob.id, "closed")}
                onApproveScheduled={() => handleApproveScheduled(viewingJob.id)}
                onCancelSchedule={() => handleCancelSchedule(viewingJob.id)}
                onRepost={() => { setRepostModal({ id: viewingJob.id, title: viewingJob.title }); setRepostDeadline(""); setRepostError(""); }}
              />

              <button
                type="button"
                onClick={() => setViewingJob(null)}
                style={{ background: "#f3f4f6", color: "#141821", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repost Job Modal */}
      {repostModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: "0 16px" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 400, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 700, color: "#111827" }}>Repost Job</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#4b5563", lineHeight: 1.5 }}>
              Repost <strong>{repostModal.title}</strong> as a new, active listing with a fresh deadline.
            </p>
            <form onSubmit={handleRepostConfirm} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#141821", marginBottom: 6 }}>New Deadline</label>
                <input
                  type="date"
                  value={repostDeadline}
                  onChange={(e) => setRepostDeadline(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD0DA", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              {repostError && <p style={{ color: "#E5484D", margin: 0, fontSize: 13 }}>{repostError}</p>}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setRepostModal(null)}
                  disabled={repostLoading}
                  style={{ background: "#f3f4f6", color: "#141821", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={repostLoading || !repostDeadline}
                  style={{ background: "#141821", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: (repostLoading || !repostDeadline) ? "not-allowed" : "pointer", opacity: (repostLoading || !repostDeadline) ? 0.5 : 1 }}
                >
                  {repostLoading ? "Reposting..." : "Repost Job"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Authorization Number Success Modal */}
      {authNumberResult && (
        <div style={{ position: "fixed", inset: 0, backdropFilter: "blur(4px)", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: "0 16px" }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 360, border: "1px solid #E2E5EC", overflow: "hidden" }}>
            <div style={{ padding: "24px 26px 18px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#12A150", background: "#E7F7EE", border: "1px solid #E7F7EE", padding: "3px 9px", borderRadius: 20, marginBottom: 10 }}>
                <Check size={11} strokeWidth={3} /> Registered
              </span>
              <p style={{ margin: "0 0 4px 0", fontSize: 17, fontWeight: 700, color: "#111827" }}>{authNumberResult.name}</p>
              <p style={{ margin: 0, fontSize: 12.5, color: "#6E7686" }}>Employer account created &mdash; hand off the code below.</p>
            </div>

            <div
              style={{
                borderTop: "1.5px dashed #E2E5EC",
                padding: "20px 26px 16px",
                textAlign: "center",
                position: "relative",
                backgroundColor: copied ? "#E7F7EE" : "#fff",
                transition: copied ? "background-color 0.05s ease" : "background-color 0.5s ease",
              }}
            >
              <p style={{ margin: "0 0 8px 0", fontSize: 11, color: "#6E7686", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Authorization Code</p>
              <div style={{ fontSize: 34, fontWeight: 800, color: "#111827", letterSpacing: "0.16em", fontFamily: "monospace" }}>{authNumberResult.number}</div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(authNumberResult.number);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                }}
                aria-label="Copy code"
                style={{ position: "absolute", top: 16, right: 20, width: 32, height: 32, borderRadius: 8, border: copied ? "1px solid #D9E5F8" : "1px solid #E2E5EC", background: copied ? "#EEF3FC" : "#fff", color: "#6E7686", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: copied ? 0 : 1, transition: "opacity 0.12s linear" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </span>
                <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: copied ? 1 : 0, transition: "opacity 0.12s linear", color: "#12A150" }}>
                  <Check size={14} />
                </span>
              </button>
            </div>

            <div style={{ padding: "12px 26px 22px", textAlign: "center" }}>
              <p style={{ margin: "0 0 14px 0", fontSize: 11.5, color: "#6E7686", lineHeight: 1.4 }}>Shown once &mdash; save or send it to the employer immediately.</p>
              <button
                onClick={() => setAuthNumberResult(null)}
                style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: "#111827", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Floating Window */}
      {settingsOpen && (
        <FloatingWindow title="Admin Settings" onClose={() => setSettingsOpen(false)}>
          <div style={{ padding: "24px 28px", overflowY: "auto", height: "100%", boxSizing: "border-box" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, paddingBottom: 18, borderBottom: "1px solid #f0f0f0" }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, #141821, #343A46)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Users style={{ width: 22, height: 22, color: "#fff" }} />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: 0 }}>Admin User Management</h3>
                <p style={{ fontSize: 13, color: "#4C5361", margin: 0, marginTop: 2 }}>Create sub-admins and control their permissions</p>
              </div>
              {isSuperAdmin && (
                <button
                  onClick={() => { setShowSubAdminForm(!showSubAdminForm); setSubAdminError(""); setSubAdminSuccess(""); }}
                  style={{ marginLeft: "auto", padding: "8px 14px", borderRadius: 8, border: "none", background: showSubAdminForm ? "#EFF1F5" : "#141821", color: showSubAdminForm ? "#343A46" : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
                >
                  {showSubAdminForm ? (
                    <><X style={{ width: 14, height: 14 }} /> Cancel</>
                  ) : (
                    <><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Admin</>
                  )}
                </button>
              )}
            </div>

            {/* Create sub-admin form */}
            {isSuperAdmin && showSubAdminForm && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSubAdminError(""); setSubAdminSuccess("");
                  if (!newSubUsername.trim() || !newSubPassword.trim()) { setSubAdminError("Both fields are required."); return; }
                  setSubAdminLoading(true);
                  const result = await createSubAdmin(newSubUsername.trim(), newSubPassword.trim());
                  setSubAdminLoading(false);
                  if (result.success && result.subAdmin) {
                    setSubAdmins((prev) => [...prev, { ...result.subAdmin!, password: "***" }]);
                    setNewSubUsername(""); setNewSubPassword("");
                    setSubAdminSuccess(`Admin "${result.subAdmin.username}" created! Set their permissions below.`);
                    setShowSubAdminForm(false);
                  } else {
                    setSubAdminError(result.error || "Failed to create admin.");
                  }
                }}
                style={{ background: "#F7F8FA", border: "1px solid #E2E5EC", borderRadius: 14, padding: 20, marginBottom: 20 }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, color: "#343A46", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>New Admin Details</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6E7686", marginBottom: 6 }}>Username</label>
                    <CustomInput type="text" placeholder="e.g. john_admin" value={newSubUsername} onChange={(e: any) => setNewSubUsername(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6E7686", marginBottom: 6 }}>Password</label>
                    <CustomInput type="password" placeholder="Set a password" value={newSubPassword} onChange={(e: any) => setNewSubPassword(e.target.value)} />
                  </div>
                </div>
                {subAdminError && <div style={{ padding: "8px 12px", background: "#FDECEC", color: "#E5484D", fontSize: 13, borderRadius: 8, marginBottom: 12, border: "1px solid #fecaca" }}>{subAdminError}</div>}
                <button type="submit" disabled={subAdminLoading} style={{ width: "100%", padding: "11px", borderRadius: 10, border: "none", background: "#1B5CBF", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: subAdminLoading ? 0.7 : 1 }}>
                  {subAdminLoading ? "Creating..." : "Create Admin"}
                </button>
              </form>
            )}

            {subAdminSuccess && (
              <div style={{ padding: "10px 14px", background: "#EEF3FC", color: "#164A9C", fontSize: 13, borderRadius: 10, marginBottom: 16, border: "1px solid #D9E5F8", fontWeight: 600 }}>
                ✓ {subAdminSuccess}
              </div>
            )}

            {/* Sub-admin list */}
            {subAdmins.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#9AA1B1" }}>
                <Users style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.4 }} />
                <p style={{ fontSize: 14, fontWeight: 500 }}>No sub-admins yet</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Click "New Admin" to create one</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {subAdmins.map((admin) => {
                  const PERMS: { key: keyof AdminPermissions; label: string; desc: string }[] = [
                    { key: "manageEmployers", label: "Manage Employers", desc: "Edit and delete employers" },
                    { key: "manageJobs", label: "Manage Jobs", desc: "Moderate job postings" },
                    { key: "manageUsers", label: "Manage Users", desc: "Ban and delete job seekers" },
                    { key: "manageConfiguration", label: "Manage Configuration", desc: "Edit FAQs, pricing, templates" },
                    { key: "manageReports", label: "View Reports & Analytics", desc: "Access vacancy, growth, and package reports" },
                  ];
                  return (
                    <div key={admin.id} style={{ background: "#fff", border: "1px solid #E2E5EC", borderRadius: 14, overflow: "hidden" }}>
                      {/* Admin card header */}
                      <div
                        onClick={() => setExpandedSubAdmins(prev => ({ ...prev, [admin.id]: !prev[admin.id] }))}
                        style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, borderBottom: expandedSubAdmins[admin.id] ? "1px solid #EFF1F5" : "none", cursor: "pointer" }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #1B5CBF, #4A80D3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{admin.username[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>{admin.username}</p>
                          <p style={{ fontSize: 11, color: "#9AA1B1", margin: 0, marginTop: 1 }}>Sub Admin · Created {new Date(admin.createdAt).toLocaleDateString()}</p>
                        </div>
                        {isSuperAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteSubAdminModal({ id: admin.id, username: admin.username });
                              setUserActionPassword("");
                              setUserActionError("");
                            }}
                            style={{ marginLeft: "auto", padding: "6px 10px", borderRadius: 8, border: "1px solid #fecaca", background: "#FDECEC", color: "#E5484D", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {/* Permissions toggles */}
                      {expandedSubAdmins[admin.id] && (
                        <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 0 }}>
                          {PERMS.map((p, idx) => (
                            <div key={p.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: idx < PERMS.length - 1 ? "1px solid #F7F8FA" : "none" }}>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: "#343A46", margin: 0 }}>{p.label}</p>
                                <p style={{ fontSize: 11, color: "#9AA1B1", margin: 0, marginTop: 2 }}>{p.desc}</p>
                              </div>
                              {/* Toggle switch */}
                              <button
                                onClick={async () => {
                                  if (!isSuperAdmin) return;
                                  const updatedPerms = { ...admin.permissions, [p.key]: !admin.permissions[p.key] };
                                  const res = await updateSubAdminPermissions(admin.id, updatedPerms);
                                  if (res.success) {
                                    setSubAdmins((prev) => prev.map((a) => a.id === admin.id ? { ...a, permissions: updatedPerms } : a));
                                  }
                                }}
                                disabled={!isSuperAdmin}
                                style={{
                                  width: 44, height: 24, borderRadius: 12, border: "none", cursor: isSuperAdmin ? "pointer" : "default",
                                  background: admin.permissions[p.key] ? "#1B5CBF" : "#CBD0DA",
                                  position: "relative", transition: "background 0.2s", flexShrink: 0
                                }}
                              >
                                <span style={{
                                  position: "absolute", top: 2, left: admin.permissions[p.key] ? 22 : 2,
                                  width: 20, height: 20, borderRadius: "50%", background: "#fff",
                                  transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)"
                                }} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </FloatingWindow>
      )}
    </div>
  );
}

