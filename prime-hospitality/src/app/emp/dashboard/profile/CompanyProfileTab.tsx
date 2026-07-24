"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { getEmployerProfile, updateEmployerProfile, EmployerProfileData } from "./actions";
import { monogramPalette, monogramLetter } from "@/components/EmployerAvatar";

const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const OTHER_TYPE_VALUE = "__other__";

const EMPTY: EmployerProfileData = {
  businessName: "",
  businessType: "",
  description: "",
  logoUrl: null,
  businessTypes: [],
};

const STYLES = `
  .cpt-card {
    background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04); padding: 28px;
  }
  .cpt-cols { display: grid; grid-template-columns: 1fr; gap: 28px; }
  @media (min-width: 760px) { .cpt-cols { grid-template-columns: 180px 1fr; } }

  .cpt-avatar-wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .cpt-avatar {
    position: relative; width: 96px; height: 96px; border-radius: 20px;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; flex-shrink: 0; cursor: pointer;
  }
  .cpt-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .cpt-avatar .letter {
    font-family: ui-serif, Georgia, Cambria, "Times New Roman", serif;
    font-weight: 500; font-size: 42px; line-height: 1;
  }
  .cpt-avatar-overlay {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    flex-direction: column; gap: 4px; background: rgba(15,23,42,0.55); color: #fff;
    font-size: 11px; font-weight: 700; opacity: 0; transition: opacity .15s ease; cursor: pointer;
  }
  .cpt-avatar:hover .cpt-avatar-overlay { opacity: 1; }
  .cpt-remove-link {
    border: none; background: none; color: #ef4444; font-size: 12.5px; font-weight: 600;
    cursor: pointer; font-family: inherit; padding: 0;
  }
  .cpt-remove-link:hover { text-decoration: underline; }
  .cpt-avatar-error { font-size: 11.5px; color: #dc2626; font-weight: 600; text-align: center; max-width: 140px; }

  .cpt-fields { display: flex; flex-direction: column; gap: 18px; }
  .cpt-field { display: flex; flex-direction: column; gap: 6px; }
  .cpt-label { font-size: 12.5px; font-weight: 600; color: #334155; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .cpt-counter { font-size: 11px; font-weight: 600; color: #94a3b8; }

  .cpt-input, .cpt-select, .cpt-textarea {
    width: 100%; border: 1px solid #dbe3ec; border-radius: 10px; padding: 10px 12px;
    font-size: 13.5px; color: #0f172a; font-family: inherit; background: #fff;
    transition: border-color .15s ease, box-shadow .15s ease;
  }
  .cpt-input:focus, .cpt-select:focus, .cpt-textarea:focus {
    outline: none; border-color: #0284c7; box-shadow: 0 0 0 3px rgba(2,132,199,0.12);
  }
  .cpt-textarea { resize: vertical; min-height: 110px; line-height: 1.55; }
  .cpt-select { appearance: none; -webkit-appearance: none; cursor: pointer; padding-right: 34px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 12px center;
  }
  .cpt-error-text { font-size: 11.5px; font-weight: 600; color: #dc2626; margin: 0; }

  .cpt-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
  .cpt-btn-save {
    padding: 10px 22px; border: none; background: #0284c7; color: #fff;
    font-size: 13.5px; font-weight: 700; border-radius: 10px; cursor: pointer;
    display: inline-flex; align-items: center; gap: 8px; transition: background .15s ease;
    font-family: inherit; box-shadow: 0 1px 2px rgba(2,132,199,0.3);
  }
  .cpt-btn-save:hover { background: #0369a1; }
  .cpt-btn-save:disabled { opacity: .6; cursor: not-allowed; }

  .cpt-banner {
    display: flex; align-items: center; gap: 8px; border-radius: 10px;
    padding: 11px 14px; font-size: 13px; font-weight: 600; margin-bottom: 16px;
  }
  .cpt-banner.success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; }
  .cpt-banner.error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }

  @keyframes cpt-spin { to { transform: rotate(360deg); } }
  .cpt-spin { animation: cpt-spin 1s linear infinite; }
`;

