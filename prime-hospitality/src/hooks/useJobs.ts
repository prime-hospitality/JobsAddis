"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Job, JobCategory, JobType } from "@/data/jobs";
import { meetsExperience } from "@/lib/vocabulary";

/** Role -> whole years, as stored on `profiles.experience_years`. */
export type SeekerYears = Record<string, number>;

/**
 * Every column mapSupabaseJobToJob() reads, as a PostgREST select list.
 *
 * Exported because the deep-link loaders in app/page.tsx feed the same mapper
 * and used to spell this list out themselves. Both copies were written before
 * `min_years_experience` existed and neither gained it, so a job opened from a
 * Telegram "View & Apply" button rendered as "Any experience" while the same
 * job opened from the home list showed the years correctly -- the mapper
 * coalesces the missing column to null, so there was nothing to notice until a
 * seeker compared the two paths. `last_posted_at` was missing the same way,
 * which dated a reposted job from when it was first created.
 *
 * Anything added to SupabaseJob belongs here too, or the deep link silently
 * drops it again.
 */
export const JOB_SELECT = `
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
  min_years_experience,
  requirements,
  deadline,
  status,
  filled_at,
  created_at,
  last_posted_at,
  quantity,
  employers (
    business_name,
    business_type,
    logo_url
  )
`;

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
  min_years_experience: number | null;
  requirements: {
    education: string;
    languages: string[];
    locationPreference: string | null;
    workingHours?: string;
  };
  deadline: string;
  status: "pending" | "active" | "closed" | "rejected" | "expired" | "scheduled";
  filled_at: string | null;
  created_at: string;
  last_posted_at: string | null;
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
/**
 * `seekerYears` is the signed-in seeker's role -> years map. Omit it (server
 * rendering, previews, any context with no seeker) and every job comes back
 * qualified, which is the correct neutral reading rather than a claim that the
 * viewer falls short.
 */
export function mapSupabaseJobToJob(sj: SupabaseJob, seekerYears?: SeekerYears): Job {
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
    // Seekers see how recently the job was made live — a reposted job reads as
    // freshly posted. Falls back to created_at for rows predating the column.
    postedAt: sj.last_posted_at ?? sj.created_at,
    description: sj.description,
    fullDescription: sj.full_description,
    minYearsExperience: sj.min_years_experience ?? null,
    requirements: {
      education: sj.requirements?.education ?? "",
      languages: sj.requirements?.languages ?? [],
      locationPreference: sj.requirements?.locationPreference ?? null,
      workingHours: sj.requirements?.workingHours,
    },
    deadline: sj.deadline,
    qualificationsMet: meetsExperience(seekerYears?.[sj.category], sj.min_years_experience),
    locationMismatch: false,
    quantity: sj.quantity ?? 1,
    filled: !!sj.filled_at,
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

export function useJobs(category?: string | null, limit?: number, seekerYears?: SeekerYears): UseJobsReturn {
  // The map object is rebuilt on every profile fetch, so depending on its
  // identity would refetch the whole feed on each render. Its contents are what
  // the badge depends on.
  const seekerYearsKey = JSON.stringify(seekerYears ?? {});
  // Part of the cache key, not just the effect deps: cached rows carry a
  // resolved `qualificationsMet`, so a seeker who edits their years must not be
  // served badges computed against the old ones.
  const categoryKey = `${category || "all"}-${limit || "all"}-${seekerYearsKey}`;
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
        .select(JOB_SELECT)
        // A job stays visible and browsable through its own deadline, AND after
        // the employer marks it filled -- it's never removed by either on its
        // own. Only an admin-moderated close (status 'closed' with no filled_at)
        // or another terminal status actually drops it from the main app.
        // JobDetailScreen enforces "can't apply" for both the expired and the
        // filled case on its own.
        .or("status.in.(active,expired),and(status.eq.closed,filled_at.not.is.null)")
        .order("last_posted_at", { ascending: false }); // reposts surface as fresh

      if (category) {
        query = query.eq("category", category);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      const years = JSON.parse(seekerYearsKey) as SeekerYears;
      const mappedJobs = ((data ?? []) as unknown as SupabaseJob[]).map((sj) =>
        mapSupabaseJobToJob(sj, years)
      );
      jobsCache[categoryKey] = mappedJobs;
      setJobs(mappedJobs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Failed to fetch jobs:", msg, err);
      setError("Could not load jobs. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, [category, categoryKey, seekerYearsKey]);

  useEffect(() => {
    fetchJobs(false);
  }, [fetchJobs]);

  // ── Realtime: instantly reflect jobs coming online or going offline ────────
  // A job can become visible in this feed either via INSERT (auto-published
  // by its employer) or via UPDATE (admin approves a pending job, or a
  // scheduled job publishes). Since the row payload doesn't include the
  // joined `employers` columns this hook needs for display, we re-run the
  // scoped query rather than trying to splice the raw row in by hand.
  useEffect(() => {
    const removeJob = (jobId: string) => {
      // Remove from all cache keys
      Object.keys(jobsCache).forEach((key) => {
        jobsCache[key] = jobsCache[key].filter((j) => j.id !== jobId);
      });
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    };

    const matchesThisFeed = (row: { category?: string }) =>
      !category || row.category === category;

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
        { event: "INSERT", schema: "public", table: "jobs" },
        (payload) => {
          const inserted = payload.new as { status: string; category: string };
          if (inserted?.status === "active" && matchesThisFeed(inserted)) {
            fetchJobs(true);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "jobs" },
        (payload) => {
          const updated = payload.new as { id: string; status: string; category: string; filled_at: string | null };
          if (!updated?.id) return;
          const stillVisible =
            updated.status === "active" ||
            updated.status === "expired" ||
            (updated.status === "closed" && !!updated.filled_at);
          if (!stillVisible) {
            // Actually gone from the main app now — an admin-moderated close
            // (closed with no filled_at), rejected, paused, or scheduled.
            removeJob(updated.id);
          } else if (matchesThisFeed(updated)) {
            // Newly approved/published, an edit to an active job, a deadline
            // that just passed (active -> expired), one just revived (expired
            // -> active via repost), or marked filled (active/expired -> closed).
            fetchJobs(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [categoryKey, category, fetchJobs]);

  const refetch = useCallback(() => {
    return fetchJobs(true);
  }, [fetchJobs]);

  return { jobs, isLoading, error, refetch };
}
