import type { Metadata } from "next";
import { GlobalFetchInterceptor } from "@/components/GlobalFetchInterceptor";

export const metadata: Metadata = {
  title: "Pricing | Jobs Addis",
  description: "Explore Jobs Addis employer pricing plans.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalFetchInterceptor />
      {children}
    </>
  );
}
