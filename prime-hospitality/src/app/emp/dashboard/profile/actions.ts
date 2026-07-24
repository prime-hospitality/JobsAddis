"use server";

import { getSupabase, requireEmployer, logEmployerActivity } from "../shared/employerServerUtils";
import { refreshEmployerSessionCookie } from "../../actions";

export interface EmployerProfileData {
  businessName: string;
  businessType: string;
  description: string;
  logoUrl: string | null;
  businessTypes: { id: string; name: string }[];
}

export type UpdateProfileResult = { success: true } | { success: false; error: string };

const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export async function getEmployerProfile(): Promise<EmployerProfileData> {
  const session = await requireEmployer();
  if (!session) throw new Error("Unauthorized");

  const supabase = getSupabase();
  const [employerRes, typesRes] = await Promise.all([
    supabase
      .from("employers")
      .select("business_name, business_type, description, logo_url")
      .eq("id", session.employerId)
      .single(),
    supabase.from("business_types").select("id, name").order("created_at", { ascending: true }),
  ]);

  if (employerRes.error || !employerRes.data) {
    throw new Error(employerRes.error?.message || "Employer not found");
  }

  return {
    businessName: employerRes.data.business_name,
    businessType: employerRes.data.business_type,
    description: employerRes.data.description || "",
    logoUrl: employerRes.data.logo_url || null,
    businessTypes: typesRes.data || [],
  };
}

/** Best-effort: adds a new custom business type to the shared lookup table so
 *  it shows up as a normal option for other employers and in the admin edit
 *  dropdown. Mirrors admin/actions.ts's addBusinessType dedupe logic, minus
 *  the admin-permission gate (that gate reads the admin session cookie, not
 *  the employer one, so it can't be reused here). */
async function ensureBusinessTypeInLookup(supabase: ReturnType<typeof getSupabase>, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;

  try {
    const { data: existing } = await supabase
      .from("business_types")
      .select("id")
      .ilike("name", trimmed)
      .maybeSingle();
    if (existing) return;

    await supabase.from("business_types").insert({ name: trimmed });
  } catch (err) {
    console.error("Failed to add business type to lookup:", err);
  }
}

function validateProfileForm(businessName: string, businessType: string, description: string): string | null {
  if (!businessName.trim()) return "Business name is required.";
  if (!businessType.trim()) return "Business type is required.";
  if (description.length > MAX_DESCRIPTION_LENGTH) return `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`;
  return null;
}

export async function updateEmployerProfile(formData: FormData): Promise<UpdateProfileResult> {
  const session = await requireEmployer();
  if (!session) return { success: false, error: "Unauthorized" };

  const businessName = String(formData.get("businessName") || "").trim();
  const businessType = String(formData.get("businessType") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const removeLogo = formData.get("removeLogo") === "true";
  const logoFile = formData.get("logo");

  const validationError = validateProfileForm(businessName, businessType, description);
  if (validationError) return { success: false, error: validationError };

  const supabase = getSupabase();

  const { data: current, error: curErr } = await supabase
    .from("employers")
    .select("business_name, business_type, description, logo_url")
    .eq("id", session.employerId)
    .single();
  if (curErr || !current) return { success: false, error: "Failed to load current profile." };

  let finalLogoUrl: string | null = current.logo_url;

  if (logoFile instanceof File && logoFile.size > 0) {
    if (!logoFile.type.startsWith("image/")) return { success: false, error: "Logo must be an image file." };
    if (logoFile.size > MAX_LOGO_BYTES) return { success: false, error: "Logo image must be smaller than 5MB." };

    const fileExt = logoFile.name.split(".").pop() || "jpg";
    const fileName = `${session.employerId}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("logos").upload(fileName, logoFile);
    if (uploadError) return { success: false, error: "Failed to upload logo image." };

    const { data: publicUrlData } = supabase.storage.from("logos").getPublicUrl(fileName);
    finalLogoUrl = publicUrlData.publicUrl;
  } else if (removeLogo) {
    finalLogoUrl = null;
  }

  await ensureBusinessTypeInLookup(supabase, businessType);

  const { error: updateError } = await supabase
    .from("employers")
    .update({
      business_name: businessName,
      business_type: businessType,
      description: description || null,
      logo_url: finalLogoUrl,
    })
    .eq("id", session.employerId);

  if (updateError) return { success: false, error: updateError.message || "Failed to update profile." };

  // Only clean up the old logo file after the DB update has succeeded, so a
  // failed upload/update never leaves the employer without any logo at all.
  if (finalLogoUrl !== current.logo_url && current.logo_url) {
    const oldPath = current.logo_url.split("/logos/")[1];
    if (oldPath) {
      try {
        await supabase.storage.from("logos").remove([oldPath]);
      } catch (err) {
        console.error("Failed to remove old logo file:", err);
      }
    }
  }

  const changedFields: string[] = [];
  if (businessName !== current.business_name) changedFields.push("businessName");
  if (businessType !== current.business_type) changedFields.push("businessType");
  if (description !== (current.description || "")) changedFields.push("description");
  if (finalLogoUrl !== current.logo_url) changedFields.push("logo");

  await logEmployerActivity(session, "employer_edit_profile", businessName, { changedFields });
  await refreshEmployerSessionCookie({ businessName, businessType, logoUrl: finalLogoUrl });

  return { success: true };
}
