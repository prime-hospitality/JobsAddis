import { redirect } from "next/navigation";
import { getApplicants } from "./actions";
import { requireEmployer } from "../shared/employerServerUtils";
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
  const { applicants, jobs } = await getApplicants(job);

  return <ApplicantsTab initialApplicants={applicants} jobs={jobs} initialJobFilter={job ?? ""} />;
}
