"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { approveEmployer, rejectEmployer, toggleUserBan, toggleJobStatus, scheduleJobPost, repostJob, logoutAdmin, addEmployer, deleteEmployer, updateEmployer, adminUpdateEmployerLogo, deleteUser, approveSpecialRequest, getPricingConfig, updatePricingConfig, getLoggedInAdmin, createSubAdmin, updateSubAdminPermissions, deleteSubAdmin, listSubAdmins, searchUsers, getProfessionCounts, searchEmployers, getPackages } from "./actions";
import type { AdminPermissions, SubAdmin } from "./actions";
import { Trash2, Pencil, Image as ImageIcon, Menu, X, LayoutDashboard, Briefcase, FileText, Users, LogOut, Settings, CreditCard, CheckCircle, BookOpen, User, Building2, Hourglass, ChevronDown, Check, Megaphone, History, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import ContentManagementTab from "./ContentManagementTab";
import BroadcastTab from "./BroadcastTab";
import ActivityLogTab from "./ActivityLogTab";
import ReportingTab from "./ReportingTab";

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
        <div style={{ flex: 1, overflow: "auto", background: "#f9fafb" }}>
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
      className={`w-full px-4 py-3 bg-[#f2f2f7]/50 hover:bg-white border border-[#c6c6c8] rounded-xl text-sm text-black focus:outline-none focus:ring-4 focus:ring-[#007aff]/20 focus:border-[#007aff] transition-all placeholder-[#aeaeb2] font-medium ${props.className || ""}`}
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
        className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-[#f2f2f7]/50 hover:bg-white border border-[#c6c6c8] rounded-xl text-xs sm:text-sm text-black focus:outline-none focus:ring-4 focus:ring-[#007aff]/20 focus:border-[#007aff] transition-all flex items-center justify-between text-left font-medium"
      >
        <span className={`${selected ? "text-black" : "text-[#aeaeb2]"} truncate mr-1.5`}>{selected ? selected.label : placeholder}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-[#aeaeb2] flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); setSearch(""); }} />
          <div className="absolute z-50 w-full mt-2 bg-white border border-[#c6c6c8] rounded-xl shadow-xl top-full overflow-hidden">
            {searchable && (
              <div className="p-2 border-b border-[#e5e5ea]">
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#aeaeb2] pointer-events-none"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  <input
                    autoFocus
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search employer..."
                    onClick={e => e.stopPropagation()}
                    className="w-full pl-7 pr-3 py-1.5 text-xs bg-[#f2f2f7] border border-[#e5e5ea] rounded-lg text-black placeholder-[#aeaeb2] font-medium focus:outline-none focus:ring-2 focus:ring-[#007aff]/20 focus:border-[#007aff] transition-all"
                  />
                </div>
              </div>
            )}
            <div className="max-h-52 overflow-y-auto py-1">
              {displayedOptions.length === 0 ? (
                <p className="px-4 py-3 text-xs text-[#aeaeb2] font-medium">No employers found</p>
              ) : displayedOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`w-full text-left px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm hover:bg-[#f2f2f7] transition-colors flex items-center justify-between ${String(value) === String(opt.value) ? "text-[#1c1c1e] bg-[#f1f5f9]" : "text-[#1c1c1e]"}`}
                  onClick={() => {
                    onChange(String(opt.value));
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  <span className={`${String(value) === String(opt.value) ? "font-bold" : "font-medium"} truncate mr-2`}>{opt.label}</span>
                  {String(value) === String(opt.value) && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#1c1c1e] flex-shrink-0"><path d="M20 6 9 17l-5-5"/></svg>
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
          background: "#f8fafc", border: isOpen ? "1.5px solid #007aff" : "1.5px solid #e2e8f0", cursor: "pointer",
          borderRadius: 10, outline: "none", boxShadow: isOpen ? "0 0 0 3px rgba(0,122,255,0.12)" : "none", transition: "border-color 0.2s, box-shadow 0.2s"
        }}
      >
        <span style={{ color: selectedPkg ? "#1c1c1e" : "#8e8e93", fontSize: 14, fontWeight: 500 }}>
          {selectedPkg ? selectedPkg.name : "No Package (Free / Manual Later)"}
        </span>
        <ChevronDown size={16} color="#8e8e93" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
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
              background: "#ffffff", borderRadius: 12, border: "1px solid #e5e5ea",
              boxShadow: "0 10px 25px rgba(0,0,0,0.08)", overflow: "hidden"
            }}
          >
            <div style={{ maxHeight: 240, overflowY: "auto", padding: 6 }}>
              <button
                type="button"
                onClick={() => { onSelect(""); setIsOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", padding: "10px 12px", gap: 10,
                  background: selectedId === "" ? "#f2f2f7" : "transparent", border: "none", borderRadius: 8, cursor: "pointer",
                  textAlign: "left"
                }}
                onMouseEnter={(e) => { if(selectedId !== "") e.currentTarget.style.background = "#f2f2f7" }}
                onMouseLeave={(e) => { if(selectedId !== "") e.currentTarget.style.background = "transparent" }}
              >
                <div style={{ width: 16, display: "flex", justifyContent: "center" }}>
                  {selectedId === "" && <Check size={16} color="#007aff" />}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#1c1c1e" }}>No Package (Free / Manual Later)</span>
              </button>

              {packages.map(pkg => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => { onSelect(pkg.id); setIsOpen(false); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", padding: "10px 12px", gap: 10,
                    background: selectedId === pkg.id ? "#f2f2f7" : "transparent", border: "none", borderRadius: 8, cursor: "pointer",
                    textAlign: "left", marginTop: 2
                  }}
                  onMouseEnter={(e) => { if(selectedId !== pkg.id) e.currentTarget.style.background = "#f2f2f7" }}
                  onMouseLeave={(e) => { if(selectedId !== pkg.id) e.currentTarget.style.background = "transparent" }}
                >
                  <div style={{ width: 16, display: "flex", justifyContent: "center", flexShrink: 0 }}>
                    {selectedId === pkg.id && <Check size={16} color="#007aff" />}
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#1c1c1e" }}>{pkg.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ padding: "4px 8px", background: "#e5e5ea", borderRadius: 100, fontSize: 11, fontWeight: 600, color: "#3a3a3c" }}>
                      {pkg.duration_days} Days
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1c1c1e" }}>{pkg.price} ETB</span>
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

type Tab = "overview" | "employers" | "jobs" | "configuration" | "monetization" | "reporting" | "settings";
type ConfigSubTab = "users" | "content" | "broadcast" | "activity";
type SeekerSubTab = "user-config" | "tab2" | "tab3" | "tab4";
type MonSubTab = "monetization" | "pricing";
type EmpSubTab = "emp_config" | null;
type EmpConfigSubTab = "view_emp" | "add_emp" | null;

export default function AdminDashboard({ initialData }: { initialData: any }) {
  const [data, setData] = useState(initialData);
  const VALID_TABS: Tab[] = ["overview", "employers", "jobs", "configuration", "monetization", "reporting", "settings"];
  const getInitialTab = (): Tab => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("adminActiveTab") as Tab;
      if (stored && VALID_TABS.includes(stored)) return stored;
    }
    return "overview";
  };

  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab);
  const [configSubTab, setConfigSubTab] = useState<ConfigSubTab>("users");
  const [monSubTab, setMonSubTab] = useState<MonSubTab>("monetization");
  const [empSubTab, setEmpSubTab] = useState<EmpSubTab>("emp_config");
  const [empConfigSubTab, setEmpConfigSubTab] = useState<EmpConfigSubTab>(null);
  const [selectedEmployerId, setSelectedEmployerId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const [empViewSearch, setEmpViewSearch] = useState("");
  const [empResults, setEmpResults] = useState<any[]>([]);
  const [empTotal, setEmpTotal] = useState(0);
  const [empPage, setEmpPage] = useState(1);
  const [empLoading, setEmpLoading] = useState(false);
  const empPageSize = 20;
  const [newTelegramId, setNewTelegramId] = useState("");
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newBusinessType, setNewBusinessType] = useState("");
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
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

  const [editModal, setEditModal] = useState<{ id: string; name: string; type: string; postLimit: number } | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editPostLimit, setEditPostLimit] = useState<number>(3);
  const [editPackageId, setEditPackageId] = useState<string>("");
  const [editExtendDays, setEditExtendDays] = useState<number>(0);
  const [editLoading, setEditLoading] = useState(false);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editError, setEditError] = useState("");

  const [pricingState, setPricingState] = useState({
    threeDays: "1,983.75",
    fiveDays: "2,645.00",
    oneWeek: "3,306.25",
    twoWeeks: "5,290.00",
    oneMonth: "7,273.75",
    threeMonths: "16,531.25",
    sixMonths: "25,127.50",
    oneYear: "46,287.50",
    pinVacancy: "1,000",
    companyName: "Prime Hospitality Business Group PLC",
    bankName: "Awash Bank",
    accountNo: "013041457659800",
    ...(initialData?.pricingConfig || {})
  });
  const [isEditingPricing, setIsEditingPricing] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);

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
  const [viewingJob, setViewingJob] = useState<any | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [overviewEmployerId, setOverviewEmployerId] = useState<string>("");
  const [overviewDuration, setOverviewDuration] = useState<"7" | "30" | "90">("30");
  const [activityDuration, setActivityDuration] = useState<"all" | "1" | "7" | "30">("all");
  const [employerSearch, setEmployerSearch] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [seekerSubTab, setSeekerSubTab] = useState<SeekerSubTab>("user-config");
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
    if (activeTab === "employers" && empSubTab === "emp_config") {
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
  }, [activeTab, empSubTab]);

  // Sync active tab to sessionStorage so refresh restores the same tab
  useEffect(() => {
    sessionStorage.setItem("adminActiveTab", activeTab);
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [activeTab]);

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
    { value: 3, label: "3 / day", description: "Basic" },
    { value: 5, label: "5 / day", description: "Standard" },
    { value: -1, label: "Unlimited", description: "Premium" },
  ];

  const getPostLimitLabel = (limit: number) => {
    if (limit === -1) return "Unlimited";
    return `${limit}/day`;
  };

  const handleEditEmployer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;
    setEditLoading(true);
    setEditError("");
    try {
      const res = await updateEmployer(editModal.id, editName, editType, editPostLimit, editPackageId || null, editExtendDays);
      
      let logoUrl = null;
      if (editLogoFile) {
        // Delete the old logo from storage if one exists
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

      if (res.success && res.employer) {
        const finalEmployer = { ...res.employer };
        if (logoUrl) finalEmployer.logo_url = logoUrl;
        setData((prev: any) => ({
          ...prev,
          employers: prev.employers.map((emp: any) => emp.id === editModal.id ? finalEmployer : emp)
        }));
        setEmpResults((prev: any[]) => prev.map((emp: any) => emp.id === editModal.id ? finalEmployer : emp));
        setEditModal(null);
      }
    } catch (err: any) {
      setEditError(err.message || "Failed to update employer");
    } finally {
      setEditLoading(false);
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

  const handleApprove = async (id: string) => {
    setLoading(`approve-${id}`);
    try {
      await approveEmployer(id);
      setData((prev: any) => ({
        ...prev,
        employers: prev.employers.map((e: any) => e.id === id ? { ...e, status: "approved" } : e)
      }));
      setEmpResults((prev: any[]) => prev.map((e: any) => e.id === id ? { ...e, status: "approved" } : e));
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setLoading(`reject-${id}`);
    try {
      await rejectEmployer(id);
      setData((prev: any) => ({
        ...prev,
        employers: prev.employers.map((e: any) => e.id === id ? { ...e, status: "rejected" } : e)
      }));
      setEmpResults((prev: any[]) => prev.map((e: any) => e.id === id ? { ...e, status: "rejected" } : e));
    } finally {
      setLoading(null);
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

  const handleJobStatus = async (id: string, status: "active" | "closed" | "pending" | "scheduled") => {
    setLoading(`job-${id}`);
    try {
      await toggleJobStatus(id, status);
      setData((prev: any) => ({
        ...prev,
        jobs: prev.jobs.map((j: any) => j.id === id ? { ...j, status } : j)
      }));
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
      const res = await repostJob(repostModal.id, deadlineIso);
      if (res?.newJobId) {
        setData((prev: any) => ({
          ...prev,
          jobs: [...prev.jobs, { ...(prev.jobs.find((j: any) => j.id === repostModal.id) || {}), id: res.newJobId, status: "active", deadline: deadlineIso }]
        }));
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
    sessionStorage.removeItem("adminActiveTab");
    await logoutAdmin();
    window.location.reload();
  };

  return (
    <div className="admin-shell flex h-screen overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-gray-900/50 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-[#c6c6c8] transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:shrink-0 flex flex-col ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-[#e5e5ea] shrink-0">
          <div
            style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
              marginRight: 10,
              background: "#fff",
              border: "1.5px solid #e2e8f0",
              boxShadow: "0 1px 4px 0 rgba(27,58,92,0.10)",
            }}
          >
            <img src="/addis_jobs_logo.png" alt="JobsAdis Logo" style={{ width: "80%", height: "80%", objectFit: "contain" }} />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-black leading-none mt-1">JobsAdis</span>
            <span className="text-[10px] font-black text-[#B08D57] uppercase tracking-wider mt-1">A.A Hotel Associates Union</span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="ml-auto md:hidden text-[#8e8e93] hover:text-[#1c1c1e]">
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
                {isBottomSection && <div className="h-px bg-[#e5e5ea] my-4 mx-2" />}
                <button
                  onClick={() => { setActiveTab(item.id as Tab); setSelectedEmployerId(null); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center px-4 py-3 text-[14px] rounded-xl transition-all duration-200 ${
                    isActive 
                      ? "bg-[#1c1c1e] text-white shadow-md shadow-gray-500/20 font-semibold" 
                      : "text-[#3a3a3c] font-medium hover:bg-[#e5e5ea] hover:text-[#1c1c1e]"
                  }`}
                  style={{ border: "none", cursor: "pointer", textAlign: "left" }}
                >
                  <Icon className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? "text-white" : "text-[#aeaeb2]"}`} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-[#e5e5ea] shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-[#1c1c1e] rounded-lg hover:bg-[#e5e5ea] hover:text-black transition-colors"
            style={{ border: "none", cursor: "pointer", textAlign: "left" }}
          >
            <LogOut className="mr-3 flex-shrink-0 h-5 w-5 text-[#aeaeb2] group-hover:text-[#8e8e93]" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-[#c6c6c8] h-16 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center">
            <span className="text-lg font-bold text-black tracking-tight">Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="text-[#8e8e93] hover:text-[#1c1c1e] relative transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center"
              >
                {data.specialRequests && data.specialRequests.length > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                )}
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-[#c6c6c8] rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="p-3 border-b border-[#e5e5ea] bg-[#f2f2f7] flex items-center justify-between">
                      <h3 className="font-bold text-black text-sm">Notifications</h3>
                      {data.specialRequests && data.specialRequests.length > 0 && (
                        <span className="bg-[#1c1c1e] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {data.specialRequests.length}
                        </span>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {data.specialRequests && data.specialRequests.length > 0 ? (
                        data.specialRequests.map((req: any) => {
                          const name = req.name || "Unknown Name";
                          return (
                            <div key={req.userId} className="p-4 border-b border-gray-50 hover:bg-[#f2f2f7] transition-colors last:border-b-0">
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 bg-amber-100 p-1.5 rounded-full text-amber-600 shrink-0">
                                  <Users size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-black leading-tight">
                                    Special Request
                                  </p>
                                  <p className="text-xs text-[#8e8e93] mt-1 truncate">
                                    <span className="font-medium text-[#1c1c1e]">{name}</span> (Telegram: {req.telegramId})
                                  </p>
                                  <p className="text-xs text-amber-700 mt-1.5 leading-relaxed">
                                    Ex-employer wants now to become a job seeker.
                                  </p>
                                  <button
                                    onClick={() => {
                                      setShowNotifications(false);
                                      setActiveTab("configuration");
                                      setConfigSubTab("users");
                                    }}
                                    className="mt-2.5 text-xs font-semibold text-[#1c1c1e] hover:text-[#2c2c2e] bg-[#e5e5ea] hover:bg-[#e5e5ea] px-3 py-1.5 rounded-md transition-colors w-full text-center"
                                  >
                                    View or Fix
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-6 text-center text-[#8e8e93] text-sm">
                          No new notifications
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <button onClick={() => setMobileMenuOpen(true)} className="text-[#8e8e93] hover:text-[#1c1c1e] focus:outline-none">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex bg-white h-[72px] items-center justify-between px-8 shrink-0 shadow-sm z-10 border-b border-[#c6c6c8]">
          <h1 className="text-2xl font-bold text-black tracking-tight">Admin Dashboard</h1>
          <div className="flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="text-[#8e8e93] hover:text-[#1c1c1e] relative transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center"
              >
                {data.specialRequests && data.specialRequests.length > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                )}
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-[#c6c6c8] rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="p-3 border-b border-[#e5e5ea] bg-[#f2f2f7] flex items-center justify-between">
                      <h3 className="font-bold text-black text-sm">Notifications</h3>
                      {data.specialRequests && data.specialRequests.length > 0 && (
                        <span className="bg-[#1c1c1e] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {data.specialRequests.length}
                        </span>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {data.specialRequests && data.specialRequests.length > 0 ? (
                        data.specialRequests.map((req: any) => {
                          const name = req.name || "Unknown Name";
                          return (
                            <div key={req.userId} className="p-4 border-b border-gray-50 hover:bg-[#f2f2f7] transition-colors last:border-b-0">
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 bg-amber-100 p-1.5 rounded-full text-amber-600 shrink-0">
                                  <Users size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-black leading-tight">
                                    Special Request
                                  </p>
                                  <p className="text-xs text-[#8e8e93] mt-1 truncate">
                                    <span className="font-medium text-[#1c1c1e]">{name}</span> (Telegram: {req.telegramId})
                                  </p>
                                  <p className="text-xs text-amber-700 mt-1.5 leading-relaxed">
                                    Ex-employer wants now to become a job seeker.
                                  </p>
                                  <button
                                    onClick={() => {
                                      setShowNotifications(false);
                                      setActiveTab("configuration");
                                      setConfigSubTab("users");
                                    }}
                                    className="mt-2.5 text-xs font-semibold text-[#1c1c1e] hover:text-[#2c2c2e] bg-[#e5e5ea] hover:bg-[#e5e5ea] px-3 py-1.5 rounded-md transition-colors w-full text-center"
                                  >
                                    View or Fix
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-6 text-center text-[#8e8e93] text-sm">
                          No new notifications
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-3 focus:outline-none hover:bg-[#f2f2f7] rounded-lg p-1.5 -m-1.5 transition-colors cursor-pointer"
              >
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(data.adminUsername || "Admin")}&background=random`} alt={data.adminUsername || "Admin"} className="w-10 h-10 rounded-full object-cover border border-[#c6c6c8]" />
                <div className="flex flex-col text-left">
                  <span className="text-sm font-bold text-black leading-none mb-1">{data.adminUsername || "Admin"}</span>
                  <span className="text-xs text-[#8e8e93] font-medium leading-none">{isSuperAdmin ? "Super Admin" : "Sub Admin"}</span>
                </div>
              </button>

              {profileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-[#c6c6c8] rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                    {isSuperAdmin && (
                      <button 
                        onClick={() => { setProfileMenuOpen(false); setSettingsOpen(true); }}
                        className="w-full text-left px-4 py-2.5 text-sm font-semibold text-[#1c1c1e] hover:bg-[#f2f2f7] hover:text-green-600 transition-colors flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" /> Settings
                      </button>
                    )}
                    <button 
                      onClick={() => setProfileMenuOpen(false)}
                      className="w-full text-left px-4 py-2.5 text-sm font-semibold text-[#1c1c1e] hover:bg-[#f2f2f7] hover:text-green-600 transition-colors flex items-center gap-2"
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

            const maxBar = Math.max(...perfData.map(d => d.posts), 1);

            // Activity feed - all employer job events merged
            const activityCutoff = activityDuration === "all" ? new Date(0) : daysAgo(Number(activityDuration));
            const activityFeed = jobs
              .filter(j => employers.some(e => e.id === j.employer_id) && new Date(j.created_at) >= activityCutoff)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 20)
              .map(j => ({
                id: j.id,
                employer: j.employers?.business_name || "Unknown Employer",
                action: j.status === "active" ? "Posted a new job" : j.status === "closed" ? "Closed a job posting" : "Submitted job for review",
                detail: j.title,
                status: j.status,
                time: j.created_at,
              }));

            const fmtTime = (iso: string) => {
              const d = new Date(iso);
              const diff = Math.floor((Date.now() - d.getTime()) / 1000);
              if (diff < 60) return `${diff}s ago`;
              if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
              if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
              return `${Math.floor(diff / 86400)}d ago`;
            };

            const statusDot: Record<string, string> = { active: "#10b981", closed: "#ef4444", pending: "#f59e0b" };

            return (
              <div className="max-w-6xl mx-auto space-y-5">

                {/* ---- ROW 1: Overall Stats — full width ---- */}
                <div className="bg-white rounded-xl border border-[#c6c6c8] shadow-sm p-6">
                  <h2 className="text-base font-bold text-[#1c1c1e] mb-5">Overall Stats</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Total Employers", value: employers.length, icon: <Building2 className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" color="#6366f1" strokeWidth={1.5} />, color: "#6366f1" },
                      { label: "Active Job Seekers", value: userCount, icon: <Users className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" color="#1c1c1e" strokeWidth={1.5} />, color: "#1c1c1e" },
                      { label: "Pending Moderation", value: jobs.filter(j => j.status === "pending").length, icon: <Hourglass className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" color="#f59e0b" strokeWidth={1.5} />, color: "#f59e0b" },
                      { label: "Total Job Posts", value: jobs.length, icon: <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" color="#10b981" strokeWidth={1.5} />, color: "#10b981" },
                    ].map(stat => (
                      <div key={stat.label} className="rounded-xl border border-[#e5e5ea] bg-[#f2f2f7]/80 p-3 sm:p-4 flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-4 transition-all hover:bg-white hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                        <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl bg-white shadow-sm border border-[#e5e5ea] flex-shrink-0">
                          {stat.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs text-[#8e8e93] font-bold tracking-wider uppercase mb-1 leading-snug">{stat.label}</p>
                          <p className="text-xl sm:text-2xl font-black tracking-tight leading-none" style={{ color: stat.color }}>{stat.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ---- ROW 2: Employer Performance ---- */}
                <div className="bg-white rounded-xl border border-[#c6c6c8] shadow-sm p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                      <h2 className="text-base font-bold text-[#1c1c1e]">Employer Performance</h2>
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
                      <div className="text-center py-12 text-[#aeaeb2] text-sm">Select an employer above to view their performance.</div>
                    ) : perfData.length === 0 || perfData.every(d => d.posts === 0) ? (
                      <div className="text-center py-12 text-[#aeaeb2] text-sm">No job activity in this period for the selected employer.</div>
                    ) : (
                      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
                        <div className="flex items-end gap-4 min-w-max pb-4" style={{ minHeight: 180 }}>
                          {perfData.map((d, i) => (
                            <div key={i} className="flex flex-col items-center gap-1 group" style={{ width: 40 }}>
                              <div className="flex items-end gap-1 w-full justify-center" style={{ height: 140 }}>
                                <div title={`${d.posts} total posts on ${d.name}`} style={{ width: 12, height: `${Math.max((d.posts / maxBar) * 130, 4)}px`, background: "#6366f1", borderRadius: "4px 4px 0 0", transition: "height .4s" }} className="hover:bg-indigo-400 cursor-pointer" />
                                <div title={`${d.active} active jobs on ${d.name}`} style={{ width: 12, height: `${Math.max((d.active / maxBar) * 130, 4)}px`, background: "#10b981", borderRadius: "4px 4px 0 0", transition: "height .4s" }} className="hover:bg-emerald-400 cursor-pointer" />
                              </div>
                              <p className="text-[10px] text-[#8e8e93] text-center leading-tight whitespace-nowrap mt-1 group-hover:text-[#1c1c1e] transition-colors">{d.name}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#6366f1" }} /><span className="text-xs text-[#8e8e93]">Total Posts</span></div>
                          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#10b981" }} /><span className="text-xs text-[#8e8e93]">Active Jobs</span></div>
                        </div>
                      </div>
                    )}
                  </div>

                {/* ---- ROW 3: Employer Activity — full width ---- */}
                <div className="bg-white rounded-xl border border-[#c6c6c8] shadow-sm p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                    <div>
                      <h2 className="text-base font-bold text-[#1c1c1e] mb-1">Employer Activity</h2>
                      <p className="text-xs text-[#aeaeb2]">Latest actions taken by employers on the platform</p>
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
                    <div className="text-center py-10 text-[#aeaeb2] text-sm">No activity yet.</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {activityFeed.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 py-3">
                          <div className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                            style={{ background: (statusDot[item.status] || "#6b7280") + "20" }}
                          >
                            <div className="w-3 h-3 rounded-full" style={{ background: statusDot[item.status] || "#6b7280" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#1c1c1e]">{item.employer}</p>
                            <p className="text-sm text-[#8e8e93]">{item.action} — <span className="font-medium text-[#1c1c1e]">{item.detail}</span></p>
                          </div>
                          <span className="text-xs text-[#aeaeb2] whitespace-nowrap mt-1 flex-shrink-0">{fmtTime(item.time)}</span>
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
          <div className="max-w-6xl mx-auto bg-white rounded-xl border border-[#c6c6c8] shadow-sm overflow-hidden">
          <div className="p-4 md:p-6 border-b border-[#c6c6c8] flex justify-between items-center">
            <h2 className="m-0 text-lg md:text-xl font-semibold capitalize text-[#1c1c1e]">
              {activeTab === "jobs" && selectedEmployerId ? "Jobs by Employer" : activeTab === "configuration" ? "Configuration" : navItems.find(n => n.id === activeTab)?.label || activeTab}
            </h2>
            {activeTab === "jobs" && selectedEmployerId && (
              <button 
                onClick={() => setSelectedEmployerId(null)} 
                className="bg-transparent border border-[#c6c6c8] px-3 py-1.5 rounded-lg cursor-pointer text-sm font-medium hover:bg-[#f2f2f7] transition-colors"
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
                className="ml-auto px-3 py-2 border border-[#c6c6c8] rounded-lg text-sm w-48 md:w-64 focus:outline-none focus:ring-2 focus:ring-[#1c1c1e] focus:border-transparent transition-all"
              />
            )}
          </div>

          <div className="overflow-x-auto">
            {/* ========== EMPLOYERS SUB-TABS ========== */}
            {activeTab === "employers" && (
              <div>
                <div className="flex border-b border-[#c6c6c8] bg-[#f2f2f7]/60 px-6 pt-4 gap-1">
                  <button
                    onClick={() => setEmpSubTab("emp_config")}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border border-b-0 transition-all ${
                      empSubTab === "emp_config"
                        ? "bg-white border-[#c6c6c8] text-[#1c1c1e] shadow-sm -mb-px"
                        : "bg-transparent border-transparent text-[#8e8e93] hover:text-[#1c1c1e]"
                    }`}
                    style={{ cursor: "pointer" }}
                  >
                    <span className="flex items-center gap-2"><Settings size={15} /> Emp Config</span>
                  </button>
                </div>
                {empSubTab === "emp_config" && (
                  <div className="flex border-b border-[#c6c6c8] bg-white px-6 pt-2 gap-2">
                    <button
                      onClick={() => setEmpConfigSubTab("view_emp")}
                      className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-all ${
                        empConfigSubTab === "view_emp"
                          ? "border-[#1c1c1e] text-[#1c1c1e]"
                          : "border-transparent text-[#8e8e93] hover:text-[#1c1c1e]"
                      }`}
                      style={{ cursor: "pointer" }}
                    >
                      <span className="flex items-center gap-2"><Users size={14} /> View Emp</span>
                    </button>
                    <button
                      onClick={() => { setEmpConfigSubTab("add_emp"); setFormError(""); setNewTelegramId(""); setNewBusinessName(""); setNewBusinessType(""); setSelectedPackageId(""); }}
                      className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-all ${
                        empConfigSubTab === "add_emp"
                          ? "border-[#1c1c1e] text-[#1c1c1e]"
                          : "border-transparent text-[#8e8e93] hover:text-[#1c1c1e]"
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
              <div style={{ padding: "16px 24px", background: "#f8fafc", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                <input
                  type="text"
                  placeholder="Search employers..."
                  value={empViewSearch}
                  onChange={(e) => { setEmpViewSearch(e.target.value); setEmpPage(1); }}
                  className="px-3 py-2 border border-[#c6c6c8] rounded-lg text-sm w-48 md:w-64 focus:outline-none focus:ring-2 focus:ring-[#1c1c1e] focus:border-transparent transition-all"
                />
              </div>
            )}

            {activeTab === "employers" && empSubTab === "emp_config" && empConfigSubTab === "add_emp" && (
              <div style={{ padding: "32px 24px", maxWidth: 600, margin: "0 auto" }}>
                <div style={{ background: "#fff", borderRadius: 16, padding: 32, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                  <h3 style={{ margin: "0 0 24px 0", fontSize: 20, fontWeight: 800, color: "#1c1c1e", letterSpacing: "-0.02em" }}>Add New Employer</h3>
                  <form onSubmit={handleAddEmployer} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#1c1c1e", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Telegram ID</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={newTelegramId}
                        onChange={e => setNewTelegramId(e.target.value.replace(/[^0-9]/g, ""))}
                        required
                        placeholder="e.g. 123456789"
                        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, fontWeight: 500, color: "#1c1c1e", background: "#f8fafc", boxSizing: "border-box", outline: "none", transition: "border-color 0.2s" }}
                      />
                      <p style={{ margin: "5px 0 0 0", fontSize: 11, color: "#94a3b8" }}>Must be 5–12 digits, no leading zero.</p>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#1c1c1e", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Business Name</label>
                      <input
                        type="text"
                        value={newBusinessName}
                        onChange={e => setNewBusinessName(e.target.value)}
                        required
                        placeholder="e.g. Hilton Addis Ababa"
                        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, fontWeight: 500, color: "#1c1c1e", background: "#f8fafc", boxSizing: "border-box", outline: "none" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#1c1c1e", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Business Type</label>
                      <input
                        type="text"
                        value={newBusinessType}
                        onChange={e => setNewBusinessType(e.target.value)}
                        required
                        placeholder="e.g. Hotel, Restaurant, NGO"
                        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, fontWeight: 500, color: "#1c1c1e", background: "#f8fafc", boxSizing: "border-box", outline: "none" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#1c1c1e", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Subscription Package (Optional)</label>
                      <PackageDropdown packages={packages} selectedId={selectedPackageId} onSelect={setSelectedPackageId} />
                    </div>
                    {formError && <p style={{ margin: 0, fontSize: 13, color: "#dc2626", background: "#fef2f2", padding: "10px 14px", borderRadius: 8, border: "1px solid #fecaca" }}>{formError}</p>}
                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                      <button type="button" onClick={() => setEmpConfigSubTab("view_emp")} disabled={formLoading} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                      <button type="submit" disabled={formLoading || !newTelegramId || !newBusinessName || !newBusinessType} style={{ flex: 2, padding: "12px", borderRadius: 10, border: "none", background: formLoading ? "#93c5fd" : "linear-gradient(135deg, #1c1c1e, #2c2c2e)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: formLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}>
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
                <div className="flex border-b border-[#c6c6c8] bg-[#f2f2f7]/60 px-6 pt-4 gap-1">
                  <button
                    onClick={() => setConfigSubTab("users")}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border border-b-0 transition-all ${
                      configSubTab === "users"
                        ? "bg-white border-[#c6c6c8] text-[#1c1c1e] shadow-sm -mb-px"
                        : "bg-transparent border-transparent text-[#8e8e93] hover:text-[#1c1c1e]"
                    }`}
                    style={{ cursor: "pointer" }}
                  >
                    <span className="flex items-center gap-2"><Users size={15} /> Job Seeker Profiles</span>
                  </button>
                  <button
                    onClick={() => setConfigSubTab("content")}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border border-b-0 transition-all ${
                      configSubTab === "content"
                        ? "bg-white border-[#c6c6c8] text-[#1c1c1e] shadow-sm -mb-px"
                        : "bg-transparent border-transparent text-[#8e8e93] hover:text-[#1c1c1e]"
                    }`}
                    style={{ cursor: "pointer" }}
                  >
                    <span className="flex items-center gap-2"><BookOpen size={15} /> Content Management</span>
                  </button>
                  <button
                    onClick={() => setConfigSubTab("broadcast")}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border border-b-0 transition-all ${
                      configSubTab === "broadcast"
                        ? "bg-white border-[#c6c6c8] text-[#1c1c1e] shadow-sm -mb-px"
                        : "bg-transparent border-transparent text-[#8e8e93] hover:text-[#1c1c1e]"
                    }`}
                    style={{ cursor: "pointer" }}
                  >
                    <span className="flex items-center gap-2"><Megaphone size={15} /> Broadcast</span>
                  </button>
                  <button
                    onClick={() => setConfigSubTab("activity")}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border border-b-0 transition-all ${
                      configSubTab === "activity"
                        ? "bg-white border-[#c6c6c8] text-[#1c1c1e] shadow-sm -mb-px"
                        : "bg-transparent border-transparent text-[#8e8e93] hover:text-[#1c1c1e]"
                    }`}
                    style={{ cursor: "pointer" }}
                  >
                    <span className="flex items-center gap-2"><History size={15} /> Activity Log</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === "configuration" && configSubTab === "users" && (
              <div className="flex border-t border-[#c6c6c8]" style={{ minHeight: 500 }}>
                {/* ===== 4-TAB SIDE NAV ===== */}
                <aside className="w-52 shrink-0 border-r border-[#c6c6c8] bg-[#f2f2f7]/50 py-4 flex flex-col gap-1 px-3">
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
                          ? "bg-[#1c1c1e] text-white shadow-sm"
                          : "text-[#8e8e93] hover:bg-[#e5e5ea] hover:text-black"
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
                            <h3 style={{ margin: "0 0 10px 0", fontSize: 14, fontWeight: 700, color: "#92400e", display: "flex", alignItems: "center", gap: 7 }}>
                              <Users size={16} />
                              Special Requests ({data.specialRequests.length})
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {data.specialRequests.map((req: any) => {
                                const name = req.name || "Unknown Name";
                                return (
                                  <div key={req.userId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "10px 14px", borderRadius: 8, border: "1px solid #fde68a" }}>
                                    <div>
                                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1c1c1e" }}>{name} (Telegram: {req.telegramId})</p>
                                      <p style={{ margin: "3px 0 0 0", fontSize: 12, color: "#b45309" }}>Ex-employer wants now to become a job seeker.</p>
                                    </div>
                                    <button
                                      onClick={() => setApproveReqModal(req.userId)}
                                      style={{ background: "#059669", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
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
                        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-[#e5e5ea] bg-white">
                          <div className="flex-1 relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aeaeb2]" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                            <input
                              type="text"
                              placeholder="Search by name..."
                              value={userSearchName}
                              onChange={e => setUserSearchName(e.target.value)}
                              className="w-full pl-9 pr-4 py-2.5 bg-[#f2f2f7] border border-[#c6c6c8] rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#007aff]/20 focus:border-[#007aff] transition-all placeholder-[#aeaeb2] font-medium"
                            />
                          </div>
                          <div className="flex-1 relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aeaeb2]" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            <input
                              type="text"
                              placeholder="Search by phone number..."
                              value={userSearchPhone}
                              onChange={e => setUserSearchPhone(e.target.value)}
                              className="w-full pl-9 pr-4 py-2.5 bg-[#f2f2f7] border border-[#c6c6c8] rounded-xl text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#007aff]/20 focus:border-[#007aff] transition-all placeholder-[#aeaeb2] font-medium"
                            />
                          </div>
                          {(userSearchName || userSearchPhone) && (
                            <button
                              onClick={() => { setUserSearchName(""); setUserSearchPhone(""); }}
                              className="px-3 py-2 text-xs font-semibold text-[#8e8e93] hover:text-[#1c1c1e] bg-[#e5e5ea] hover:bg-[#e5e5ea] rounded-xl transition-colors whitespace-nowrap"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {/* Result count */}
                        <div className="px-5 py-2 bg-[#f2f2f7] border-b border-[#e5e5ea]">
                          <div className="text-xs text-[#8e8e93] mt-2 text-right">
                              {userTotal} total job seeker{userTotal !== 1 ? 's' : ''}
                            </div>
                        </div>

                        {/* Desktop Table */}
                        <div className="flex-1 overflow-y-auto min-h-0 bg-[#f2f2f7]">
                          <div className="p-4 md:p-6 pb-20">
                            {userLoading ? (
                              <div className="text-center py-10 text-[#aeaeb2] text-sm">Loading users...</div>
                            ) : userResults.length === 0 ? (
                              <div className="text-center py-10 text-[#aeaeb2] text-sm">No users found.</div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {userResults.map((u: any) => (
                                  <div key={u.id} className="bg-white p-4 rounded-xl border border-[#c6c6c8] shadow-sm flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h4 className="font-semibold text-[#1c1c1e] m-0">
                                          {u.profiles?.full_name || "Unonboarded"}
                                          {u.is_banned && <span className="text-red-500 text-xs ml-2">(Banned)</span>}
                                        </h4>
                                        <p className="text-xs text-[#8e8e93] m-0 mt-1">{u.profiles?.phone_number || "No phone"}</p>
                                        <p className="text-xs text-[#aeaeb2] m-0 mt-0.5 font-mono">TG: {u.telegram_id}</p>
                                      </div>
                                      <span className="text-xs font-medium text-[#8e8e93] bg-[#e5e5ea] border border-[#c6c6c8] px-2 py-1 rounded-md capitalize">{u.role}</span>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-3 border-t border-[#e5e5ea]">
                                      <button
                                        disabled={!!loading}
                                        onClick={() => { setBanUserModal({ id: u.id, name: u.profiles?.full_name || "Unonboarded", is_banned: u.is_banned }); setUserActionPassword(""); setUserActionError(""); }}
                                        style={{ background: u.is_banned ? "#10b981" : "#ef4444" }}
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
                              <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#e5e5ea]">
                                <span className="text-sm text-[#8e8e93]">
                                  Showing {(userPage - 1) * userPageSize + 1} to {Math.min(userPage * userPageSize, userTotal)} of {userTotal} users
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    disabled={userPage === 1 || userLoading}
                                    onClick={() => setUserPage(p => p - 1)}
                                    className="px-3 py-1.5 rounded-lg border border-[#c6c6c8] bg-white text-sm font-medium text-[#1c1c1e] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f2f2f7]"
                                  >
                                    Previous
                                  </button>
                                  <button
                                    disabled={userPage * userPageSize >= userTotal || userLoading}
                                    onClick={() => setUserPage(p => p + 1)}
                                    className="px-3 py-1.5 rounded-lg border border-[#c6c6c8] bg-white text-sm font-medium text-[#1c1c1e] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f2f2f7]"
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
                    <div className="flex flex-col h-full bg-[#f2f2f7]">
                      <div className="p-4 md:p-6 pb-20 overflow-y-auto">
                        <h2 className="text-lg font-bold text-black mb-4">Job Seeker Professions</h2>
                        {professionsLoading ? (
                          <div className="text-center py-10 text-[#aeaeb2] text-sm">Loading professions...</div>
                        ) : professionsData.length === 0 ? (
                          <div className="text-center py-10 text-[#aeaeb2] text-sm">No professions found.</div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {professionsData.map((prof, idx) => (
                              <div key={idx} className="bg-white p-4 rounded-xl border border-[#c6c6c8] shadow-sm flex items-center justify-between">
                                <span className="font-semibold text-[#1c1c1e] capitalize truncate mr-2" title={prof.name}>{prof.name}</span>
                                <span className="bg-[#e5e5ea] text-[#1c1c1e] text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
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
                    <div className="flex flex-col items-center justify-center py-20 text-[#aeaeb2]">
                      <BookOpen size={40} className="mb-3 text-[#c6c6c8]" />
                      <p className="text-base font-semibold">Tab 3</p>
                      <p className="text-sm mt-1">Coming soon</p>
                    </div>
                  )}
                  {seekerSubTab === "tab4" && (
                    <div className="flex flex-col items-center justify-center py-20 text-[#aeaeb2]">
                      <CreditCard size={40} className="mb-3 text-[#c6c6c8]" />
                      <p className="text-base font-semibold">Tab 4</p>
                      <p className="text-sm mt-1">Coming soon</p>
                    </div>
                  )}

                </div>
              </div>
            )}
            {/* Desktop Table View */}
            <div className="hidden md:block w-full">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[#f2f2f7] border-b border-[#c6c6c8]">
                    {activeTab === "employers" && empSubTab === "emp_config" && empConfigSubTab === "view_emp" && (
                      <>
                        <th style={{ padding: "12px 24px", color: "#8e8e93", fontSize: 12, textTransform: "uppercase" }}>Business Name</th>
                        <th style={{ padding: "12px 24px", color: "#8e8e93", fontSize: 12, textTransform: "uppercase" }}>Telegram ID</th>
                        <th style={{ padding: "12px 24px", color: "#8e8e93", fontSize: 12, textTransform: "uppercase" }}>Post Limit</th>
                        <th style={{ padding: "12px 24px", color: "#8e8e93", fontSize: 12, textTransform: "uppercase" }}>Status</th>
                        <th style={{ padding: "12px 24px", color: "#8e8e93", fontSize: 12, textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                      </>
                    )}
                    {activeTab === "jobs" && !selectedEmployerId && (
                      <>
                        <th style={{ padding: "12px 24px", color: "#8e8e93", fontSize: 12, textTransform: "uppercase" }}>Business Name</th>
                        <th style={{ padding: "12px 24px", color: "#8e8e93", fontSize: 12, textTransform: "uppercase" }}>Total Jobs</th>
                        <th style={{ padding: "12px 24px", color: "#8e8e93", fontSize: 12, textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                      </>
                    )}
                    {activeTab === "jobs" && selectedEmployerId && (
                      <>
                        <th style={{ padding: "12px 24px", color: "#8e8e93", fontSize: 12, textTransform: "uppercase" }}>Job Title</th>
                        <th style={{ padding: "12px 24px", color: "#8e8e93", fontSize: 12, textTransform: "uppercase" }}>Status</th>
                        <th style={{ padding: "12px 24px", color: "#8e8e93", fontSize: 12, textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                      </>
                    )}

                  </tr>
                </thead>
                <tbody>
                  {activeTab === "employers" && empSubTab === "emp_config" && empConfigSubTab === "view_emp" && empResults.map((item: any) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "16px 24px", fontWeight: 500 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {item.business_name}
                          <button
                            onClick={() => { setEditModal({ id: item.id, name: item.business_name, type: item.business_type || "", postLimit: item.daily_post_limit ?? 3 }); setEditName(item.business_name); setEditType(item.business_type || ""); setEditPostLimit(item.daily_post_limit ?? 3); setEditPackageId(item.active_package_id || ""); setEditExtendDays(0); setEditLogoFile(null); setEditError(""); }}
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", padding: "4px", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}
                            title="Edit employer"
                          >
                            <Pencil size={13} />
                          </button>
                        </span>
                      </td>
                      <td style={{ padding: "16px 24px", color: "#8e8e93" }}>{item.users?.telegram_id || "—"}</td>
                      <td style={{ padding: "16px 24px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                          background: (item.daily_post_limit ?? 3) === -1 ? "#ede9fe" : "#f1f5f9",
                          color: (item.daily_post_limit ?? 3) === -1 ? "#7c3aed" : "#1c1c1e",
                          border: `1px solid ${(item.daily_post_limit ?? 3) === -1 ? "#ddd6fe" : "#bfdbfe"}`,
                        }}>
                          {getPostLimitLabel(item.daily_post_limit ?? 3)}
                        </span>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                          background: item.status === "approved" ? "#d1fae5" : item.status === "rejected" ? "#fee2e2" : "#fef3c7",
                          color: item.status === "approved" ? "#065f46" : item.status === "rejected" ? "#991b1b" : "#92400e"
                        }}>{item.status}</span>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right", display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                        {item.status !== "approved" && (
                          <button disabled={!!loading} onClick={() => handleApprove(item.id)} style={{ background: "#059669", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Approve</button>
                        )}
                        {item.status !== "rejected" && (
                          <button disabled={!!loading} onClick={() => handleReject(item.id)} style={{ background: "#dc2626", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Reject</button>
                        )}
                        <button 
                          disabled={!!loading} 
                          onClick={() => { setDeleteModal({ id: item.id, name: item.business_name }); setAdminPassword(""); setDeleteError(""); }} 
                          style={{ background: "transparent", color: "#ef4444", border: "none", padding: "6px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center" }}
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
                      <tr key={emp.id} onClick={() => setSelectedEmployerId(emp.id)} style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }} className="hover:bg-[#f2f2f7] transition-colors">
                        <td style={{ padding: "16px 24px", fontWeight: 500 }}>{emp.business_name}</td>
                        <td style={{ padding: "16px 24px", color: "#8e8e93" }}>{jobCount} Job{jobCount !== 1 && "s"}</td>
                        <td style={{ padding: "16px 24px", textAlign: "right" }}>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedEmployerId(emp.id); }} style={{ background: "#f3f4f6", color: "#1c1c1e", border: "1px solid #d1d5db", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                            View Jobs
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {activeTab === "jobs" && selectedEmployerId && data.jobs.filter((j: any) => j.employer_id === selectedEmployerId).map((item: any) => (
                    <tr key={item.id} onClick={() => setViewingJob(item)} style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }} className="hover:bg-[#f2f2f7] transition-colors">
                      <td style={{ padding: "16px 24px", fontWeight: 500 }}>{item.title}</td>
                      <td style={{ padding: "16px 24px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                          background: item.status === "active" ? "#d1fae5" : item.status === "closed" ? "#fee2e2" : "#fef3c7",
                          color: item.status === "active" ? "#065f46" : item.status === "closed" ? "#991b1b" : "#92400e"
                        }}>
                          {item.status === "active" ? "active" : item.status === "closed" ? "closed" : "under review"}
                        </span>
                      </td>
                      <td style={{ padding: "16px 24px", textAlign: "right", display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                        {item.status === "active" && (
                          <button disabled={!!loading} onClick={() => handleJobStatus(item.id, "pending")} style={{ background: "#f59e0b", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Pause</button>
                        )}
                        {item.status !== "active" && (
                          <button disabled={!!loading} onClick={() => handleJobStatus(item.id, "active")} style={{ background: "#059669", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Set Active</button>
                        )}
                        {item.status !== "closed" && (
                          <button disabled={!!loading} onClick={() => handleJobStatus(item.id, "closed")} style={{ background: "#dc2626", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Close Job</button>
                        )}
                        {(item.status === "closed" || item.status === "expired") && (
                          <button disabled={!!loading} onClick={() => { setRepostModal({ id: item.id, title: item.title }); setRepostDeadline(""); setRepostError(""); }} style={{ background: "#0f172a", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Repost</button>
                        )}
                      </td>
                    </tr>
                  ))}


                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col p-4 bg-[#f2f2f7]/50">
              {activeTab === "employers" && empSubTab === "emp_config" && empConfigSubTab === "view_emp" && empResults.map((item: any) => (
                <div key={item.id} className="bg-white p-4 rounded-xl border border-[#c6c6c8] shadow-sm flex flex-col gap-3 mb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <h4 className="font-semibold text-[#1c1c1e] m-0">{item.business_name}</h4>
                        <button
                          onClick={() => { setEditModal({ id: item.id, name: item.business_name, type: item.business_type || "", postLimit: item.daily_post_limit ?? 3 }); setEditName(item.business_name); setEditType(item.business_type || ""); setEditPostLimit(item.daily_post_limit ?? 3); setEditPackageId(item.active_package_id || ""); setEditExtendDays(0); setEditLogoFile(null); setEditError(""); }}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", padding: "2px", display: "flex", alignItems: "center" }}
                          title="Edit employer"
                        >
                          <Pencil size={13} />
                        </button>
                      </span>
                      <p className="text-xs text-[#8e8e93] m-0 mt-1 font-mono">ID: {item.users?.telegram_id || "—"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span style={{
                        padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 600,
                        background: item.status === "approved" ? "#d1fae5" : item.status === "rejected" ? "#fee2e2" : "#fef3c7",
                        color: item.status === "approved" ? "#065f46" : item.status === "rejected" ? "#991b1b" : "#92400e"
                      }}>{item.status}</span>
                      <span style={{
                        padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 600,
                        background: (item.daily_post_limit ?? 3) === -1 ? "#ede9fe" : "#f1f5f9",
                        color: (item.daily_post_limit ?? 3) === -1 ? "#7c3aed" : "#1c1c1e",
                        border: `1px solid ${(item.daily_post_limit ?? 3) === -1 ? "#ddd6fe" : "#bfdbfe"}`,
                      }}>
                        {getPostLimitLabel(item.daily_post_limit ?? 3)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end mt-2 pt-3 border-t border-[#e5e5ea]">
                    {item.status !== "approved" && (
                      <button disabled={!!loading} onClick={() => handleApprove(item.id)} className="bg-emerald-600 text-white border-none px-3 py-1.5 rounded-lg text-xs font-medium">Approve</button>
                    )}
                    {item.status !== "rejected" && (
                      <button disabled={!!loading} onClick={() => handleReject(item.id)} className="bg-red-600 text-white border-none px-3 py-1.5 rounded-lg text-xs font-medium">Reject</button>
                    )}
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
                  <div key={emp.id} onClick={() => setSelectedEmployerId(emp.id)} className="bg-white p-4 rounded-xl border border-[#c6c6c8] shadow-sm flex flex-col gap-3 mb-3 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-[#1c1c1e] m-0">{emp.business_name}</h4>
                      <span className="text-xs font-medium text-[#8e8e93] bg-[#e5e5ea] border border-[#c6c6c8] px-2 py-1 rounded-md">{jobCount} Job{jobCount !== 1 && "s"}</span>
                    </div>
                    <div className="flex justify-end mt-1">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedEmployerId(emp.id); }} className="bg-[#e5e5ea] text-[#1c1c1e] border border-[#c6c6c8] px-3 py-1.5 rounded-lg text-xs font-medium">
                        View Jobs
                      </button>
                    </div>
                  </div>
                );
              })}

              {activeTab === "jobs" && selectedEmployerId && data.jobs.filter((j: any) => j.employer_id === selectedEmployerId).map((item: any) => (
                <div key={item.id} onClick={() => setViewingJob(item)} style={{ cursor: "pointer" }} className="bg-white p-4 rounded-xl border border-[#c6c6c8] shadow-sm flex flex-col gap-3 mb-3 hover:bg-[#f2f2f7] transition-colors">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-[#1c1c1e] m-0">{item.title}</h4>
                    <span style={{
                      padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 600,
                      background: item.status === "active" ? "#d1fae5" : item.status === "closed" ? "#fee2e2" : "#fef3c7",
                      color: item.status === "active" ? "#065f46" : item.status === "closed" ? "#991b1b" : "#92400e"
                    }}>
                      {item.status === "active" ? "active" : item.status === "closed" ? "closed" : "under review"}
                    </span>
                  </div>
                  <div className="flex gap-2 justify-end mt-2 pt-3 border-t border-[#e5e5ea]" onClick={(e) => e.stopPropagation()}>
                    {item.status === "active" && (
                      <button disabled={!!loading} onClick={() => handleJobStatus(item.id, "pending")} className="bg-amber-500 text-white border-none px-3 py-1.5 rounded-lg text-xs font-medium">Pause</button>
                    )}
                    {item.status !== "active" && (
                      <button disabled={!!loading} onClick={() => handleJobStatus(item.id, "active")} className="bg-emerald-600 text-white border-none px-3 py-1.5 rounded-lg text-xs font-medium">Set Active</button>
                    )}
                    {item.status !== "closed" && (
                      <button disabled={!!loading} onClick={() => handleJobStatus(item.id, "closed")} className="bg-red-600 text-white border-none px-3 py-1.5 rounded-lg text-xs font-medium">Close Job</button>
                    )}
                    {(item.status === "closed" || item.status === "expired") && (
                      <button disabled={!!loading} onClick={() => { setRepostModal({ id: item.id, title: item.title }); setRepostDeadline(""); setRepostError(""); }} className="bg-[#0f172a] text-white border-none px-3 py-1.5 rounded-lg text-xs font-medium">Repost</button>
                    )}
                  </div>
                </div>
              ))}


            </div>
            
            {activeTab === "employers" && empSubTab === "emp_config" && empConfigSubTab === "view_emp" && !empLoading && empResults.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#8e8e93" }}>
                No employers found.
              </div>
            )}

            {activeTab === "employers" && empSubTab === "emp_config" && empConfigSubTab === "view_emp" && empLoading && (
              <div style={{ padding: 40, textAlign: "center", color: "#8e8e93" }}>
                Loading employers...
              </div>
            )}

            {activeTab === "employers" && empSubTab === "emp_config" && empConfigSubTab === "view_emp" && empTotal > 0 && (
              <div className="flex justify-between items-center p-4 md:p-6 border-t border-[#e5e5ea] bg-white mt-auto">
                <span className="text-sm text-[#8e8e93]">
                  Showing {(empPage - 1) * empPageSize + 1} to {Math.min(empPage * empPageSize, empTotal)} of {empTotal} employers
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={empPage === 1 || empLoading}
                    onClick={() => setEmpPage(p => p - 1)}
                    className="px-3 py-1.5 rounded-lg border border-[#c6c6c8] bg-white text-sm font-medium text-[#1c1c1e] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f2f2f7]"
                  >
                    Previous
                  </button>
                  <button
                    disabled={empPage * empPageSize >= empTotal || empLoading}
                    onClick={() => setEmpPage(p => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-[#c6c6c8] bg-white text-sm font-medium text-[#1c1c1e] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f2f2f7]"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}


            {activeTab === "configuration" && configSubTab === "content" && (
              <ContentManagementTab />
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
                <div className="flex gap-1 bg-[#f2f2f7] rounded-xl p-1 mb-6 w-fit">
                  {(["monetization", "pricing"] as MonSubTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setMonSubTab(tab)}
                      className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                        monSubTab === tab
                          ? "bg-white text-[#1c1c1e] shadow-sm"
                          : "text-[#8e8e93] hover:text-[#1c1c1e]"
                      }`}
                    >
                      {tab === "monetization" ? "Monetization" : "Pricing"}
                    </button>
                  ))}
                </div>

                {/* Monetization sub-tab */}
                {monSubTab === "monetization" && (
                  <div className="bg-white rounded-xl border border-[#c6c6c8] shadow-sm p-10 text-center flex flex-col items-center">
                    <div className="bg-[#f2f2f7] rounded-full p-4 mb-4">
                      <CreditCard className="w-8 h-8 text-[#aeaeb2]" />
                    </div>
                    <h3 className="text-lg font-bold text-black mb-2">Monetization</h3>
                    <p className="text-sm text-[#8e8e93] max-w-sm">
                      Configure revenue streams, commission settings, and payment gateway integrations. Coming soon.
                    </p>
                  </div>
                )}

                {/* Pricing sub-tab */}
                {monSubTab === "pricing" && (
                  <div className="space-y-6">

                    {/* Header */}
                    <div className="bg-[#1c1c1e] rounded-xl p-6 text-white flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight mb-1">Employer Pricing Packages</h3>
                        <p className="text-[#94a3b8] text-sm">All prices are in Ethiopian Birr (ETB). No position limitations on any package.</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={handleSavePricing}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${isEditingPricing ? 'bg-[#059669] text-white' : 'bg-white/10 text-white hover:bg-white/20'} border border-white/20`}
                        >
                          {pricingSaving ? "Saving..." : isEditingPricing ? "Save Changes" : "Edit Pricing"}
                        </button>
                        <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2 text-sm font-semibold text-white border border-white/20 hidden sm:flex">
                          <CreditCard className="w-4 h-4" />
                          ETB — Ethiopian Birr
                        </div>
                      </div>
                    </div>

                    {/* 3 Posts/Day Packages */}
                    <div className="bg-white rounded-xl border border-[#c6c6c8] shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#e5e5ea] bg-[#f2f2f7]/60">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1c1c1e] text-white text-xs font-black">3×</div>
                        <div>
                          <p className="text-sm font-bold text-[#1c1c1e]">Standard Packages</p>
                          <p className="text-xs text-[#8e8e93] font-medium">Posted 3 times per day</p>
                        </div>
                      </div>
                      <div className="divide-y divide-[#f1f5f9]">
                        {[
                          { label: "Three Days", key: "threeDays", tag: null },
                          { label: "Five Days", key: "fiveDays", tag: null },
                          { label: "One Week", key: "oneWeek", tag: "Popular" },
                          { label: "Two Weeks", key: "twoWeeks", tag: null },
                          { label: "One Month", key: "oneMonth", tag: null },
                          { label: "Three Months", key: "threeMonths", tag: "Best Value" },
                        ].map(pkg => (
                          <div key={pkg.label} className="flex items-center justify-between px-6 py-4 hover:bg-[#f8fafc] transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-[#1c1c1e] flex-shrink-0" />
                              <span className="text-sm font-semibold text-[#1c1c1e]">{pkg.label} Package</span>
                              {pkg.tag && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1c1c1e] text-white tracking-wide">{pkg.tag}</span>
                              )}
                            </div>
                            <div className="text-right flex items-center gap-2">
                              {isEditingPricing ? (
                                <div className="flex items-center">
                                  <span className="text-sm text-[#8e8e93] mr-2">ETB</span>
                                  <input 
                                    type="text" 
                                    value={pricingState[pkg.key as keyof typeof pricingState]} 
                                    onChange={(e) => setPricingState({...pricingState, [pkg.key]: e.target.value})}
                                    className="w-24 px-2 py-1 border border-[#c6c6c8] rounded text-sm text-[#1c1c1e] focus:outline-none focus:border-[#007aff]"
                                  />
                                </div>
                              ) : (
                                <span className="text-base font-black text-[#1c1c1e]">ETB {pricingState[pkg.key as keyof typeof pricingState]}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 5 Posts/Day Packages */}
                    <div className="bg-white rounded-xl border border-[#c6c6c8] shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#e5e5ea] bg-[#f2f2f7]/60">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#059669] text-white text-xs font-black">5×</div>
                        <div>
                          <p className="text-sm font-bold text-[#1c1c1e]">Premium Memberships</p>
                          <p className="text-xs text-[#8e8e93] font-medium">Posted 5 times per day</p>
                        </div>
                      </div>
                      <div className="divide-y divide-[#f1f5f9]">
                        {[
                          { label: "Six Months Membership", key: "sixMonths" },
                          { label: "One Year Membership", key: "oneYear" },
                        ].map(pkg => (
                          <div key={pkg.label} className="flex items-center justify-between px-6 py-4 hover:bg-[#f8fafc] transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-[#059669] flex-shrink-0" />
                              <span className="text-sm font-semibold text-[#1c1c1e]">{pkg.label}</span>
                            </div>
                            <div className="text-right flex items-center gap-2">
                              {isEditingPricing ? (
                                <div className="flex items-center">
                                  <span className="text-sm text-[#8e8e93] mr-2">ETB</span>
                                  <input 
                                    type="text" 
                                    value={pricingState[pkg.key as keyof typeof pricingState]} 
                                    onChange={(e) => setPricingState({...pricingState, [pkg.key]: e.target.value})}
                                    className="w-24 px-2 py-1 border border-[#c6c6c8] rounded text-sm text-[#059669] focus:outline-none focus:border-[#059669]"
                                  />
                                </div>
                              ) : (
                                <span className="text-base font-black text-[#059669]">ETB {pricingState[pkg.key as keyof typeof pricingState]}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pin Vacancy */}
                    <div className="bg-white rounded-xl border border-[#c6c6c8] shadow-sm">
                      <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#f59e0b] text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#1c1c1e]">Pin Your Vacancy</p>
                            <p className="text-xs text-[#8e8e93] font-medium">Per day pinned promotion</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          {isEditingPricing ? (
                            <div className="flex items-center">
                              <span className="text-sm text-[#8e8e93] mr-2">ETB</span>
                              <input 
                                type="text" 
                                value={pricingState.pinVacancy} 
                                onChange={(e) => setPricingState({...pricingState, pinVacancy: e.target.value})}
                                className="w-20 px-2 py-1 border border-[#c6c6c8] rounded text-sm text-[#f59e0b] focus:outline-none focus:border-[#f59e0b]"
                              />
                              <span className="text-sm text-[#8e8e93] ml-2">/ day</span>
                            </div>
                          ) : (
                            <span className="text-base font-black text-[#f59e0b]">ETB {pricingState.pinVacancy} / day</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                          <div>
                            <p className="text-xs font-bold text-[#0369a1] mb-1">No Position Limit</p>
                            <p className="text-xs text-[#0284c7] leading-relaxed">Any package allows posting multiple positions. There is no cap on the number of roles per package.</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          <div>
                            <p className="text-xs font-bold text-[#c2410c] mb-1">Consecutive Days Only</p>
                            <p className="text-xs text-[#ea580c] leading-relaxed">Posting days are only consecutive days starting from the package activation date.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div className="bg-white rounded-xl border border-[#c6c6c8] shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#e5e5ea] bg-[#f2f2f7]/60">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1c1c1e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                        <p className="text-sm font-bold text-[#1c1c1e]">Payment Details</p>
                      </div>
                      <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { label: "Company Name", key: "companyName" },
                          { label: "Bank", key: "bankName" },
                          { label: "Account No.", key: "accountNo" },
                        ].map(item => (
                          <div key={item.label}>
                            <p className="text-[10px] font-bold text-[#8e8e93] uppercase tracking-wider mb-1">{item.label}</p>
                            {isEditingPricing ? (
                              <input 
                                type="text" 
                                value={pricingState[item.key as keyof typeof pricingState]} 
                                onChange={(e) => setPricingState({...pricingState, [item.key]: e.target.value})}
                                className="w-full px-2 py-1.5 border border-[#c6c6c8] rounded text-sm text-[#1c1c1e] font-bold focus:outline-none focus:border-[#007aff]"
                              />
                            ) : (
                              <p className="text-sm font-bold text-[#1c1c1e]">{pricingState[item.key as keyof typeof pricingState]}</p>
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
              <div style={{ padding: 40, textAlign: "center", color: "#8e8e93" }}>
                No jobs found.
              </div>
            )}
            {activeTab === "jobs" && selectedEmployerId && data.jobs.filter((j: any) => j.employer_id === selectedEmployerId).length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#8e8e93" }}>
                This employer has no jobs.
              </div>
            )}
          </div>
          </div>
          )}
        </main>
      </div>

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
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1c1c1e", marginBottom: 6 }}>Admin Password Required</label>
                <input 
                  type="password" 
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              {deleteError && <p style={{ color: "#dc2626", margin: 0, fontSize: 13 }}>{deleteError}</p>}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <button 
                  type="button" 
                  onClick={() => setDeleteModal(null)}
                  disabled={deleteLoading}
                  style={{ background: "#f3f4f6", color: "#1c1c1e", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={deleteLoading || !adminPassword}
                  style={{ background: "#dc2626", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: (deleteLoading || !adminPassword) ? "not-allowed" : "pointer", opacity: (deleteLoading || !adminPassword) ? 0.5 : 1, display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Trash2 size={16} />
                  {deleteLoading ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </form>
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
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 500, color: "#1c1c1e" }}>Admin Password</label>
                <input type="password" required value={userActionPassword} onChange={(e: any) => setUserActionPassword(e.target.value)} placeholder="••••••••" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              {userActionError && <p style={{ margin: 0, fontSize: 13, color: "#ef4444" }}>{userActionError}</p>}
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <button type="button" onClick={() => { setApproveReqModal(null); setUserActionError(""); setUserActionPassword(""); }} style={{ flex: 1, padding: "10px", background: "#f3f4f6", border: "none", borderRadius: 10, color: "#1c1c1e", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={userActionLoading} style={{ flex: 1, padding: "10px", background: "#059669", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: userActionLoading ? "wait" : "pointer", opacity: userActionLoading ? 0.7 : 1 }}>
                  {userActionLoading ? "Approving..." : "Approve"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employer Modal */}
      {editModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: "0 16px" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: 18, fontWeight: 700, color: "#111827" }}>Edit Employer</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "#8e8e93" }}>Update business details and daily job post limit.</p>
            <form onSubmit={handleEditEmployer} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1c1c1e", marginBottom: 6 }}>Business Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1c1c1e", marginBottom: 6 }}>Business Type</label>
                <input
                  type="text"
                  value={editType}
                  onChange={e => setEditType(e.target.value)}
                  placeholder="e.g. Hotel"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              
              {/* Logo Upload */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1c1c1e", marginBottom: 6 }}>Business Profile Photo (Logo)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setEditLogoFile(e.target.files?.[0] || null)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px dashed #d1d5db", fontSize: 13, boxSizing: "border-box", background: "#f9fafb" }}
                />
                {editLogoFile && <p style={{ fontSize: 12, color: "#059669", marginTop: 4 }}>Selected: {editLogoFile.name}</p>}
              </div>

              {/* Subscription Package */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1c1c1e", marginBottom: 6 }}>Subscription Package</label>
                <select
                  value={editPackageId}
                  onChange={e => setEditPackageId(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
                >
                  <option value="">No Package (Free / Manual Later)</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — {pkg.duration_days} Days ({pkg.price} ETB)
                    </option>
                  ))}
                </select>
              </div>

              {/* Extend Days */}
              {editPackageId && (
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1c1c1e", marginBottom: 6 }}>Extend Package Duration (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={editExtendDays}
                    onChange={e => setEditExtendDays(parseInt(e.target.value) || 0)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
              )}

              {/* Daily Post Limit */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1c1c1e", marginBottom: 8 }}>Daily Job Post Limit</label>
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
                        border: editPostLimit === opt.value ? "2px solid #1c1c1e" : "1px solid #d1d5db",
                        background: editPostLimit === opt.value ? "#f1f5f9" : "#f9fafb",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 700, color: editPostLimit === opt.value ? "#1c1c1e" : "#374151" }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: editPostLimit === opt.value ? "#1c1c1e" : "#9ca3af", marginTop: 2 }}>{opt.description}</div>
                    </button>
                  ))}
                </div>
              </div>
              {editError && <p style={{ color: "#dc2626", margin: 0, fontSize: 13 }}>{editError}</p>}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  disabled={editLoading}
                  style={{ background: "#f3f4f6", color: "#1c1c1e", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading || !editName.trim()}
                  style={{ background: "#1c1c1e", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Pencil size={14} />
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
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
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1c1c1e", marginBottom: 6 }}>Admin Password Required</label>
                <input 
                  type="password" 
                  value={userActionPassword}
                  onChange={(e) => setUserActionPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              {userActionError && <p style={{ color: "#dc2626", margin: 0, fontSize: 13 }}>{userActionError}</p>}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <button 
                  type="button" 
                  onClick={() => setDeleteUserModal(null)}
                  disabled={userActionLoading}
                  style={{ background: "#f3f4f6", color: "#1c1c1e", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={userActionLoading || !userActionPassword}
                  style={{ background: "#dc2626", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: (userActionLoading || !userActionPassword) ? "not-allowed" : "pointer", opacity: (userActionLoading || !userActionPassword) ? 0.5 : 1, display: "flex", alignItems: "center", gap: 8 }}
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
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1c1c1e", marginBottom: 6 }}>Admin Password Required</label>
                <input 
                  type="password" 
                  value={userActionPassword}
                  onChange={(e) => setUserActionPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              {userActionError && <p style={{ color: "#dc2626", margin: 0, fontSize: 13 }}>{userActionError}</p>}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <button 
                  type="button" 
                  onClick={() => setDeleteSubAdminModal(null)}
                  disabled={userActionLoading}
                  style={{ background: "#f3f4f6", color: "#1c1c1e", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={userActionLoading || !userActionPassword}
                  style={{ background: "#dc2626", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: (userActionLoading || !userActionPassword) ? "not-allowed" : "pointer", opacity: (userActionLoading || !userActionPassword) ? 0.5 : 1, display: "flex", alignItems: "center", gap: 8 }}
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
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1c1c1e", marginBottom: 6 }}>Admin Password Required</label>
                <input 
                  type="password" 
                  value={userActionPassword}
                  onChange={(e) => setUserActionPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              {userActionError && <p style={{ color: "#dc2626", margin: 0, fontSize: 13 }}>{userActionError}</p>}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <button 
                  type="button" 
                  onClick={() => setBanUserModal(null)}
                  disabled={userActionLoading}
                  style={{ background: "#f3f4f6", color: "#1c1c1e", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={userActionLoading || !userActionPassword}
                  style={{ background: banUserModal.is_banned ? "#10b981" : "#ef4444", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: (userActionLoading || !userActionPassword) ? "not-allowed" : "pointer", opacity: (userActionLoading || !userActionPassword) ? 0.5 : 1, display: "flex", alignItems: "center", gap: 8 }}
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
                <span style={{
                  padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 700,
                  textTransform: "uppercase",
                  background: viewingJob.status === "active" ? "#d1fae5" : viewingJob.status === "closed" ? "#fee2e2" : "#fef3c7",
                  color: viewingJob.status === "active" ? "#065f46" : viewingJob.status === "closed" ? "#991b1b" : "#92400e"
                }}>
                  {viewingJob.status === "active" ? "Live (Active)" : viewingJob.status === "closed" ? "Closed" : "Under Review (Paused)"}
                </span>
                <h3 style={{ margin: "8px 0 2px 0", fontSize: 20, fontWeight: 800, color: "#111827" }}>{viewingJob.title}</h3>
                <p style={{ margin: 0, fontSize: 13, color: "#1c1c1e", fontWeight: 600 }}>
                  {Array.isArray(viewingJob.employers) ? viewingJob.employers[0]?.business_name : viewingJob.employers?.business_name || "Employer"}
                </p>
              </div>
              <button
                onClick={() => setViewingJob(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9ca3af", fontWeight: "bold" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 14, color: "#1c1c1e" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "#f9fafb", padding: 12, borderRadius: 8 }}>
                <div>
                  <span style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", fontWeight: 600 }}>Category</span>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{viewingJob.category}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", fontWeight: 600 }}>Job Type</span>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{viewingJob.job_type || "—"}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", fontWeight: 600 }}>Location</span>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{viewingJob.neighborhood || viewingJob.location}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", fontWeight: 600 }}>Salary</span>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>
                    {viewingJob.salary_min === -1 
                      ? "Per Company Scale" 
                      : viewingJob.salary_min === -2 
                      ? "Negotiable" 
                      : viewingJob.salary_min === viewingJob.salary_max
                      ? `${viewingJob.salary_min.toLocaleString()} ${viewingJob.currency || "ETB"}`
                      : `${viewingJob.salary_min.toLocaleString()} - ${viewingJob.salary_max.toLocaleString()} ${viewingJob.currency || "ETB"}`}
                  </div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 4 }}>Required Experience</span>
                <span style={{ background: "#f1f5f9", color: "#1e40af", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                  {viewingJob.requirements?.experience || "Entry Level"}
                </span>
              </div>

              <div>
                <span style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 4 }}>Job Description</span>
                <div style={{ background: "#f9fafb", padding: 12, borderRadius: 8, whiteSpace: "pre-wrap", lineHeight: 1.5, fontSize: 13, border: "1px solid #e5e7eb" }}>
                  {viewingJob.description || viewingJob.full_description}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", fontWeight: 600 }}>Deadline</span>
                <div style={{ fontWeight: 600, marginTop: 2 }}>{new Date(viewingJob.deadline).toLocaleDateString()}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24, borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
              {viewingJob.status === "active" ? (
                <button
                  onClick={async () => {
                    await handleJobStatus(viewingJob.id, "pending");
                    setViewingJob((prev: any) => prev ? { ...prev, status: "pending" } : null);
                  }}
                  disabled={!!loading}
                  style={{ background: "#f59e0b", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Pause Job
                </button>
              ) : (
                <button
                  onClick={async () => {
                    await handleJobStatus(viewingJob.id, "active");
                    setViewingJob((prev: any) => prev ? { ...prev, status: "active" } : null);
                  }}
                  disabled={!!loading}
                  style={{ background: "#059669", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Activate Job
                </button>
              )}

              {viewingJob.status !== "closed" && (
                <button
                  onClick={async () => {
                    await handleJobStatus(viewingJob.id, "closed");
                    setViewingJob((prev: any) => prev ? { ...prev, status: "closed" } : null);
                  }}
                  disabled={!!loading}
                  style={{ background: "#dc2626", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Close Job
                </button>
              )}

              {(viewingJob.status === "closed" || viewingJob.status === "expired") && (
                <button
                  onClick={() => { setRepostModal({ id: viewingJob.id, title: viewingJob.title }); setRepostDeadline(""); setRepostError(""); }}
                  disabled={!!loading}
                  style={{ background: "#0f172a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Repost Job
                </button>
              )}

              <button
                type="button"
                onClick={() => setViewingJob(null)}
                style={{ background: "#f3f4f6", color: "#1c1c1e", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
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
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1c1c1e", marginBottom: 6 }}>New Deadline</label>
                <input
                  type="date"
                  value={repostDeadline}
                  onChange={(e) => setRepostDeadline(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              {repostError && <p style={{ color: "#dc2626", margin: 0, fontSize: 13 }}>{repostError}</p>}
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setRepostModal(null)}
                  disabled={repostLoading}
                  style={{ background: "#f3f4f6", color: "#1c1c1e", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={repostLoading || !repostDeadline}
                  style={{ background: "#0f172a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: (repostLoading || !repostDeadline) ? "not-allowed" : "pointer", opacity: (repostLoading || !repostDeadline) ? 0.5 : 1 }}
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
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, width: "100%", maxWidth: 400, border: "1px solid #e5e7eb", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 8, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: "1px solid #d1fae5" }}>
              <CheckCircle size={24} strokeWidth={2.5} />
            </div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 20, fontWeight: 700, color: "#111827" }}>Employer Registered</h3>
            <p style={{ margin: "0 0 24px 0", fontSize: 14, color: "#4b5563" }}><strong>{authNumberResult.name}</strong> has been successfully added to the platform.</p>
            
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "24px", marginBottom: 16 }}>
              <p style={{ margin: "0 0 12px 0", fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Authorization Code</p>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#111827", letterSpacing: "0.2em", fontFamily: "monospace" }}>{authNumberResult.number}</div>
              <p style={{ margin: "12px 0 0 0", fontSize: 12, color: "#6b7280" }}>Share this code with the employer</p>
            </div>

            <div style={{ background: "#fff7ed", border: "1px solid #ffedd5", borderRadius: 8, padding: "12px 16px", marginBottom: 24, textAlign: "left", display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <div style={{ color: "#ea580c", marginTop: "2px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "#9a3412", lineHeight: 1.4 }}>This code will not be shown again. Please save or send it to the employer immediately.</p>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => { 
                  navigator.clipboard.writeText(authNumberResult.number); 
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb", background: copied ? "#f0fdf4" : "#fff", color: copied ? "#166534" : "#374151", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                {copied ? (
                  <><Check size={16} /> Copied</>
                ) : (
                  <><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy Code</>
                )}
              </button>
              <button
                onClick={() => setAuthNumberResult(null)}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#111827", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
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
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, #1c1c1e, #3a3a3c)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Users style={{ width: 22, height: 22, color: "#fff" }} />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: 0 }}>Admin User Management</h3>
                <p style={{ fontSize: 13, color: "#8e8e93", margin: 0, marginTop: 2 }}>Create sub-admins and control their permissions</p>
              </div>
              {isSuperAdmin && (
                <button
                  onClick={() => { setShowSubAdminForm(!showSubAdminForm); setSubAdminError(""); setSubAdminSuccess(""); }}
                  style={{ marginLeft: "auto", padding: "8px 14px", borderRadius: 8, border: "none", background: showSubAdminForm ? "#f1f5f9" : "#1c1c1e", color: showSubAdminForm ? "#374151" : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
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
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: 20, marginBottom: 20 }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>New Admin Details</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Username</label>
                    <CustomInput type="text" placeholder="e.g. john_admin" value={newSubUsername} onChange={(e: any) => setNewSubUsername(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Password</label>
                    <CustomInput type="password" placeholder="Set a password" value={newSubPassword} onChange={(e: any) => setNewSubPassword(e.target.value)} />
                  </div>
                </div>
                {subAdminError && <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#dc2626", fontSize: 13, borderRadius: 8, marginBottom: 12, border: "1px solid #fecaca" }}>{subAdminError}</div>}
                <button type="submit" disabled={subAdminLoading} style={{ width: "100%", padding: "11px", borderRadius: 10, border: "none", background: "#22c55e", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: subAdminLoading ? 0.7 : 1 }}>
                  {subAdminLoading ? "Creating..." : "Create Admin"}
                </button>
              </form>
            )}

            {subAdminSuccess && (
              <div style={{ padding: "10px 14px", background: "#f0fdf4", color: "#16a34a", fontSize: 13, borderRadius: 10, marginBottom: 16, border: "1px solid #bbf7d0", fontWeight: 600 }}>
                ✓ {subAdminSuccess}
              </div>
            )}

            {/* Sub-admin list */}
            {subAdmins.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
                <Users style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.4 }} />
                <p style={{ fontSize: 14, fontWeight: 500 }}>No sub-admins yet</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Click "New Admin" to create one</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {subAdmins.map((admin) => {
                  const PERMS: { key: keyof AdminPermissions; label: string; desc: string }[] = [
                    { key: "manageEmployers", label: "Manage Employers", desc: "Approve, reject, edit employers" },
                    { key: "manageJobs", label: "Manage Jobs", desc: "Moderate job postings" },
                    { key: "manageUsers", label: "Manage Users", desc: "Ban and delete job seekers" },
                    { key: "manageConfiguration", label: "Manage Configuration", desc: "Edit FAQs, pricing, templates" },
                    { key: "manageReports", label: "View Reports & Analytics", desc: "Access vacancy, growth, and package reports" },
                  ];
                  return (
                    <div key={admin.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
                      {/* Admin card header */}
                      <div
                        onClick={() => setExpandedSubAdmins(prev => ({ ...prev, [admin.id]: !prev[admin.id] }))}
                        style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, borderBottom: expandedSubAdmins[admin.id] ? "1px solid #f1f5f9" : "none", cursor: "pointer" }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{admin.username[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>{admin.username}</p>
                          <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, marginTop: 1 }}>Sub Admin · Created {new Date(admin.createdAt).toLocaleDateString()}</p>
                        </div>
                        {isSuperAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteSubAdminModal({ id: admin.id, username: admin.username });
                              setUserActionPassword("");
                              setUserActionError("");
                            }}
                            style={{ marginLeft: "auto", padding: "6px 10px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {/* Permissions toggles */}
                      {expandedSubAdmins[admin.id] && (
                        <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 0 }}>
                          {PERMS.map((p, idx) => (
                            <div key={p.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: idx < PERMS.length - 1 ? "1px solid #f8fafc" : "none" }}>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>{p.label}</p>
                                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, marginTop: 2 }}>{p.desc}</p>
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
                                  background: admin.permissions[p.key] ? "#22c55e" : "#d1d5db",
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

