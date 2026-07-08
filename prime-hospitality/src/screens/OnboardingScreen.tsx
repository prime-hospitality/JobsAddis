"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion, LazyMotion, domAnimation } from "framer-motion";
import { ArrowLeft, UploadCloud, CheckCircle, Smartphone, Lock, AlertTriangle, ChevronDown, Search } from "lucide-react";
import { useOnboarding, OnboardingStep } from "@/hooks/useOnboarding";
import { JobCategory } from "@/data/jobs";
import { LOCATIONS } from "@/data/locations";
import { useTelegram } from "@/hooks/useTelegram";
import { supabase } from "@/lib/supabase";

// --- Types ---
interface StepProps {
  state: ReturnType<typeof useOnboarding>["state"];
  updateState: ReturnType<typeof useOnboarding>["updateState"];
  onNext: () => void;
  config?: Record<string, string>;
}

// --- Main Component ---
export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const { state, updateState, setStep, submitProfile } = useOnboarding();
  const shouldReduceMotion = useReducedMotion();
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward
  const [config, setConfig] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase.from("onboarding_config").select("*");
      if (data) {
        const c: Record<string, string> = {};
        data.forEach((d: any) => c[d.key] = d.value);
        setConfig(c);
      }
    };
    loadConfig();
  }, []);

  const goNext = (targetStep: OnboardingStep) => {
    setDirection(1);
    setStep(targetStep);
  };

  const goBack = (targetStep: OnboardingStep) => {
    setDirection(-1);
    setStep(targetStep);
  };

  const handleFinalSubmit = async () => {
    await submitProfile();
    // After submitProfile finishes, it sets the step to 6 internally on success
  };

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? "100%" : "-100%",
      opacity: 0,
    }),
  };

  return (
    <LazyMotion features={domAnimation}>
      <div style={{ position: "relative", width: "100%", height: "100dvh", background: "transparent", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        
        {/* Progress Bar (Hide on Step 6) */}
        {state.step < 6 && (
          <div style={{ position: "absolute", top: "env(safe-area-inset-top, 0px)", left: 0, right: 0, height: 4, background: "var(--border)", zIndex: 50 }}>
            <motion.div
              initial={false}
              animate={{ width: `${(state.step / 5) * 100}%` }}
              transition={{ duration: 0.3 }}
              style={{ height: "100%", background: "var(--brand)" }}
            />
          </div>
        )}

        {/* Back Button (Hide on Step 1 and 6) */}
        {state.step > 1 && state.step < 6 && (
          <div style={{ position: "absolute", top: "max(72px, calc(env(safe-area-inset-top, 0px) + 32px))", left: 20, zIndex: 50 }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => goBack((state.step - 1) as OnboardingStep)}
              style={{
                width: 40, height: 40, borderRadius: 12,
                background: "var(--card)", border: "1px solid var(--border)",
                boxShadow: "var(--card-shadow)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
              }}
            >
              <ArrowLeft size={20} color="var(--text-primary)" />
            </motion.button>
          </div>
        )}

        <div style={{ flex: 1, position: "relative" }}>
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={state.step}
              custom={direction}
              variants={shouldReduceMotion ? {} : variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "flex", flexDirection: "column", overflowY: "auto", paddingBottom: 40 }}
            >
              {state.step === 1 && <Step1_JobField state={state} updateState={updateState} onNext={() => goNext(2)} config={config} />}
              {state.step === 2 && <Step2_Contact state={state} updateState={updateState} onNext={() => goNext(3)} config={config} />}
              {state.step === 3 && <Step3_Experience state={state} updateState={updateState} onNext={() => goNext(4)} config={config} />}
              {state.step === 4 && <Step4_Personal state={state} updateState={updateState} onNext={() => goNext(5)} config={config} />}
              {state.step === 5 && <Step5_CV state={state} updateState={updateState} onNext={handleFinalSubmit} config={config} />}
              {state.step === 6 && <Step6_Success state={state} onNext={onComplete} config={config} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </LazyMotion>
  );
}

// --- Step 1: Job Field Selection ---
const JOB_CATEGORIES_DATA = [
  { label: "Reception", emoji: "🛎️" },
  { label: "Waiter", emoji: "🍽️" },
  { label: "Chef", emoji: "👨‍🍳" },
  { label: "IT Officer", emoji: "💻" },
  { label: "Housekeeper", emoji: "🧹" },
  { label: "Steward", emoji: "🫧" },
  { label: "Cashier", emoji: "💳" },
  { label: "Executive Chef", emoji: "👑" },
  { label: "Sous Chef", emoji: "🧑‍🍳" },
  { label: "Barista", emoji: "☕" },
  { label: "Night Auditor", emoji: "🌙" },
  { label: "Guest Relations Officer", emoji: "🤝" },
  { label: "Reservations Agent", emoji: "📅" },
  { label: "Security", emoji: "🛡️" },
  { label: "Cook", emoji: "🍳" },
  { label: "Driver", emoji: "🚗" },
  { label: "Marketing & Sales", emoji: "📈" },
  { label: "F&B", emoji: "🍹" },
  { label: "Finance", emoji: "💰" },
  { label: "Cost Control", emoji: "📊" },
  { label: "Accountant", emoji: "🧮" },
  { label: "Bellboy", emoji: "🧳" },
  { label: "Maintenance", emoji: "🔧" },
  { label: "Painter", emoji: "🎨" },
  { label: "Spa Attendant", emoji: "💆" },
  { label: "Gym Trainer", emoji: "🏋️" },
  { label: "Lifeguard", emoji: "🛟" },
  { label: "Banquet", emoji: "🥂" },
  { label: "Other", emoji: "✨" },
];

function Step1_JobField({ state, updateState, onNext, config }: StepProps) {
  let JOB_CATEGORIES = [...JOB_CATEGORIES_DATA];
  try {
    if (config?.step1_categories) {
      JOB_CATEGORIES = JSON.parse(config.step1_categories);
    }
  } catch (e) {}

  const [shakeId, setShakeId] = React.useState<string | null>(null);
  const customCategory = state.selectedCategories.find(
    (c) => c === "Other" || !JOB_CATEGORIES.some((preset) => preset.label === c)
  );
  const [otherValue, setOtherValue] = React.useState(
    customCategory && customCategory !== "Other" ? customCategory : ""
  );
  const [showTip, setShowTip] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowTip(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  const toggleCategory = (label: string) => {
    const isOther = label === "Other";
    const hasCustom = !!state.selectedCategories.find(c => !JOB_CATEGORIES_DATA.some(p => p.label === c));
    const isSelected = isOther
      ? (state.selectedCategories.includes("Other") || hasCustom)
      : state.selectedCategories.includes(label);

    if (isSelected) {
      if (isOther) {
        const updated = state.selectedCategories.filter(
          (c) => JOB_CATEGORIES_DATA.some((p) => p.label === c) && c !== "Other"
        );
        updateState({ selectedCategories: updated });
        setOtherValue("");
      } else {
        updateState({ selectedCategories: state.selectedCategories.filter((c) => c !== label) });
      }
    } else {
      if (state.selectedCategories.length >= 3) {
        setShakeId(label);
        setTimeout(() => setShakeId(null), 500);
        return;
      }
      updateState({ selectedCategories: [...state.selectedCategories, label] });
    }
  };

  let otherWarning = "";
  if (otherValue.trim().length > 0) {
    const trimmed = otherValue.trim();
    if (trimmed.length < 3) {
      otherWarning = "Role name is too short. Please type a valid job.";
    } else if (trimmed.length > 40) {
      otherWarning = "Role name is too long. Keep it under 40 characters.";
    } else if (/[^a-zA-Z\s\-]/.test(trimmed)) {
      otherWarning = "Role name shouldn't contain numbers or special characters.";
    } else if (/^(.)\1{2,}$/i.test(trimmed.replace(/\s/g, ""))) {
      // All characters are the same repeated letter e.g. "ggg", "aaaa"
      otherWarning = "That doesn't look like a real job title. Please type a valid role.";
    } else if (/(.)\1{3,}/i.test(trimmed)) {
      // A single letter repeated 4+ times in a row e.g. "hooootel"
      otherWarning = "That doesn't look like a real job title. Please type a valid role.";
    } else if (trimmed.split("").every(c => c === trimmed[0] || c === " " || c === "-")) {
      // All letters are the same character
      otherWarning = "That doesn't look like a real job title. Please type a valid role.";
    }
  }

  const isOtherSelected = state.selectedCategories.includes("Other") || !!state.selectedCategories.find(c => !JOB_CATEGORIES_DATA.some(p => p.label === c));
  const isOtherValid = isOtherSelected ? (otherValue.trim().length > 0 && !otherWarning) : true;
  const canContinue = state.selectedCategories.length > 0 && isOtherValid;

  return (
    <div style={{ padding: "90px 16px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6, lineHeight: 1.2 }}>
        {config?.step1_title || config?.welcome_title || "What role are you looking for?"}
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>{config?.step1_subtitle || config?.welcome_subtitle || "Select up to 3 categories."}</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 4px", alignContent: "flex-start" }}>
        {JOB_CATEGORIES.map((cat) => {
          const selectedIndex = cat.label === "Other"
            ? state.selectedCategories.findIndex((c) => c === "Other" || !JOB_CATEGORIES_DATA.some((p) => p.label === c))
            : state.selectedCategories.indexOf(cat.label);
          const isSelected = selectedIndex !== -1;
          const isShaking = shakeId === cat.label;
          return (
            <motion.button
              key={cat.label}
              whileTap={{ scale: 0.95 }}
              animate={
                isShaking
                  ? { x: [-5, 5, -5, 5, 0] }
                  : cat.label === "Other" && state.selectedCategories.length === 0
                  ? { scale: [1, 1.06, 1], boxShadow: ["0 0 0px rgba(34,197,94,0)", "0 0 8px rgba(34,197,94,0.45)", "0 0 0px rgba(34,197,94,0)"] }
                  : {}
              }
              transition={
                isShaking
                  ? { duration: 0.3 }
                  : cat.label === "Other" && state.selectedCategories.length === 0
                  ? { duration: 1.8, repeat: Infinity, repeatDelay: 2 }
                  : {}
              }
              onClick={() => toggleCategory(cat.label)}
              style={{
                background: isSelected 
                  ? "rgba(230, 126, 34, 0.12)" 
                  : (cat.label === "Other" && state.selectedCategories.length === 0)
                  ? "rgba(34, 197, 94, 0.08)"
                  : "transparent",
                border: (cat.label === "Other" && state.selectedCategories.length === 0)
                  ? "1px solid rgba(34, 197, 94, 0.25)"
                  : "none",
                padding: "6px 12px",
                borderRadius: 20,
                display: "inline-flex", alignItems: "center",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <span style={{
                fontSize: 15, fontWeight: isSelected || (cat.label === "Other" && state.selectedCategories.length === 0) ? 700 : 500,
                color: isSelected 
                  ? "var(--brand)" 
                  : (cat.label === "Other" && state.selectedCategories.length === 0)
                  ? "var(--brand)"
                  : "var(--text-secondary)",
                transition: "color 0.2s, font-weight 0.2s",
                display: "inline-flex", alignItems: "center",
              }}>
                {cat.label}
                {isSelected && (
                  <span style={{
                    marginLeft: 6,
                    fontSize: 10,
                    fontWeight: 800,
                    background: "var(--brand)",
                    color: "#FFFFFF",
                    borderRadius: "50%",
                    width: 16,
                    height: 16,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {selectedIndex + 1}
                  </span>
                )}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Hint tip — hidden once Other is selected */}
      {showTip && 
       !state.selectedCategories.includes("Other") && 
       !state.selectedCategories.some(c => !JOB_CATEGORIES_DATA.some(p => p.label === c)) && 
       !shakeId && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            marginTop: 8,
            padding: "9px 14px",
            borderRadius: 12,
            background: "rgba(34,197,94,0.07)",
            borderLeft: "3px solid var(--brand)",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <span style={{ fontSize: 15 }}>💡</span>
          <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
            Can't find your role? Tap <strong style={{ color: "var(--brand)" }}>Other</strong> to type it in.
          </span>
        </motion.div>
      )}

      {shakeId && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: "var(--warning)", textAlign: "center", marginTop: 16, fontSize: 14 }}>
          You can only pick up to 3.
        </motion.p>
      )}

      {(state.selectedCategories.includes("Other") || state.selectedCategories.some(c => !JOB_CATEGORIES_DATA.some(p => p.label === c))) && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={{ marginTop: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Please Specify
          </p>
          <input
            className="input-base"
            placeholder="e.g. Hotel Manager"
            value={otherValue}
            onChange={(e) => setOtherValue(e.target.value)}
            onFocus={(e) => {
              // Delay to let the keyboard appear first, then scroll into view
              setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 350);
            }}
            style={otherWarning ? { borderColor: "var(--warning)" } : {}}
          />
          <AnimatePresence>
            {otherWarning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "flex-start", color: "var(--warning)", fontSize: 13 }}>
                  <span style={{ fontSize: 14 }}>⚠️</span>
                  <span style={{ lineHeight: 1.4 }}>{otherWarning}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      <div style={{ marginTop: "auto", paddingTop: 32, display: "flex", flexDirection: "column" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          App Language
        </p>
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <button
            style={{
              flex: 1, padding: "12px", borderRadius: 12,
              background: "var(--brand-subtle)", border: "1px solid var(--brand)",
              color: "var(--brand)", fontWeight: 700, fontSize: 15,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "default"
            }}
          >
            English
          </button>
          <button
            style={{
              flex: 1, padding: "12px", borderRadius: 12,
              background: "var(--card-hover)", border: "1px solid var(--border)",
              color: "var(--text-muted)", fontWeight: 500, fontSize: 15,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "not-allowed",
              opacity: 0.7
            }}
            disabled
          >
            Amharic (Soon)
          </button>
        </div>
      </div>

      <div style={{ minHeight: 48, display: "flex", alignItems: "flex-end" }}>
        <AnimatePresence mode="wait">
          {canContinue && (
            <motion.button
              key="continue-btn"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="btn-primary"
              style={{ width: "100%" }}
              onClick={() => {
                const hasOtherSelected = state.selectedCategories.includes("Other");
                const hasCustom = !!state.selectedCategories.find(c => !JOB_CATEGORIES_DATA.some(p => p.label === c));
                
                if ((hasOtherSelected || hasCustom) && otherValue.trim()) {
                  const updated = state.selectedCategories.map(c => 
                    (c === "Other" || !JOB_CATEGORIES_DATA.some(p => p.label === c)) 
                      ? otherValue.trim() 
                      : c
                  );
                  updateState({ selectedCategories: updated });
                }
                onNext();
              }}
            >
              Continue
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Step 2: Contact Sharing ---
function Step2_Contact({ state, updateState, onNext, config }: StepProps) {
  const { isReady } = useTelegram();

  const handleYes = () => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg && tg.requestContact) {
        tg.requestContact((shared: boolean, data: any) => {
          if (shared) {
            let phone = data?.contact?.phone_number || data?.phone_number || "";
            if (phone && !phone.startsWith("+")) {
              phone = "+" + phone;
            }
            updateState({ contactShared: true, phoneNumber: phone });
            onNext();
          } else {
            // User dismissed the native prompt — just stay on the page
            return;
          }
        });
        return;
      }
    } catch (e) {
      console.warn("Telegram SDK requestContact error:", e);
    }

    // Fallback for browser/dev environment
    updateState({ contactShared: true, phoneNumber: "" });
    onNext();
  };

  const handleNo = () => {
    updateState({ contactShared: false, phoneNumber: "" });
    onNext();
  };

  return (
    <div style={{ padding: "130px 20px 40px", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(5,150,105,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
        <Smartphone size={36} color="var(--brand)" />
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 12, lineHeight: 1.2 }}>
        {config?.step2_title || "Can we share your contact with employers?"}
      </h1>
      <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 40, maxWidth: 300 }}>
        {config?.step2_subtitle || "This helps employers reach you faster when they want to hire you."}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleYes}
          style={{
            padding: 20, borderRadius: 16, background: "var(--card)", border: "1px solid var(--brand)",
            display: "flex", alignItems: "center", gap: 16, cursor: "pointer", textAlign: "left"
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle size={20} color="#FFFFFF" />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Yes, share my contact</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Employers can reach you directly</p>
          </div>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleNo}
          style={{
            padding: 20, borderRadius: 16, background: "var(--card)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 16, cursor: "pointer", textAlign: "left"
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--surface-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Lock size={20} color="var(--text-muted)" />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>No, keep it private</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>You will be contacted through the app only</p>
          </div>
        </motion.button>
      </div>
    </div>
  );
}

// --- Step 3: Experience Level ---
const EXPERIENCE_OPTIONS = ["No Experience", "Less than 1 year", "1 to 2 years", "3 to 5 years", "5+ years"];

function CustomDropdown({ label, value, options, onSelect }: { label: string; value: string; options: string[]; onSelect: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <label style={{
        display: "block", fontSize: 13, fontWeight: 700,
        color: "var(--brand)", marginBottom: 8,
        textTransform: "uppercase", letterSpacing: "0.04em"
      }}>
        {label}
      </label>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "14px 16px",
          borderRadius: 12,
          border: value ? "1.5px solid var(--brand)" : "1px solid var(--border)",
          background: value ? "rgba(34,197,94,0.06)" : "var(--card)",
          color: value ? "var(--text-primary)" : "var(--text-muted)",
          fontSize: 15,
          fontWeight: value ? 600 : 400,
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}
      >
        {value || "Select experience level…"}
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
          <ChevronDown size={18} color={value ? "var(--brand)" : "var(--text-muted)"} />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 8,
              background: "var(--surface-elevated)",
              borderRadius: 12,
              border: "1px solid var(--border)",
              boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
              zIndex: 100,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {options.map((opt, i) => (
              <button
                key={opt}
                onClick={() => {
                  onSelect(opt);
                  setIsOpen(false);
                }}
                style={{
                  padding: "14px 16px",
                  textAlign: "left",
                  fontSize: 15,
                  fontWeight: 500,
                  color: value === opt ? "var(--brand)" : "var(--text-primary)",
                  background: value === opt ? "rgba(34,197,94,0.06)" : "transparent",
                  borderBottom: i < options.length - 1 ? "1px solid var(--border)" : "none",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = value === opt ? "rgba(34,197,94,0.06)" : "var(--card-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = value === opt ? "rgba(34,197,94,0.06)" : "transparent")}
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchableLocationDropdown({ value, onSelect }: { value: string; onSelect: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredLocations = LOCATIONS.filter(loc => 
    loc.name.toLowerCase().includes(search.toLowerCase()) || 
    loc.subCity.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase" }}>Location (Neighborhood)</label>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        style={{
          width: "100%",
          padding: "14px 16px",
          borderRadius: 12,
          border: value ? "1.5px solid var(--brand)" : "1px solid var(--border)",
          background: value ? "rgba(34,197,94,0.06)" : "var(--card)",
          color: value ? "var(--text-primary)" : "var(--text-muted)",
          fontSize: 15,
          fontWeight: value ? 600 : 400,
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || "Search your area..."}
        </span>
        <ChevronDown size={18} color={value ? "var(--brand)" : "var(--text-muted)"} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 9999,
              background: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "flex-end", // Align to bottom
            }}
            onClick={() => setIsOpen(false)} // Close when clicking backdrop
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              style={{
                width: "100%",
                height: "85dvh", // take up 85% of screen
                background: "var(--app-bg)",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "0 -8px 32px rgba(0,0,0,0.15)",
              }}
              onClick={(e) => e.stopPropagation()} // Prevent click inside modal from closing
            >
              {/* Header */}
              <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Select Location</h3>
                <button 
                  onClick={() => setIsOpen(false)}
                  style={{ background: "transparent", border: "none", fontSize: 24, color: "var(--text-muted)", cursor: "pointer", padding: 0, lineHeight: 1 }}
                >
                  &times;
                </button>
              </div>

              {/* Search Input */}
              <div style={{ padding: "16px 20px", background: "var(--surface)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px" }}>
                  <Search size={18} color="var(--text-muted)" />
                  <input 
                    placeholder="Search area or sub-city..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      border: "none",
                      outline: "none",
                      width: "100%",
                      fontSize: 15,
                      background: "transparent",
                      color: "var(--text-primary)"
                    }}
                  />
                </div>
              </div>

              {/* Scrollable list */}
              <div style={{ overflowY: "auto", flex: 1, paddingBottom: 40, background: "var(--surface)" }}>
                {filteredLocations.length > 0 ? (
                  filteredLocations.map((loc, i) => (
                    <button
                      key={loc.id}
                      onClick={() => {
                        onSelect(loc.name);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      style={{
                        width: "100%",
                        padding: "16px 20px",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "transparent",
                        borderTop: "none",
                        borderRight: "none",
                        borderLeft: "none",
                        borderBottom: i < filteredLocations.length - 1 ? "1px solid var(--border)" : "none",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: value === loc.name ? 700 : 500, color: value === loc.name ? "var(--brand)" : "var(--text-primary)" }}>
                          {loc.name}
                        </span>
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{loc.subCity}</span>
                      </div>
                      {value === loc.name && <CheckCircle size={20} color="var(--brand)" />}
                    </button>
                  ))
                ) : (
                  <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 15 }}>
                    No locations found matching "{search}".
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Step3_Experience({ state, updateState, onNext, config }: StepProps) {
  let EXPERIENCES = [...EXPERIENCE_OPTIONS];
  try {
    if (config?.step3_experience_levels) {
      EXPERIENCES = JSON.parse(config.step3_experience_levels);
    }
  } catch (e) {}

  const handleSelect = (category: string, level: string) => {
    updateState({
      experienceLevels: { ...state.experienceLevels, [category]: level }
    });
  };

  const allSelected = state.selectedCategories.every(cat => state.experienceLevels[cat]);

  return (
    <div style={{ padding: "130px 20px 40px", flex: 1, display: "flex", flexDirection: "column" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6, lineHeight: 1.2 }}>
        {config?.step3_title || "What is your experience level?"}
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 28 }}>
        {config?.step3_subtitle || "Select for each of your chosen roles."}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: "auto" }}>
        {state.selectedCategories.map(cat => (
          <CustomDropdown
            key={cat}
            label={cat}
            value={state.experienceLevels[cat] || ""}
            options={EXPERIENCES}
            onSelect={(val) => handleSelect(cat, val)}
          />
        ))}
      </div>

      {allSelected && (
        <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="btn-primary" style={{ marginTop: 24 }} onClick={onNext}>
          Continue
        </motion.button>
      )}
    </div>
  );
}

// --- Step 4: Personal Details ---
function Step4_Personal({ state, updateState, onNext, config }: StepProps) {
  const [ageError, setAgeError] = useState("");
  const [nameError, setNameError] = useState("");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const capitalized = val.charAt(0).toUpperCase() + val.slice(1);
    updateState({ fullName: capitalized });

    // Validate name
    const trimmed = capitalized.trim();
    if (trimmed.length === 0) {
      setNameError("");
    } else if (trimmed.length < 3) {
      setNameError("Name is too short.");
    } else if (/[^a-zA-Z\s\-\u1200-\u137F]/.test(trimmed)) {
      // Allow Latin letters, spaces, hyphens, and Ethiopic script
      setNameError("Name should only contain letters.");
    } else if (/^(.)\1{2,}$/i.test(trimmed.replace(/\s/g, ""))) {
      setNameError("That doesn't look like a real name.");
    } else if (/(.)\1{3,}/i.test(trimmed)) {
      setNameError("That doesn't look like a real name.");
    } else if (!trimmed.includes(" ") && trimmed.length > 30) {
      setNameError("Please enter your full name (first and last).");
    } else {
      setNameError("");
    }
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      updateState({ age: "" });
      setAgeError("");
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    updateState({ age: num });
    if (num < 16 || num > 60) setAgeError("Age must be between 16 and 60.");
    else setAgeError("");
  };

  const canProceed = !nameError && state.fullName.length > 2 && state.age !== "" && state.age >= 16 && state.age <= 60 && state.location !== "" && state.gender !== "";

  return (
    <div style={{ padding: "130px 20px 40px", flex: 1, display: "flex", flexDirection: "column" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 32, lineHeight: 1.2 }}>
        {config?.step4_title || "Tell us a bit about yourself"}
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: "auto" }}>
        
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase" }}>Full Name</label>
          <input
            className="input-base"
            placeholder="E.g. Abebe Kebede"
            value={state.fullName}
            onChange={handleNameChange}
            style={
              nameError
                ? { borderColor: "var(--error)" }
                : state.fullName.trim().length > 2
                ? { borderColor: "var(--brand)" }
                : {}
            }
          />
          {nameError ? (
            <motion.div
              key="name-error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginTop: 6, display: "flex", gap: 5, alignItems: "center", color: "var(--error)", fontSize: 13 }}
            >
              <span>{nameError}</span>
            </motion.div>
          ) : state.fullName.trim().length > 2 ? (
            <motion.div
              key="name-valid"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginTop: 6, display: "flex", gap: 5, alignItems: "center", color: "var(--brand)", fontSize: 13 }}
            >
              <span style={{ fontWeight: 600 }}>Looks good!</span>
            </motion.div>
          ) : null}
        </div>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase" }}>Age</label>
          <input type="number" className="input-base" placeholder="18" value={state.age} onChange={handleAgeChange} />
          {ageError && <p style={{ color: "var(--warning)", fontSize: 12, marginTop: 6 }}>{ageError}</p>}
        </div>

        {/* Gender Selector */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12, textTransform: "uppercase" }}>Gender</label>
          <div style={{ display: "flex", gap: 12 }}>
            {(["male", "female"] as const).map((g) => {
              const isSelected = state.gender === g;
              return (
                <motion.button
                  key={g}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => updateState({ gender: g })}
                  style={{
                    flex: 1, padding: "16px 12px", borderRadius: 16, cursor: "pointer",
                    fontFamily: "inherit", display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 10,
                    background: isSelected ? "rgba(5,150,105,0.12)" : "var(--card)",
                    border: isSelected ? "1.5px solid var(--brand)" : "1px solid var(--border)",
                  }}
                >
                  {g === "male" ? (
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <circle cx="20" cy="11" r="7" fill={isSelected ? "#059669" : "#8B9BBE"} />
                      <path d="M8 38c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke={isSelected ? "#059669" : "#8B9BBE"} strokeWidth="3" strokeLinecap="round" fill="none"/>
                    </svg>
                  ) : (
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <circle cx="20" cy="11" r="7" fill={isSelected ? "#059669" : "#8B9BBE"} />
                      <path d="M20 18v4M11 26c0-2.761 4.029-5 9-5s9 2.239 9 5" stroke={isSelected ? "#059669" : "#8B9BBE"} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                      <path d="M13 32c0 0 1.5-4 7-4s7 4 7 4" stroke={isSelected ? "#059669" : "#8B9BBE"} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                      <ellipse cx="20" cy="31" rx="7" ry="4" fill={isSelected ? "rgba(5,150,105,0.2)" : "rgba(139,155,190,0.15)"}/>
                    </svg>
                  )}
                  <span style={{
                    fontSize: 14, fontWeight: 700,
                    color: isSelected ? "var(--brand)" : "var(--text-secondary)",
                    textTransform: "capitalize",
                  }}>{g}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <SearchableLocationDropdown 
          value={state.location} 
          onSelect={(val) => updateState({ location: val })} 
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--card)", padding: 16, borderRadius: 16, border: "1px solid var(--border)" }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Willing to relocate?</p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Apply to jobs outside your area</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => updateState({ willingToRelocate: !state.willingToRelocate })}
            style={{ width: 48, height: 28, borderRadius: 100, background: state.willingToRelocate ? "var(--brand)" : "var(--text-muted)", border: "none", cursor: "pointer", position: "relative" }}
          >
            <motion.div
              animate={{ x: state.willingToRelocate ? 20 : 2 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{ position: "absolute", top: 3, width: 22, height: 22, borderRadius: "50%", background: "white" }}
            />
          </motion.button>
        </div>

      </div>

      <motion.button className="btn-primary" style={{ marginTop: 24, opacity: canProceed ? 1 : 0.5 }} disabled={!canProceed} onClick={onNext}>
        Continue
      </motion.button>
    </div>
  );
}


// --- Step 5: CV Upload ---
function Step5_CV({ state, updateState, onNext, config }: StepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("File is too large. Max 5MB.");
        return;
      }
      // Allowed types simplified for demo
      if (!file.name.endsWith(".pdf") && !file.name.endsWith(".doc") && !file.name.endsWith(".docx")) {
         alert("Please upload a PDF or Word document.");
         return;
      }
      updateState({ cvFile: file, cvUploaded: true });
    }
  };

  return (
    <div style={{ padding: "130px 20px 40px", flex: 1, display: "flex", flexDirection: "column" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8, lineHeight: 1.2 }}>
        {config?.step5_title || "Upload your CV"}
      </h1>
      <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 32 }}>
        {config?.step5_subtitle || "PDF or Word document. Max 5MB."}
      </p>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <input type="file" ref={fileInputRef} style={{ display: "none" }} accept=".pdf,.doc,.docx" onChange={handleFileChange} />
        
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "2px dashed rgba(5,150,105,0.4)", borderRadius: 20, padding: 40,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(5,150,105,0.05)", cursor: "pointer", minHeight: 200
          }}
        >
          {state.cvFile ? (
            <>
              <CheckCircle size={48} color="var(--success)" style={{ marginBottom: 16 }} />
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", textAlign: "center", wordBreak: "break-all" }}>{state.cvFile.name}</p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>Tap to change file</p>
            </>
          ) : (
            <>
              <UploadCloud size={48} color="var(--brand)" style={{ marginBottom: 16 }} />
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Tap to select file</p>
            </>
          )}
        </motion.div>

        {state.submitError && (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={16} color="var(--error)" />
            <p style={{ fontSize: 13, color: "var(--error)" }}>{state.submitError}</p>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
        <motion.button className="btn-primary" onClick={onNext} disabled={state.isSubmitting}>
          {state.isSubmitting ? "Submitting..." : (state.cvFile ? "Finish Setup" : "Continue Without CV")}
        </motion.button>
        {!state.cvFile && !state.isSubmitting && (
           <button onClick={onNext} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
             Skip for now
           </button>
        )}
      </div>
    </div>
  );
}

// --- Step 6: Success Screen ---
function Step6_Success({ state, onNext, config }: { state: ReturnType<typeof useOnboarding>["state"], onNext: () => void, config?: Record<string, string> }) {
  return (
    <div style={{ padding: "40px 20px", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}
        style={{ width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg, var(--brand) 0%, var(--brand-dim) 100%)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 }}
      >
        <CheckCircle size={50} color="#FFFFFF" />
      </motion.div>
      
      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", marginBottom: 12, lineHeight: 1.2 }}>
        {config?.step6_headline ? config.step6_headline.replace("{name}", state.fullName.split(" ")[0]) : `Welcome ${state.fullName.split(" ")[0]}!`}
      </motion.h1>
      
      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 300, marginBottom: 48 }}>
        {config?.step6_body || "Welcome to Jobs Addis by Prime Hospitality. Your profile is ready. Let's find you the perfect job."}
      </motion.p>

      <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="btn-primary" onClick={onNext} style={{ width: "100%" }}>
        Find jobs
      </motion.button>
    </div>
  );
}
