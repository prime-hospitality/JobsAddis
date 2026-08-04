/**
 * Resolving a stored CV reference to an object in the private `resumes` bucket.
 *
 * `profiles.cv_url` holds one of two shapes. Older rows store a full public URL
 * from the days the bucket was public (".../object/public/resumes/cvs/x.pdf");
 * newer uploads store a bare storage path ("cvs/x.pdf"). Anything that wants to
 * sign, delete, or otherwise touch the file has to collapse both into a path
 * first, so that logic lives here rather than being rewritten per call site.
 *
 * This mirrors `resumeStoragePath` in src/lib/cvStorage.ts. The two cannot share
 * a module — one runs in Deno, the other in Next — so they have to be kept in
 * step by hand.
 */

export const RESUMES_BUCKET = "resumes";

/** How long a signed CV link stays valid. Long enough to open, short enough not to leak. */
export const CV_SIGNED_URL_TTL_SECONDS = 300;

/**
 * The object path inside the `resumes` bucket, or null when there is no CV or the
 * value points somewhere that isn't a resumes object.
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
