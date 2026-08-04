"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { updateCv, fetchProfile } from "@/lib/api";
import { useTelegram } from "@/hooks/useTelegram";
import { useT } from "@/lib/i18n";

interface CvUploadContextType {
  isUploadingCv: boolean;
  cvUploadError: string | null;
  uploadCv: (file: File) => Promise<void>;
}

const CvUploadContext = createContext<CvUploadContextType | undefined>(undefined);

export function CvUploadProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const { user, initData } = useTelegram();
  const [isUploadingCv, setIsUploadingCv] = useState(false);
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);

  const uploadCv = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      window.dispatchEvent(new CustomEvent("cvToast", { detail: { type: "error", message: t("app.cvTooLarge") } }));
      return;
    }
    if (!file.name.endsWith(".pdf") && !file.name.endsWith(".doc") && !file.name.endsWith(".docx")) {
      window.dispatchEvent(new CustomEvent("cvToast", { detail: { type: "error", message: t("app.cvWrongType") } }));
      return;
    }

    setIsUploadingCv(true);
    setCvUploadError(null);

    try {
      const telegramId = user?.id || Date.now();
      const fileExt = file.name.split(".").pop();
      const timestamp = Date.now();
      const fileName = `${telegramId}_${timestamp}.${fileExt}`;
      const filePath = `cvs/${fileName}`;

      console.log("[CV Upload] Uploading to resumes storage...");
      // No `upsert` — anon clients have no UPDATE policy on storage.objects, and the
      // upsert path is rejected outright ("new row violates row-level security policy")
      // even when the name is free. The timestamp above already keeps names unique.
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Store the storage path, not a URL — the resumes bucket is private and
      // reads are served through short-lived signed URLs minted server-side.
      const cvUrl = filePath;
      console.log("[CV Upload] Success! Stored path:", cvUrl);

      // Update profile in DB via Edge Function
      await updateCv({ initData, cvUrl });
      
      // Dispatch events to tell ProfileScreen to refresh and show toast
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("cvUploadSuccess"));
        window.dispatchEvent(new CustomEvent("cvToast", { detail: { type: "success", message: t("app.cvUploadedSuccess") } }));
      }
    } catch (err: any) {
      console.error("Error uploading CV:", err);
      setCvUploadError(err.message || t("app.cvUploadGenericError"));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cvToast", { detail: { type: "error", message: err.message || t("app.cvUploadGenericError") } }));
      }
    } finally {
      setIsUploadingCv(false);
    }
  };

  return (
    <CvUploadContext.Provider value={{ isUploadingCv, cvUploadError, uploadCv }}>
      {children}
    </CvUploadContext.Provider>
  );
}

export function useCvUpload() {
  const context = useContext(CvUploadContext);
  if (context === undefined) {
    throw new Error("useCvUpload must be used within a CvUploadProvider");
  }
  return context;
}
