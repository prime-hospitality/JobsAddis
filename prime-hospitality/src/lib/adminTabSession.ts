// Per-tab admin "unlock" marker. Stored in sessionStorage, which is scoped to a
// single browser tab and survives reloads but is NOT inherited by a new tab.
// This lets a fresh tab require a real login even though the auth cookie (which
// is shared across all tabs of the browser) is still present.
//
// The stored value is the username that logged in on THIS tab, so a tab can
// detect if the shared session was later taken over by a different user.

export const ADMIN_TAB_USER_KEY = "admin_tab_user";

export function getTabUser(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_TAB_USER_KEY);
}

export function setTabUser(username: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ADMIN_TAB_USER_KEY, username);
}

export function clearTabUser() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADMIN_TAB_USER_KEY);
}
