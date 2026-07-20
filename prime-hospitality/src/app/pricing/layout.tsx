import type { Metadata } from "next";
import { GlobalFetchInterceptor } from "@/components/GlobalFetchInterceptor";

export const metadata: Metadata = {
  title: "Pricing | JobsAdis",
  description: "Explore JobsAdis employer pricing plans.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalFetchInterceptor />
      {children}
    </>
  );
}
