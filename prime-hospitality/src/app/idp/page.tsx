import { cookies } from "next/headers";
import IdpDashboard from "./IdpDashboard";
import IdpLogin from "./IdpLogin";
import { getIdpData } from "./actions";

export const metadata = {
  title: "IDP | Prime Hospitality",
};

export default async function IdpPage() {
  const authCookie = (await cookies()).get("idp_session");
  const isAuthenticated = !!authCookie?.value;

  if (!isAuthenticated) {
    return <IdpLogin />;
  }

  // Fetch initial telemetry data securely on the server
  let data = null;
  let errorMsg = null;
  try {
    data = await getIdpData();
  } catch (err: any) {
    console.error("IDP telemetry load error:", err);
    errorMsg = err.message || "Failed to load telemetry data";
  }

  return <IdpDashboard initialData={data} error={errorMsg} />;
}
