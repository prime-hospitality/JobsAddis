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
  let data;
  try {
    data = await getIdpData();
  } catch (err) {
    // If auth fails or data fetch fails, show login
    return <IdpLogin />;
  }

  return <IdpDashboard initialData={data} />;
}
