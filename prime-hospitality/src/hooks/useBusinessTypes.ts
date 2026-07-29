"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * The establishment types offered anywhere a workplace kind is picked — the
 * search Type filter, and the "where did you earn these years" step in
 * onboarding and the profile role editor.
 *
 * Two sources, unioned, because neither alone is complete:
 *  - `business_types` is the lookup table the admin console and the employer
 *    profile "Other" flow write to, so it carries every type that has been
 *    *created*, whether or not anyone is hiring under it.
 *  - Employers predating that table (or edited around it) can carry a
 *    `business_type` string that was never inserted into the lookup. Reading
 *    the types off live jobs guarantees no active vacancy is unreachable
 *    through the filter.
 *
 * Lookup order is preserved (Hotel, Restaurant, Cafe first — the seeded rows),
 * with any orphaned types appended alphabetically.
 *
 * Shared rather than copied per screen: a second hand-maintained list is how
 * the four experience scales this app used to carry drifted apart.
 */
export function useBusinessTypes() {
  const [types, setTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [lookupRes, liveRes] = await Promise.all([
        supabase.from("business_types").select("name").order("created_at", { ascending: true }),
        supabase.from("jobs").select("employers!inner(business_type)").eq("status", "active"),
      ]);

      if (cancelled) return;

      if (lookupRes.error) console.error("Failed to load business types:", lookupRes.error);
      if (liveRes.error) console.error("Failed to load business types from jobs:", liveRes.error);

      const ordered: string[] = [];
      const seen = new Set<string>();
      const add = (raw: unknown) => {
        const name = typeof raw === "string" ? raw.trim() : "";
        // Dedupe case-insensitively: the lookup is UNIQUE on `name`, but an
        // employer's free-text `business_type` may differ only in casing.
        if (!name || seen.has(name.toLowerCase())) return;
        seen.add(name.toLowerCase());
        ordered.push(name);
      };

      (lookupRes.data ?? []).forEach((row) => add(row.name));

      const orphans: string[] = [];
      (liveRes.data ?? []).forEach((row) => {
        const emp = row.employers as unknown;
        const list = Array.isArray(emp) ? emp : [emp];
        list.forEach((e) => {
          const name = (e as { business_type?: string } | null)?.business_type?.trim();
          if (name && !seen.has(name.toLowerCase())) orphans.push(name);
        });
      });
      orphans.sort((a, b) => a.localeCompare(b)).forEach(add);

      setTypes(ordered);
      setIsLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  return { types, isLoading };
}
