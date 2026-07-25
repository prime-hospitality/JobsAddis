// Persisted employer dashboard UI position (which sub-tab the employer was on).
// The top-level tab is already in the URL, but the sub-tabs inside a page are
// client state that resets on reload. Stored in a cookie rather than
// sessionStorage so the server component can read it and render the correct
// sub-tab on the first paint — no default-then-jump flash.

export type EmployerUiState = {
  jobsSubTab: "post" | "templates"; // ManageJobPostingsTab.activeSubTab
  applicantsTab: "all" | "shortlisted" | "rejected"; // ApplicantsTab.tab
};

export const EMPLOYER_UI_COOKIE = "emp_ui";

export function parseEmployerUi(raw: string | undefined): Partial<EmployerUiState> {
  if (!raw) return {};
  try {
    return (JSON.parse(decodeURIComponent(raw)) as Partial<EmployerUiState>) ?? {};
  } catch {
    return {};
  }
}

function readCookieValue(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(name + "="))
    ?.split("=")[1];
}

// Client-only: merge a partial position into the existing cookie so multiple
// components can persist their own slice without clobbering each other.
export function writeEmployerUi(partial: Partial<EmployerUiState>) {
  if (typeof document === "undefined") return;
  const current = parseEmployerUi(readCookieValue(EMPLOYER_UI_COOKIE));
  const next = { ...current, ...partial };
  document.cookie = `${EMPLOYER_UI_COOKIE}=${encodeURIComponent(
    JSON.stringify(next)
  )}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}
