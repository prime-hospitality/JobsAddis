"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Job, JobCategory, JobType, ExperienceLevel } from "@/data/jobs";

// ---------------------------------------------------------------------------
// Types — mirrors the `jobs` table columns returned from Supabase
// ---------------------------------------------------------------------------
export interface SupabaseJob {
  id: string;
  employer_id: string;
  title: string;
  category: string;
  location: string;
  neighborhood: string;
  job_type: string;
  salary_min: number;
  salary_max: number;
  currency: string;
  description: string;
  full_description: string;
  requirements: {
    experience: string;
    education: string;
    languages: string[];
    locationPreference: string | null;
    workingHours?: string;
  };
  deadline: string;
  status: "pending" | "active" | "closed" | "rejected";
  created_at: string;
  quantity: number;
  employers?:
    | {
        business_name: string;
        business_type: string;
        logo_url: string | null;
      }
    | {
        business_name: string;
        business_type: string;
        logo_url: string | null;
      }[];
}

interface UseJobsReturn {
  jobs: Job[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Helper: Map Supabase DB Job to Frontend UI Job
// ---------------------------------------------------------------------------
export function mapSupabaseJobToJob(sj: SupabaseJob): Job {
  const categoryEmojiMap: Record<string, string> = {
    Waiter: "💁",
    Chef: "🍳",
    Receptionist: "🛎️",
    Barista: "☕",
    Housekeeper: "🧹",
    Security: "🛡️",
    Cashier: "💵",
    Manager: "💼",
  };

  const emp = Array.isArray(sj.employers) ? sj.employers[0] : sj.employers;

  return {
    id: sj.id,
    businessName: emp?.business_name ?? "Hiring Partner",
    businessLogo: categoryEmojiMap[sj.category] ?? "🏨",
    logoUrl: emp?.logo_url || undefined,
    businessType: emp?.business_type ?? "Hospitality Business",
    title: sj.title,
    category: sj.category as JobCategory,
    location: sj.location,
    neighborhood: sj.neighborhood,
    jobType: sj.job_type as JobType,
    salaryMin: sj.salary_min,
    salaryMax: sj.salary_max,
    currency: sj.currency,
    postedAt: sj.created_at,
    description: sj.description,
    fullDescription: sj.full_description,
    requirements: {
      experience: sj.requirements.experience as ExperienceLevel,
      education: sj.requirements.education,
      languages: sj.requirements.languages,
      locationPreference: sj.requirements.locationPreference,
      workingHours: sj.requirements.workingHours,
    },
    deadline: sj.deadline,
    qualificationsMet: true, // simplified or resolved per-profile in checking screens
    locationMismatch: false,
    quantity: sj.quantity ?? 1,
  };
}

// ---------------------------------------------------------------------------
// Hook: useJobs
// ---------------------------------------------------------------------------
// Hook: useJobs
// Loads only active jobs from Supabase, ordered by most recently posted.
// Also subscribes to Realtime to instantly remove deleted/non-active jobs.
// ---------------------------------------------------------------------------
let jobsCache: Record<string, Job[]> = {};

export function useJobs(category?: string | null, limit?: number): UseJobsReturn {
  const categoryKey = `${category || "all"}-${limit || "all"}`;
  const [jobs, setJobs] = useState<Job[]>(jobsCache[categoryKey] ?? []);
  const [isLoading, setIsLoading] = useState(!jobsCache[categoryKey]);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async (force = false) => {
    if (!force && jobsCache[categoryKey]) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("jobs")
        .select(
          `
          id,
          employer_id,
          title,
          category,
          location,
          neighborhood,
          job_type,
          salary_min,
          salary_max,
          currency,
          description,
          full_description,
          requirements,
          deadline,
          status,
          created_at,
          quantity,
          employers (
            business_name,
            business_type,
            logo_url
          )
        `
        )
        .eq("status", "active") // Only show approved, live jobs
        .order("created_at", { ascending: false });

      if (category) {
        query = query.eq("category", category);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      const mappedJobs = ((data ?? []) as unknown as SupabaseJob[]).map(mapSupabaseJobToJob);
      jobsCache[categoryKey] = mappedJobs;
      setJobs(mappedJobs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Failed to fetch jobs:", msg, err);
      setError("Could not load jobs. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, [category, categoryKey]);

  useEffect(() => {
    fetchJobs(false);
  }, [fetchJobs]);

  // ── Realtime: instantly remove deleted or non-active jobs ──────────────────
  useEffect(() => {
    const removeJob = (jobId: string) => {
      // Remove from all cache keys
      Object.keys(jobsCache).forEach((key) => {
        jobsCache[key] = jobsCache[key].filter((j) => j.id !== jobId);
      });
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    };

    const channel = supabase
      .channel(`jobs-realtime-${categoryKey}`)
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "jobs" },
        (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) removeJob(deletedId);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "jobs" },
        (payload) => {
          const updated = payload.new as { id: string; status: string };
          // If the job is no longer active, remove it from the feed instantly
          if (updated?.id && updated.status !== "active") {
            removeJob(updated.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [categoryKey]);

  const refetch = useCallback(() => {
    return fetchJobs(true);
  }, [fetchJobs]);

  return { jobs, isLoading, error, refetch };
}
