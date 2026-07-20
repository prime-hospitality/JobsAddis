import type { Metadata } from "next";
import { GlobalFetchInterceptor } from "@/components/GlobalFetchInterceptor";

export const metadata: Metadata = {
  title: "Employer Dashboard | Jobs Addis",
  description: "Manage your job postings, track applicants, and grow your team with Jobs Addis Employer Dashboard.",
};

export default function EmpLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalFetchInterceptor />
      {children}
    </>
  );
}
