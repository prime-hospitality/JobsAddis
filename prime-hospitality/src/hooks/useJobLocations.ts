"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Areas offered by the search Location filter.
 *
 * Read off live active jobs rather than from `data/locations.ts`, deliberately.
 * That file lists every sub-city and neighbourhood in Addis, but employers type
 * `location` as free text — live values include "Haile garment", "Joseph Tito
 * Street" and "Meskel Square", none of which are in the canonical list. Offering
 * the canonical list would mean a filter full of options that match nothing while
 * the places actually hiring stay unreachable.
 *
 * `neighborhood` is unioned in because both columns are written from the same
 * form field and either may carry the useful value on older rows.
 */
export function useJobLocations() {
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("location, neighborhood")
        .eq("status", "active");

      if (cancelled) return;
      if (error) {
        console.error("Failed to load job locations:", error);
        setIsLoading(false);
        return;
      }

      // Dedupe case-insensitively, keeping the first spelling seen — the
      // free-text column means "Bole" and "bole" both occur.
      const seen = new Set<string>();
      const out: string[] = [];
      for (const row of data ?? []) {
        for (const raw of [row.location, row.neighborhood]) {
          const name = typeof raw === "string" ? raw.trim() : "";
          if (!name || seen.has(name.toLowerCase())) continue;
          seen.add(name.toLowerCase());
          out.push(name);
        }
      }

      out.sort((a, b) => a.localeCompare(b));
      setLocations(out);
      setIsLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  return { locations, isLoading };
}
