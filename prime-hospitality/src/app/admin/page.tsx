import { cookies } from "next/headers";
import AdminLogin from "./AdminLogin";
import AdminSessionGate from "./AdminSessionGate";
import { ADMIN_UI_COOKIE, parseAdminUi } from "@/lib/adminUiCookie";

export const metadata = {
  title: "JobsAdis Admin",
  icons: {
    icon: "/addis_jobs_logo.png",
  },
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("admin_session");
  const isAuthenticated = !!authCookie?.value;

  // No session cookie at all → nobody is logged in on this browser: show login.
  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  // A session cookie exists, but it's shared across every tab of the browser.
  // The gate decides per-tab whether this tab has actually been logged into —
  // a brand-new tab shows login instead of inheriting the open session, and the
  // dashboard data is fetched (client-side) only after this tab is unlocked.
  //
  // Restore the last tab/sub-tab position from a cookie so an already-unlocked
  // tab lands on the right tab without a flash.
  const initialUi = parseAdminUi(cookieStore.get(ADMIN_UI_COOKIE)?.value);

  return <AdminSessionGate initialUi={initialUi} />;
}
