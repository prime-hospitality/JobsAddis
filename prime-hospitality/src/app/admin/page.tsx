import { cookies } from "next/headers";
import AdminDashboard from "./AdminDashboard";
import AdminLogin from "./AdminLogin";
import { getAdminData } from "./actions";

export const metadata = {
  title: "Jobs Addis Admin",
  icons: {
    icon: "/addis_jobs_logo_mark_only.svg",
  },
};

export default async function AdminPage() {
  const authCookie = (await cookies()).get("admin_session");
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

  return <AdminDashboard initialData={data} />;
}
