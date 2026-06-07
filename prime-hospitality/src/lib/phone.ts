/**
 * Validates and normalizes an Ethiopian phone number.
 * Supported formats:
 * - 09XXXXXXXX (10 digits)
 * - 07XXXXXXXX (10 digits)
 * - 9XXXXXXXX (9 digits)
 * - 7XXXXXXXX (9 digits)
 * - +2519XXXXXXXX (12 digits excluding +)
 * - +2517XXXXXXXX (12 digits excluding +)
 * - 2519XXXXXXXX (12 digits)
 * - 2517XXXXXXXX (12 digits)
 * 
 * Returns { isValid: boolean, normalized: string | null }
 */
export function validateEthiopianPhoneNumber(value: string): { isValid: boolean; normalized: string | null } {
  // Clean all non-digit characters
  const digits = value.replace(/\D/g, "");
  
  // Case 1: starts with 251 (12 digits)
  if (digits.startsWith("251") && digits.length === 12) {
    const carrier = digits.substring(3, 4); // The digit after 251
    if (carrier === "9" || carrier === "7") {
      return { isValid: true, normalized: "+" + digits };
    }
  }
  
  // Case 2: starts with 0 (10 digits)
  if (digits.startsWith("0") && digits.length === 10) {
    const carrier = digits.substring(1, 2); // The digit after 0
    if (carrier === "9" || carrier === "7") {
      return { isValid: true, normalized: "+251" + digits.substring(1) };
    }
  }
  
  // Case 3: starts with 9 or 7 directly (9 digits)
  if (digits.length === 9) {
    const carrier = digits.substring(0, 1);
    if (carrier === "9" || carrier === "7") {
      return { isValid: true, normalized: "+251" + digits };
    }
  }
  
  return { isValid: false, normalized: null };
}

/**
 * Normalizes any phone number input into the E.164 database format "+251XXXXXXXXX".
 * Returns null if the phone number is invalid.
 */
export function normalizePhoneNumber(value: string): string | null {
  const result = validateEthiopianPhoneNumber(value);
  return result.normalized;
}

/**
 * Formats any normalized/unnormalized phone number into the formal display format "+251 9X XXX XXXX" or "+251 7X XXX XXXX".
 * e.g., "+251911223344" -> "+251 91 122 3344"
 * e.g., "0911223344" -> "+251 91 122 3344"
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone) return "Not set";
  
  const result = validateEthiopianPhoneNumber(phone);
  if (!result.isValid || !result.normalized) {
    // If it's not a valid Ethiopian phone number but exists, return cleaned digits with "+"
    const cleaned = phone.replace(/[^\d+]/g, "");
    return cleaned.startsWith("+") ? cleaned : "+" + cleaned;
  }
  
  const normalized = result.normalized.substring(1); // remove the leading "+"
  
  const countryCode = "+251";
  const carrier = normalized.substring(3, 4); // "9" or "7"
  const restOfCode = normalized.substring(4, 5); // next digit, e.g. "1" in "91"
  const part2 = normalized.substring(5, 8); // e.g. "122"
  const part3 = normalized.substring(8, 12); // e.g. "3344"
  
  return `${countryCode} ${carrier}${restOfCode} ${part2} ${part3}`;
}
