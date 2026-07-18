import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Employer Dashboard | Addis Jobs",
  description: "Manage your job postings, track applicants, and grow your team with Addis Jobs Employer Dashboard.",
};

export default function EmpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