export default function CompanyProfileTab() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<EmployerProfileData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const [businessName, setBusinessName] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [customType, setCustomType] = useState("");
  const [description, setDescription] = useState("");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const applyProfile = useCallback((profile: EmployerProfileData) => {
    setData(profile);
    setBusinessName(profile.businessName);
    setDescription(profile.description);

    const knownNames = profile.businessTypes.map((t) => t.name);
    if (profile.businessType && !knownNames.includes(profile.businessType)) {
      setSelectedType(profile.businessType);
    } else {
      setSelectedType(profile.businessType || "");
    }
    setCustomType("");
  }, []);

  const load = useCallback(async () => {
    try {
      const profile = await getEmployerProfile();
      applyProfile(profile);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load company profile.");
    } finally {
      setLoading(false);
    }
  }, [applyProfile]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  const dropdownOptions = (() => {
    const names = data.businessTypes.map((t) => t.name);
    if (data.businessType && !names.includes(data.businessType)) names.unshift(data.businessType);
    return names;
  })();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setAvatarError("Image must be smaller than 5MB.");
      return;
    }

    setAvatarError(null);
    setRemoveLogo(false);
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setAvatarError(null);
    setRemoveLogo(true);
  };

  const currentLogoSrc = logoPreviewUrl || (!removeLogo ? data.logoUrl : null);
  const hasPhoto = !!currentLogoSrc;

  const effectiveBusinessType = selectedType === OTHER_TYPE_VALUE ? customType.trim() : selectedType;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!businessName.trim()) { setErrorMsg("Business name is required."); return; }
    if (!effectiveBusinessType) { setErrorMsg("Business type is required."); return; }
    if (description.length > MAX_DESCRIPTION_LENGTH) { setErrorMsg(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`); return; }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.set("businessName", businessName.trim());
      formData.set("businessType", effectiveBusinessType);
      formData.set("description", description.trim());
      if (logoFile) formData.set("logo", logoFile);
      if (removeLogo) formData.set("removeLogo", "true");

      const res = await updateEmployerProfile(formData);
      if (!res.success) {
        setErrorMsg(res.error);
        return;
      }

      setSuccessNote("Company profile updated.");
      setTimeout(() => setSuccessNote(null), 4000);
      setLogoFile(null);
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
      setLogoPreviewUrl(null);
      setRemoveLogo(false);
      await load();
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <style>{STYLES}</style>
        <div style={{ textAlign: "center", color: "#94a3b8", padding: "56px 0", fontSize: 14 }}>Loading your company profile…</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <style>{STYLES}</style>

      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-.02em" }}>Company Profile</h2>
        <p style={{ fontSize: 13, color: "#64748b", margin: "5px 0 0 0" }}>
          This is how your business appears to job seekers across the app.
        </p>
      </div>

      {successNote && (
        <div className="cpt-banner success"><CheckCircle2 size={16} /> {successNote}</div>
      )}
      {errorMsg && (
        <div className="cpt-banner error"><AlertTriangle size={16} /> {errorMsg}</div>
      )}

      <form className="cpt-card" onSubmit={handleSubmit}>
        <div className="cpt-cols">
          <div className="cpt-avatar-wrap">
            <div
              className="cpt-avatar"
              style={hasPhoto ? undefined : { background: `linear-gradient(135deg, ${monogramPalette(businessName).from}, ${monogramPalette(businessName).to})` }}
              onClick={() => fileInputRef.current?.click()}
            >
              {hasPhoto ? (
                <img src={currentLogoSrc!} alt="" />
              ) : (
                <span className="letter" style={{ color: monogramPalette(businessName).letter }}>{monogramLetter(businessName)}</span>
              )}
              <div className="cpt-avatar-overlay">
                <Camera size={18} />
                Change
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
            {hasPhoto && (
              <button type="button" className="cpt-remove-link" onClick={handleRemovePhoto}>
                Remove photo
              </button>
            )}
            {avatarError && <p className="cpt-avatar-error">{avatarError}</p>}
          </div>

          <div className="cpt-fields">
            <div className="cpt-field">
              <label className="cpt-label">Business Name</label>
              <input
                className="cpt-input"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Skylight Hotel"
              />
            </div>

            <div className="cpt-field">
              <label className="cpt-label">Business Type</label>
              <select
                className="cpt-select"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="" disabled>Select a business type</option>
                {dropdownOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
                <option value={OTHER_TYPE_VALUE}>Other (specify)</option>
              </select>
            </div>

            {selectedType === OTHER_TYPE_VALUE && (
              <div className="cpt-field">
                <label className="cpt-label">Custom Business Type</label>
                <input
                  className="cpt-input"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="e.g. Cloud Kitchen"
                />
              </div>
            )}

            <div className="cpt-field">
              <label className="cpt-label">
                About / What You Do
                <span className="cpt-counter">{description.length}/{MAX_DESCRIPTION_LENGTH}</span>
              </label>
              <textarea
                className="cpt-textarea"
                value={description}
                maxLength={MAX_DESCRIPTION_LENGTH}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell job seekers a bit about your business — what you do, your atmosphere, what makes you a great place to work."
              />
            </div>
          </div>
        </div>

        <div className="cpt-footer">
          <button type="submit" className="cpt-btn-save" disabled={saving}>
            {saving && <Loader2 size={15} className="cpt-spin" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
