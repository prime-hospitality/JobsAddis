import { cookies } from "next/headers";
import AdminSessionGate from "./AdminSessionGate";
import { ADMIN_UI_COOKIE, parseAdminUi } from "@/lib/adminUiCookie";
import { verifySessionValue } from "@/lib/signedSession";

export const metadata = {
  title: "JobsAdis Admin",
  icons: {
    icon: "/addis_jobs_logo.webp",
  },
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("admin_session");
  const hasSession = !!verifySessionValue(authCookie?.value);

  // The session cookie is shared across every tab of the browser, so it can't
  // decide this on its own. The gate decides per-tab whether this tab has
  // actually been logged into — a brand-new tab shows login instead of
  // inheriting the open session, and the dashboard data is fetched (client-side)
  // only after this tab is unlocked.
  //
  // The gate renders the login form itself rather than this page branching to
  // it, so a successful login can swap in the dashboard directly. Branching
  // here meant the login had to reload the page to get past this check, and that
  // round trip through a blank document was the flash after a correct password.
  //
  // Restore the last tab/sub-tab position from a cookie so an already-unlocked
  // tab lands on the right tab without a flash. With no session there is no
  // position worth restoring — a fresh login always starts on Overview.
  const initialUi = hasSession ? parseAdminUi(cookieStore.get(ADMIN_UI_COOKIE)?.value) : {};

  return <AdminSessionGate hasSession={hasSession} initialUi={initialUi} />;
}
