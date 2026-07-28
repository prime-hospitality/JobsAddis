// Mirrors Supabase Storage buckets to a local directory for the nightly backup.
//
// No Supabase backup covers Storage at any plan tier, so without this the CVs
// and employer logos have no copy anywhere. Restoring the database alone would
// leave every `cv_url` pointing at a file that no longer exists.
//
// Deliberately dependency-free, using the Storage REST API over plain fetch.
// It previously used @supabase/supabase-js, but that constructs a realtime
// WebSocket client on import -- which crashes on Node < 22 (no native
// WebSocket) despite this script never opening a socket. A backup that must
// not fail should not carry a dependency it doesn't use, nor an `npm install`
// step that can break on its own.
//
// Incremental: a file already present locally at the same byte size is
// skipped, so a nightly run costs one listing call plus whatever is new. That
// keeps the backup repo from re-committing hundreds of unchanged PDFs.
//
// Usage: node backup-storage.mjs <output-dir>

import { mkdir, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";

const OUT = process.argv[2];
if (!OUT) {
  console.error("Usage: node backup-storage.mjs <output-dir>");
  process.exit(1);
}

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!SUPABASE_URL || !KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

// Service role, because `resumes` is a private bucket (migration 20260725120000).
const authHeaders = { Authorization: `Bearer ${KEY}`, apikey: KEY };

const BUCKETS = ["resumes", "logos"];
const PAGE = 100;

/** Storage list() is not recursive -- it returns one directory level, where an
 *  entry with a null `id` is a folder. Walk it depth-first. */
async function* walk(bucket, prefix = "") {
  let offset = 0;
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        prefix,
        limit: PAGE,
        offset,
        sortBy: { column: "name", order: "asc" },
      }),
    });

    if (!res.ok) {
      throw new Error(`list ${bucket}/${prefix}: HTTP ${res.status} ${await res.text()}`);
    }

    const entries = await res.json();
    if (!Array.isArray(entries) || entries.length === 0) return;

    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null || entry.id === undefined) {
        yield* walk(bucket, path);
      } else {
        yield { path, size: entry.metadata?.size ?? null };
      }
    }

    if (entries.length < PAGE) return;
    offset += PAGE;
  }
}

let downloaded = 0;
let skipped = 0;
let failed = 0;

for (const bucket of BUCKETS) {
  console.log(`\n── ${bucket} ──`);
  let seen = 0;

  try {
    for await (const file of walk(bucket)) {
      seen++;
      const dest = join(OUT, bucket, file.path);

      // Skip if we already hold an identically sized copy.
      if (file.size !== null) {
        try {
          const existing = await stat(dest);
          if (existing.size === file.size) {
            skipped++;
            continue;
          }
        } catch {
          // Not present locally -- fall through and download.
        }
      }

      const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/${bucket}/${file.path.split("/").map(encodeURIComponent).join("/")}`,
        { headers: authHeaders },
      );

      if (!res.ok) {
        // One unreadable file must not abandon the rest of the backup.
        console.error(`  FAILED ${file.path}: HTTP ${res.status}`);
        failed++;
        continue;
      }

      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      downloaded++;
    }
    console.log(`  ${seen} file(s) in bucket`);
  } catch (err) {
    // A bucket that doesn't exist yet is not a failure -- `logos` may be empty
    // on a fresh project.
    console.error(`  Could not fully read bucket: ${err.message}`);
  }
}

console.log(`\nDownloaded ${downloaded}, skipped ${skipped} unchanged, ${failed} failed.`);

// Fail the run if files were found but none could be read -- that usually means
// the service role key is wrong, and a silently empty backup is the worst
// possible outcome.
if (failed > 0 && downloaded === 0) {
  console.error("::error::Every storage download failed -- check SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
