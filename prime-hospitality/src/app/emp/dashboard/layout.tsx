import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import EmployerDashboardLayout from "./EmployerDashboardLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Employer Dashboard | Addis Jobs",
  description: "Manage your job postings, track applicants, and view analytics on the Addis Jobs Employer Portal.",
};

async function getSession() {
  const sessionCookie = (await cookies()).get("employer_session");
  if (!sessionCookie?.value) return null;
  try {
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect("/emp");
  }

  return (
    <EmployerDashboardLayout session={session}>
      {children}
    </EmployerDashboardLayout>
  );
}
