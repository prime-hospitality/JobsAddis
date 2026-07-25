import { cookies } from "next/headers";
import { EMPLOYER_UI_COOKIE, parseEmployerUi } from "@/lib/employerUiCookie";
import ManageJobPostingsTab from "./ManageJobPostingsTab";

export default async function JobsPage() {
  // Restore the last sub-tab server-side so a reload renders it on the first
  // paint instead of showing Post and swapping after hydration.
  const ui = parseEmployerUi((await cookies()).get(EMPLOYER_UI_COOKIE)?.value);
  return <ManageJobPostingsTab initialSubTab={ui.jobsSubTab === "templates" ? "templates" : "post"} />;
}
