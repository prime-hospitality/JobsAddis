import type { Metadata } from "next";
import { GlobalFetchInterceptor } from "@/components/GlobalFetchInterceptor";

export const metadata: Metadata = {
  title: "Admin Dashboard | Jobs Addis",
  description: "Addis Jobs admin control panel.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalFetchInterceptor />
      {children}
    </>
  );
}
