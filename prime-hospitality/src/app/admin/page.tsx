import { cookies } from "next/headers";
import AdminDashboard from "./AdminDashboard";
import AdminLogin from "./AdminLogin";
import { getAdminData } from "./actions";
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

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  // Fetch initial data securely on the server
  let data;
  try {
    data = await getAdminData();
  } catch (err) {
    // If auth fails or data fetch fails, show login
    return <AdminLogin />;
  }

  // Restore the admin's last tab/sub-tab position from a cookie so SSR renders
  // the correct tab on first paint (no overview-then-jump flash on reload).
  const initialUi = parseAdminUi(cookieStore.get(ADMIN_UI_COOKIE)?.value);

  return <AdminDashboard initialData={data} initialUi={initialUi} />;
}
