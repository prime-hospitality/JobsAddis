import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getApplicants } from "./actions";
import { requireEmployer } from "../shared/employerServerUtils";
import { EMPLOYER_UI_COOKIE, parseEmployerUi } from "@/lib/employerUiCookie";
import ApplicantsTab from "./ApplicantsTab";

export const dynamic = "force-dynamic";

export default async function ApplicantsPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const session = await requireEmployer();
  if (!session) redirect("/emp");

  // ?job=<id> lets the Jobs tab and the overview link straight to one posting.
  const { job } = await searchParams;
  const { applicants, jobs, renewalRequestedAt, renewalSeenAt } = await getApplicants(job);

  // Restore the last status tab server-side so a reload renders it on the first
  // paint instead of showing All and swapping after hydration.
  const ui = parseEmployerUi((await cookies()).get(EMPLOYER_UI_COOKIE)?.value);
  const initialTab =
    ui.applicantsTab === "shortlisted" || ui.applicantsTab === "rejected" ? ui.applicantsTab : "all";

  return (
    <ApplicantsTab
      initialApplicants={applicants}
      jobs={jobs}
      initialJobFilter={job ?? ""}
      initialTab={initialTab}
      employerId={session.employerId}
      initialRenewalRequestedAt={renewalRequestedAt}
      initialRenewalSeenAt={renewalSeenAt}
    />
  );
}
