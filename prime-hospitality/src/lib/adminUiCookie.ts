// Persisted admin dashboard UI position (which tab / sub-tab the admin was on).
// Stored in a cookie rather than sessionStorage so the server component can read
// it and render the correct tab on the first paint — no overview-then-jump flash.

export type AdminUiState = {
  tab: string;
  configSubTab: string;
  monSubTab: string;
  empSubTab: string | null;
  empConfigSubTab: string | null;
  settingsTab: string;
  seekerSubTab: string;
  contentSubTab: string; // ContentManagementTab.activeSubTab
  vacancyMgmtSubTab: string; // ContentManagementTab.vacancyManagementSubTab
};

export const ADMIN_UI_COOKIE = "admin_ui";

export function parseAdminUi(raw: string | undefined): Partial<AdminUiState> {
  if (!raw) return {};
  try {
    return (JSON.parse(decodeURIComponent(raw)) as Partial<AdminUiState>) ?? {};
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
export function writeAdminUi(partial: Partial<AdminUiState>) {
  if (typeof document === "undefined") return;
  const current = parseAdminUi(readCookieValue(ADMIN_UI_COOKIE));
  const next = { ...current, ...partial };
  document.cookie = `${ADMIN_UI_COOKIE}=${encodeURIComponent(
    JSON.stringify(next)
  )}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

export function clearAdminUi() {
  if (typeof document === "undefined") return;
  document.cookie = `${ADMIN_UI_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
