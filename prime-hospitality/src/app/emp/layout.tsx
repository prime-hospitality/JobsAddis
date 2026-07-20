import type { Metadata } from "next";
import { GlobalFetchInterceptor } from "@/components/GlobalFetchInterceptor";

export const metadata: Metadata = {
  title: "Employer Dashboard | JobsAdis",
  description: "Manage your job postings, track applicants, and grow your team with JobsAdis Employer Dashboard.",
};

export default function EmpLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalFetchInterceptor />
      {children}
    </>
  );
}
