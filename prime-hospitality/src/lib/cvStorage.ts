/**
 * Helpers for the private `resumes` bucket.
 *
 * A seeker's CV is meant to be seen by the seeker themselves and by the employers
 * whose jobs they applied to — nobody else. The bucket is therefore private and
 * files are only reachable through short-lived signed URLs minted server-side.
 *
 * `profiles.cv_url` historically stored a full public URL, and newer uploads store
 * a bare storage path. Both forms are in the table, so always resolve through
 * `resumeStoragePath` before signing.
 */

export const RESUMES_BUCKET = "resumes";

/** How long a signed CV link stays valid. Long enough to open, short enough not to leak. */
export const CV_SIGNED_URL_TTL_SECONDS = 300;

/**
 * Derive the object path inside the `resumes` bucket from whatever is stored in
 * `profiles.cv_url` — either a legacy public URL (".../object/public/resumes/cvs/x.pdf")
 * or an already-bare path ("cvs/x.pdf"). Returns null when there is no CV.
 */
export function resumeStoragePath(cvUrl: string | null | undefined): string | null {
  if (!cvUrl) return null;

  const marker = `/${RESUMES_BUCKET}/`;
  const idx = cvUrl.indexOf(marker);
  if (idx !== -1) {
    const path = cvUrl.slice(idx + marker.length).split("?")[0];
    return path || null;
  }

  // Already a bare path — anything else is not a resumes object.
  if (cvUrl.startsWith("http://") || cvUrl.startsWith("https://")) return null;
  return cvUrl.replace(/^\/+/, "") || null;
}

/**
 * What a browser will do with this CV. Uploads accept PDF and Word, and the
 * original extension is kept in the stored filename, so the file itself never
 * has to be fetched to tell.
 *
 * Browsers render a PDF in the tab but cannot display .doc/.docx — those
 * download instead. Saying so on the button stops a working download from
 * reading as a broken "View".
 */
export function cvOpensInBrowser(cvUrl: string | null | undefined): boolean {
  const path = resumeStoragePath(cvUrl);
  return path ? path.toLowerCase().endsWith(".pdf") : false;
}

/** Button text that matches what actually happens: "View CV" or "Download CV (Word)". */
export function cvActionLabel(cvUrl: string | null | undefined): string {
  return cvOpensInBrowser(cvUrl) ? "View CV" : "Download CV (Word)";
}
