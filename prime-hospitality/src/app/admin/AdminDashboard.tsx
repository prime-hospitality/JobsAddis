"use client";

import { useState } from "react";
import { approveEmployer, rejectEmployer, toggleUserBan, toggleJobStatus, logoutAdmin, addEmployer, deleteEmployer, updateEmployer, adminUpdateEmployerLogo, deleteUser } from "./actions";
import { Trash2, Pencil, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Tab = "employers" | "jobs" | "users";

export default function AdminDashboard({ initialData }: { initialData: any }) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<Tab>("employers");
  const [selectedEmployerId, setSelectedEmployerId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const [newTelegramId, setNewTelegramId] = useState("");
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newBusinessType, setNewBusinessType] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [deleteUserModal, setDeleteUserModal] = useState<{ id: string; name: string } | null>(null);
  const [banUserModal, setBanUserModal] = useState<{ id: string; name: string; is_banned: boolean } | null>(null);
  const [userActionPassword, setUserActionPassword] = useState("");
  const [userActionLoading, setUserActionLoading] = useState(false);
  const [userActionError, setUserActionError] = useState("");

  const [editModal, setEditModal] = useState<{ id: string; name: string; type: string; postLimit: number } | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editPostLimit, setEditPostLimit] = useState<number>(3);
  const [editLoading, setEditLoading] = useState(false);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editError, setEditError] = useState("");
  const [viewingJob, setViewingJob] = useState<any | null>(null);

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
      const res = await updateEmployer(editModal.id, editName, editType, editPostLimit);
      
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

      const res = await addEmployer(parsedTelegramId, newBusinessName, newBusinessType);
      if (res.success && res.employer) {
        setData((prev: any) => ({
          ...prev,
          employers: [res.employer, ...prev.employers],
          users: prev.users.filter((u: any) => u.telegram_id !== parsedTelegramId)
        }));
        setNewTelegramId("");
        setNewBusinessName("");
        setNewBusinessType("");
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
        users: prev.users.map((u: any) => u.id === banUserModal.id ? { ...u, is_banned: !banUserModal.is_banned } : u)
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
      if (!res.success) {
        setUserActionError(res.error || "Failed to delete user");
        return;
      }
      setData((prev: any) => ({
        ...prev,
        users: prev.users.filter((u: any) => u.id !== deleteUserModal.id),
        employers: prev.employers.filter((e: any) => e.user_id !== deleteUserModal.id),
      }));
      setDeleteUserModal(null);
      setUserActionPassword("");
    } catch (err: any) {
      setUserActionError(err.message || "Failed to delete user");
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleJobStatus = async (id: string, status: "active" | "closed" | "pending") => {
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

  const handleLogout = async () => {
    await logoutAdmin();
    window.location.reload();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="m-0 text-lg md:text-xl font-bold text-gray-900">Jobs Addis Admin</h1>
        <button onClick={handleLogout} className="bg-transparent border border-gray-300 px-3 py-1.5 md:px-4 md:py-2 rounded-lg cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors">Logout</button>
      </header>

      {/* Main Layout */}
      <div className="flex flex-col md:flex-row max-w-7xl mx-auto p-4 md:p-8 gap-6 md:gap-8">
        
        {/* Sidebar Nav */}
        <aside className="w-full md:w-[200px] shrink-0">
          <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {(["employers", "jobs", "users"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedEmployerId(null); }}
                className={`text-center md:text-left px-4 py-2.5 rounded-lg font-medium capitalize whitespace-nowrap transition-colors ${
                  activeTab === tab ? "bg-sky-100 text-sky-700 font-semibold" : "bg-transparent text-gray-600 hover:bg-gray-100"
                }`}
                style={{ border: "none", cursor: "pointer" }}
              >
                {tab}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-4 md:p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="m-0 text-lg md:text-xl font-semibold capitalize text-gray-800">
              {activeTab === "jobs" && selectedEmployerId ? "Jobs by Employer" : `${activeTab} Management`}
            </h2>
            {activeTab === "jobs" && selectedEmployerId && (
              <button 
                onClick={() => setSelectedEmployerId(null)} 
                className="bg-transparent border border-gray-300 px-3 py-1.5 rounded-lg cursor-pointer text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                ← Back to Employers
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            {activeTab === "employers" && (
              <div style={{ padding: "16px 24px", background: "#f3f4f6", borderBottom: "1px solid #e5e7eb" }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600, color: "#374151" }}>Pre-approve / Add New Employer</h3>
                <form onSubmit={handleAddEmployer} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "#4b5563" }}>Telegram ID</label>
                    <input 
                      type="number" 
                      value={newTelegramId} 
                      onChange={e => setNewTelegramId(e.target.value)} 
                      required 
                      placeholder="e.g. 123456789"
                      style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, width: 160 }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "#4b5563" }}>Business Name</label>
                    <input 
                      type="text" 
                      value={newBusinessName} 
                      onChange={e => setNewBusinessName(e.target.value)} 
                      required 
                      placeholder="e.g. Hilton Hotel"
                      style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, width: 200 }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "#4b5563" }}>Business Type</label>
                    <input 
                      type="text" 
                      value={newBusinessType} 
                      onChange={e => setNewBusinessType(e.target.value)} 
                      required 
                      placeholder="e.g. Hotel"
                      style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, width: 160 }}
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={formLoading}
                    style={{ 
                      background: "#0284c7", 
                      color: "#fff", 
                      border: "none", 
                      padding: "9px 16px", 
                      borderRadius: 6, 
                      cursor: "pointer", 
                      fontSize: 13, 
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center"
                    }}
                  >
                    {formLoading ? "Adding..." : "Add Employer"}
                  </button>
                </form>
                {formError && <p style={{ color: "#dc2626", margin: "8px 0 0 0", fontSize: 12 }}>{formError}</p>}
              </div>
            )}
            {/* Desktop Table View */}
            <div className="hidden md:block w-full">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {activeTab === "employers" && (
                      <>
                        <th style={{ padding: "12px 24px", color: "#6b7280", fontSize: 12, textTransform: "uppercase" }}>Business Name</th>
                        <th style={{ padding: "12px 24px", color: "#6b7280", fontSize: 12, textTransform: "uppercase" }}>Telegram ID</th>
                        <th style={{ padding: "12px 24px", color: "#6b7280", fontSize: 12, textTransform: "uppercase" }}>Post Limit</th>
                        <th style={{ padding: "12px 24px", color: "#6b7280", fontSize: 12, textTransform: "uppercase" }}>Status</th>
                        <th style={{ padding: "12px 24px", color: "#6b7280", fontSize: 12, textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                      </>
                    )}
                    {activeTab === "jobs" && !selectedEmployerId && (
                      <>
                        <th style={{ padding: "12px 24px", color: "#6b7280", fontSize: 12, textTransform: "uppercase" }}>Business Name</th>
                        <th style={{ padding: "12px 24px", color: "#6b7280", fontSize: 12, textTransform: "uppercase" }}>Total Jobs</th>
                        <th style={{ padding: "12px 24px", color: "#6b7280", fontSize: 12, textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                      </>
                    )}
                    {activeTab === "jobs" && selectedEmployerId && (
                      <>
                        <th style={{ padding: "12px 24px", color: "#6b7280", fontSize: 12, textTransform: "uppercase" }}>Job Title</th>
                        <th style={{ padding: "12px 24px", color: "#6b7280", fontSize: 12, textTransform: "uppercase" }}>Status</th>
                        <th style={{ padding: "12px 24px", color: "#6b7280", fontSize: 12, textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                      </>
                    )}
                    {activeTab === "users" && (
                      <>
                        <th style={{ padding: "12px 24px", color: "#6b7280", fontSize: 12, textTransform: "uppercase" }}>Name</th>
                        <th style={{ padding: "12px 24px", color: "#6b7280", fontSize: 12, textTransform: "uppercase" }}>Telegram ID</th>
                        <th style={{ padding: "12px 24px", color: "#6b7280", fontSize: 12, textTransform: "uppercase" }}>Role</th>
                        <th style={{ padding: "12px 24px", color: "#6b7280", fontSize: 12, textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {activeTab === "employers" && data.employers.map((item: any) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "16px 24px", fontWeight: 500 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {item.business_name}
                          <button
                            onClick={() => { setEditModal({ id: item.id, name: item.business_name, type: item.business_type || "", postLimit: item.daily_post_limit ?? 3 }); setEditName(item.business_name); setEditType(item.business_type || ""); setEditPostLimit(item.daily_post_limit ?? 3); setEditLogoFile(null); setEditError(""); }}
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", padding: "4px", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}
                            title="Edit employer"
                          >
                            <Pencil size={13} />
                          </button>
                        </span>
                      </td>
                      <td style={{ padding: "16px 24px", color: "#6b7280" }}>{item.users?.telegram_id || "—"}</td>
                      <td style={{ padding: "16px 24px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                          background: (item.daily_post_limit ?? 3) === -1 ? "#ede9fe" : "#eff6ff",
                          color: (item.daily_post_limit ?? 3) === -1 ? "#7c3aed" : "#0284c7",
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

                  {activeTab === "jobs" && !selectedEmployerId && data.employers.map((emp: any) => {
                    const jobCount = data.jobs.filter((j: any) => j.employer_id === emp.id).length;
                    if (jobCount === 0) return null;
                    return (
                      <tr key={emp.id} onClick={() => setSelectedEmployerId(emp.id)} style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }} className="hover:bg-gray-50 transition-colors">
                        <td style={{ padding: "16px 24px", fontWeight: 500 }}>{emp.business_name}</td>
                        <td style={{ padding: "16px 24px", color: "#6b7280" }}>{jobCount} Job{jobCount !== 1 && "s"}</td>
                        <td style={{ padding: "16px 24px", textAlign: "right" }}>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedEmployerId(emp.id); }} style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                            View Jobs
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {activeTab === "jobs" && selectedEmployerId && data.jobs.filter((j: any) => j.employer_id === selectedEmployerId).map((item: any) => (
                    <tr key={item.id} onClick={() => setViewingJob(item)} style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }} className="hover:bg-gray-50 transition-colors">
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
                      </td>
                    </tr>
                  ))}

                  {activeTab === "users" && data.users.map((item: any) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "16px 24px", fontWeight: 500 }}>{item.profiles?.full_name || "Unonboarded"} {item.is_banned && <span style={{ color: "red" }}>(Banned)</span>}</td>
                      <td style={{ padding: "16px 24px", color: "#6b7280" }}>{item.telegram_id}</td>
                      <td style={{ padding: "16px 24px", textTransform: "capitalize", color: "#6b7280" }}>{item.role}</td>
                      <td style={{ padding: "16px 24px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button
                            disabled={!!loading}
                            onClick={() => { setBanUserModal({ id: item.id, name: item.profiles?.full_name || "Unonboarded", is_banned: item.is_banned }); setUserActionPassword(""); setUserActionError(""); }}
                            style={{ background: item.is_banned ? "#10b981" : "#ef4444", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
                          >
                            {item.is_banned ? "Unban" : "Ban"}
                          </button>
                          <button
                            disabled={!!loading}
                            onClick={() => { setDeleteUserModal({ id: item.id, name: item.profiles?.full_name || "Unonboarded" }); setUserActionPassword(""); setUserActionError(""); }}
                            style={{ background: "transparent", color: "#ef4444", border: "none", padding: "6px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center" }}
                            title="Delete User"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col p-4 bg-gray-50/50">
              {activeTab === "employers" && data.employers.map((item: any) => (
                <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 mb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <h4 className="font-semibold text-gray-800 m-0">{item.business_name}</h4>
                        <button
                          onClick={() => { setEditModal({ id: item.id, name: item.business_name, type: item.business_type || "", postLimit: item.daily_post_limit ?? 3 }); setEditName(item.business_name); setEditType(item.business_type || ""); setEditPostLimit(item.daily_post_limit ?? 3); setEditLogoFile(null); setEditError(""); }}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", padding: "2px", display: "flex", alignItems: "center" }}
                          title="Edit employer"
                        >
                          <Pencil size={13} />
                        </button>
                      </span>
                      <p className="text-xs text-gray-500 m-0 mt-1 font-mono">ID: {item.users?.telegram_id || "—"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span style={{
                        padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 600,
                        background: item.status === "approved" ? "#d1fae5" : item.status === "rejected" ? "#fee2e2" : "#fef3c7",
                        color: item.status === "approved" ? "#065f46" : item.status === "rejected" ? "#991b1b" : "#92400e"
                      }}>{item.status}</span>
                      <span style={{
                        padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 600,
                        background: (item.daily_post_limit ?? 3) === -1 ? "#ede9fe" : "#eff6ff",
                        color: (item.daily_post_limit ?? 3) === -1 ? "#7c3aed" : "#0284c7",
                        border: `1px solid ${(item.daily_post_limit ?? 3) === -1 ? "#ddd6fe" : "#bfdbfe"}`,
                      }}>
                        {getPostLimitLabel(item.daily_post_limit ?? 3)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end mt-2 pt-3 border-t border-gray-100">
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

              {activeTab === "jobs" && !selectedEmployerId && data.employers.map((emp: any) => {
                const jobCount = data.jobs.filter((j: any) => j.employer_id === emp.id).length;
                if (jobCount === 0) return null;
                return (
                  <div key={emp.id} onClick={() => setSelectedEmployerId(emp.id)} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 mb-3 cursor-pointer">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-gray-800 m-0">{emp.business_name}</h4>
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 px-2 py-1 rounded-md">{jobCount} Job{jobCount !== 1 && "s"}</span>
                    </div>
                    <div className="flex justify-end mt-1">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedEmployerId(emp.id); }} className="bg-gray-100 text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-medium">
                        View Jobs
                      </button>
                    </div>
                  </div>
                );
              })}

              {activeTab === "jobs" && selectedEmployerId && data.jobs.filter((j: any) => j.employer_id === selectedEmployerId).map((item: any) => (
                <div key={item.id} onClick={() => setViewingJob(item)} style={{ cursor: "pointer" }} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 mb-3 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-gray-800 m-0">{item.title}</h4>
                    <span style={{
                      padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 600,
                      background: item.status === "active" ? "#d1fae5" : item.status === "closed" ? "#fee2e2" : "#fef3c7",
                      color: item.status === "active" ? "#065f46" : item.status === "closed" ? "#991b1b" : "#92400e"
                    }}>
                      {item.status === "active" ? "active" : item.status === "closed" ? "closed" : "under review"}
                    </span>
                  </div>
                  <div className="flex gap-2 justify-end mt-2 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                    {item.status === "active" && (
                      <button disabled={!!loading} onClick={() => handleJobStatus(item.id, "pending")} className="bg-amber-500 text-white border-none px-3 py-1.5 rounded-lg text-xs font-medium">Pause</button>
                    )}
                    {item.status !== "active" && (
                      <button disabled={!!loading} onClick={() => handleJobStatus(item.id, "active")} className="bg-emerald-600 text-white border-none px-3 py-1.5 rounded-lg text-xs font-medium">Set Active</button>
                    )}
                    {item.status !== "closed" && (
                      <button disabled={!!loading} onClick={() => handleJobStatus(item.id, "closed")} className="bg-red-600 text-white border-none px-3 py-1.5 rounded-lg text-xs font-medium">Close Job</button>
                    )}
                  </div>
                </div>
              ))}

              {activeTab === "users" && data.users.map((item: any) => (
                <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 mb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-800 m-0">
                        {item.profiles?.full_name || "Unonboarded"}
                        {item.is_banned && <span className="text-red-500 text-xs ml-2">(Banned)</span>}
                      </h4>
                      <p className="text-xs text-gray-500 m-0 mt-1 font-mono">ID: {item.telegram_id}</p>
                    </div>
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 px-2 py-1 rounded-md capitalize">{item.role}</span>
                  </div>
                  <div className="flex justify-end mt-2 pt-3 border-t border-gray-100 gap-2">
                    <button
                      disabled={!!loading}
                      onClick={() => { setBanUserModal({ id: item.id, name: item.profiles?.full_name || "Unonboarded", is_banned: item.is_banned }); setUserActionPassword(""); setUserActionError(""); }}
                      style={{ background: item.is_banned ? "#10b981" : "#ef4444" }}
                      className="text-white border-none px-3 py-1.5 rounded-lg text-xs font-medium"
                    >
                      {item.is_banned ? "Unban" : "Ban"}
                    </button>
                    <button
                      disabled={!!loading}
                      onClick={() => { setDeleteUserModal({ id: item.id, name: item.profiles?.full_name || "Unonboarded" }); setUserActionPassword(""); setUserActionError(""); }}
                      className="bg-transparent text-red-500 p-1.5 cursor-pointer flex items-center"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {activeTab !== "jobs" && data[activeTab].length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
                No {activeTab} found.
              </div>
            )}
            {activeTab === "jobs" && !selectedEmployerId && data.jobs.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
                No jobs found.
              </div>
            )}
            {activeTab === "jobs" && selectedEmployerId && data.jobs.filter((j: any) => j.employer_id === selectedEmployerId).length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
                This employer has no jobs.
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Delete Employer Modal */}
      {deleteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 400, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700, color: "#111827" }}>Delete Employer</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#4b5563", lineHeight: 1.5 }}>
              Are you sure you want to completely delete <strong>{deleteModal.name}</strong>? This action cannot be undone and will remove all their jobs.
            </p>
            <form onSubmit={handleDeleteEmployer} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Admin Password Required</label>
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
                  style={{ background: "#f3f4f6", color: "#374151", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
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

      {/* Edit Employer Modal */}
      {editModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "0 16px" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 420, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: 18, fontWeight: 700, color: "#111827" }}>Edit Employer</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "#6b7280" }}>Update business details and daily job post limit.</p>
            <form onSubmit={handleEditEmployer} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Business Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Business Type</label>
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
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Business Profile Photo (Logo)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setEditLogoFile(e.target.files?.[0] || null)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px dashed #d1d5db", fontSize: 13, boxSizing: "border-box", background: "#f9fafb" }}
                />
                {editLogoFile && <p style={{ fontSize: 12, color: "#059669", marginTop: 4 }}>Selected: {editLogoFile.name}</p>}
              </div>

              {/* Daily Post Limit */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Daily Job Post Limit</label>
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
                        border: editPostLimit === opt.value ? "2px solid #0284c7" : "1px solid #d1d5db",
                        background: editPostLimit === opt.value ? "#eff6ff" : "#f9fafb",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 700, color: editPostLimit === opt.value ? "#0284c7" : "#374151" }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: editPostLimit === opt.value ? "#0284c7" : "#9ca3af", marginTop: 2 }}>{opt.description}</div>
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
                  style={{ background: "#f3f4f6", color: "#374151", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading || !editName.trim()}
                  style={{ background: "#0284c7", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 400, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700, color: "#111827" }}>Delete User</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#4b5563", lineHeight: 1.5 }}>
              Are you sure you want to completely delete <strong>{deleteUserModal.name}</strong>? This action cannot be undone and will remove all their data including CV and applications.
            </p>
            <form onSubmit={handleDeleteUser} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Admin Password Required</label>
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
                  style={{ background: "#f3f4f6", color: "#374151", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 400, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 18, fontWeight: 700, color: "#111827" }}>{banUserModal.is_banned ? "Unban" : "Ban"} User</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#4b5563", lineHeight: 1.5 }}>
              Are you sure you want to {banUserModal.is_banned ? "unban" : "ban"} <strong>{banUserModal.name}</strong>?
            </p>
            <form onSubmit={handleToggleBan} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Admin Password Required</label>
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
                  style={{ background: "#f3f4f6", color: "#374151", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "0 16px" }}>
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
                <p style={{ margin: 0, fontSize: 13, color: "#0284c7", fontWeight: 600 }}>
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

            <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 14, color: "#374151" }}>
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
                <span style={{ background: "#eff6ff", color: "#1e40af", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
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

              <button
                type="button"
                onClick={() => setViewingJob(null)}
                style={{ background: "#f3f4f6", color: "#374151", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
