/** Ethiopian TIN (Taxpayer Identification Number), issued by the Ministry of
 *  Revenues: exactly 10 digits, no letters, no offline-verifiable check digit.
 *
 *  Employers copy it off a certificate that prints it grouped ("00 12 34 56
 *  78"), so anything typed is normalised before it's validated or stored --
 *  the column only ever holds the bare 10 digits, which is what the DB CHECK
 *  constraint in 20260805000000_add_tin_number_to_employers.sql enforces too.
 *  Shared by the employer onboarding form, the dashboard TIN gate and the
 *  admin employer editor so all three agree on what counts as valid. */

export const TIN_LENGTH = 10;

/** Strips the separators a certificate might be transcribed with. Anything
 *  else (letters, symbols) is deliberately left in so validateTin can reject
 *  it rather than silently "fixing" a genuinely wrong number. */
export function normalizeTin(raw: string): string {
  return (raw || "").replace(/[\s\-/.]/g, "");
}

/** Returns an error message, or null when the TIN is acceptable. */
export function validateTin(raw: string): string | null {
  const tin = normalizeTin(raw);

  if (!tin) return "TIN number is required.";
  if (!/^\d+$/.test(tin)) return "TIN number must contain digits only.";
  if (tin.length !== TIN_LENGTH) {
    return `TIN number must be exactly ${TIN_LENGTH} digits (you entered ${tin.length}).`;
  }
  // Not rules the Ministry publishes -- they just catch the placeholders every
  // form eventually collects before they're stored as if they were real
  // taxpayer numbers: a held-down key ("0000000000") or a walk along the
  // number row ("1234567890", "9876543210"). A genuine TIN landing on one of
  // these is possible in principle and vanishingly unlikely in practice; an
  // employer who hits it can ask an admin to set the number for them.
  if (isRepeatedDigit(tin) || isSequential(tin)) return "Please enter your real TIN number.";

  return null;
}

function isRepeatedDigit(tin: string): boolean {
  return /^(\d)\1{9}$/.test(tin);
}

/** True for a straight run in either direction, counting the 9->0 wrap so
 *  "1234567890" is caught alongside "0123456789". */
function isSequential(tin: string): boolean {
  const step = (want: number) =>
    [...tin].every((ch, i) => i === 0 || (Number(ch) - Number(tin[i - 1]) + 10) % 10 === want);
  return step(1) || step(9);
}

/** A TIN belongs to one employer account (the employers_tin_number_unique
 *  index). The index is the authority rather than a pre-flight SELECT, which
 *  would race two employers submitting the same number at once -- so every
 *  write path catches the violation instead of trying to predict it. */
export const TIN_TAKEN_ERROR =
  "That TIN number is already registered to another business. Contact support if this is your number.";

export function isDuplicateTin(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === "23505" && (error.message || "").includes("employers_tin_number_unique");
}

/** Groups the stored digits for display only (0012345678 -> 00 1234 5678).
 *  Never feed the result back into storage or validation. */
export function formatTin(tin: string | null | undefined): string {
  const normalized = normalizeTin(tin || "");
  if (normalized.length !== TIN_LENGTH) return normalized;
  return `${normalized.slice(0, 2)} ${normalized.slice(2, 6)} ${normalized.slice(6)}`;
}
