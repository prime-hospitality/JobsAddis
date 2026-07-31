/** No package at all counts the same as an expired one -- posting, extending
 *  a deadline, and viewing new applicants all require a currently-valid
 *  package, so "never had one" and "had one, it lapsed" behave identically. */
export function isSubscriptionExpired(packageExpiresAt: string | null | undefined): boolean {
  return !packageExpiresAt || new Date(packageExpiresAt) < new Date();
}
