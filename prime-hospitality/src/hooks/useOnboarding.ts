import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { createProfile, ApiError } from "@/lib/api";
import { useTelegram } from "./useTelegram";

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface OnboardingState {
  step: OnboardingStep;
  selectedCategories: string[];
  contactShared: boolean | null;
  phoneNumber: string;
  experienceLevels: Record<string, string>;
  fullName: string;
  age: number | "";
  location: string;
  willingToRelocate: boolean;
  gender: "male" | "female" | "";
  cvFile: File | null;
  cvUploaded: boolean;
  isSubmitting: boolean;
  submitError: string | null;
}

const initialState: OnboardingState = {
  step: 1,
  selectedCategories: [],
  contactShared: null,
  phoneNumber: "",
  experienceLevels: {},
  fullName: "",
  age: "",
  location: "",
  willingToRelocate: false,
  gender: "",
  cvFile: null,
  cvUploaded: false,
  isSubmitting: false,
  submitError: null,
};

export function useOnboarding() {
  const { user, initData } = useTelegram();
  const [state, setState] = useState<OnboardingState>(initialState);

  // Keep refs so submitProfile always reads the latest values,
  // avoiding the stale-closure bug where initData is null at memo time.
  const initDataRef = useRef<string | null>(initData);
  const userRef = useRef(user);
  useEffect(() => { initDataRef.current = initData; }, [initData]);
  useEffect(() => { userRef.current = user; }, [user]);

  const updateState = useCallback(
    (updates: Partial<OnboardingState>) => {
      setState((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const setStep = useCallback((step: OnboardingStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const submitProfile = useCallback(async () => {
    setState((prev) => ({ ...prev, isSubmitting: true, submitError: null }));

    // Read from refs — always the latest value regardless of when this callback was created
    const currentInitData = initDataRef.current;
    const currentUser = userRef.current;

    try {
      let cvUrl: string | null = null;
      const telegramId = currentUser?.id || Date.now(); // fallback for dev

      // 1. Upload CV to Supabase Storage (NON-FATAL — skip if bucket missing or error)
      if (state.cvFile && state.cvUploaded) {
        try {
          const fileExt = state.cvFile.name.split(".").pop();
          const fileName = `${telegramId}-${Date.now()}.${fileExt}`;
          const filePath = `cvs/${fileName}`;

          console.log("[CV Upload] Attempting upload to bucket 'resumes', path:", filePath);

          const { error: uploadError } = await supabase.storage
            .from("resumes")
            .upload(filePath, state.cvFile);

          if (uploadError) {
            // Non-fatal: log and continue without CV
            console.warn("[CV Upload] Upload failed (non-fatal, continuing without CV):", uploadError.message);
            cvUrl = null;
          } else {
            const { data: publicUrlData } = supabase.storage
              .from("resumes")
              .getPublicUrl(filePath);
            cvUrl = publicUrlData.publicUrl;
            console.log("[CV Upload] Success! Public URL:", cvUrl);
          }
        } catch (cvErr) {
          // Non-fatal: network error during upload — continue without CV
          console.warn("[CV Upload] Network error (non-fatal, continuing without CV):", cvErr);
          cvUrl = null;
        }
      }

      // 2. Create profile via the secure Edge Function.
      console.log("[Profile] Calling create_profile edge function. initData present:", !!currentInitData);
      const result = await createProfile({
        initData: currentInitData,
        profileData: {
          fullName: state.fullName,
          age: state.age,
          location: state.location,
          willingToRelocate: state.willingToRelocate,
          gender: state.gender,
          contactShared: state.contactShared,
          phoneNumber: state.phoneNumber,
          selectedCategories: state.selectedCategories,
          experienceLevels: state.experienceLevels,
        },
        cvUrl,
      });

      console.log("[Profile] Edge function result:", result);
      // Success — advance to the success screen
      setStep(6);
    } catch (error: unknown) {
      console.error("[Onboarding] Submission error:", error);
      let message = "Failed to submit profile. Please try again.";
      if (error instanceof ApiError) {
        console.error("[Onboarding] ApiError — status:", error.statusCode, "message:", error.message);
        if (error.isDuplicate) {
          // Profile already exists — treat as success and move on
          setStep(6);
          return;
        }
        message = error.message || `Server error (${error.statusCode})`;
      } else if (error instanceof Error) {
        message = error.message;
      }
      setState((prev) => ({
        ...prev,
        submitError: message,
      }));
    } finally {
      setState((prev) => ({ ...prev, isSubmitting: false }));
    }
  }, [state]); // refs give us live access — no need to list initData/user as deps

  return {
    state,
    updateState,
    setStep,
    submitProfile,
  };
}
