#!/usr/bin/env node
'use strict';

/**
 * Delete CV files in the `resumes` bucket that no profile points at.
 *
 * Uploads used to reuse one filename per seeker and overwrite in place, so a
 * replacement CV consumed no extra storage. That stopped being possible when
 * anonymous clients lost their UPDATE policy on storage.objects: every upload
 * now writes a new timestamped object instead. The server deletes the previous
 * file on replacement, but that delete was reading the old full-URL form of
 * profiles.cv_url and silently matched nothing once uploads switched to storing
 * a bare path -- so every CV replaced between those two changes leaked a file.
 *
 * This is the one-off broom for that window. Ongoing cleanup is handled by the
 * update_cv action in supabase/functions/validate-telegram-auth.
 *
 *   node scripts/prune-orphan-cvs.cjs             report what would go (default)
 *   node scripts/prune-orphan-cvs.cjs --delete    actually delete it
 *   node scripts/prune-orphan-cvs.cjs --grace 48  keep anything newer than 48h
 *
 * Reads the bucket live and deletes nothing unless --delete is passed. An
 * object is orphaned only if NO profile row references it, so a CV shared by
 * two rows survives. Recent files are held back by a grace window because an
 * upload that is in flight has an object but no cv_url yet -- deleting inside
 * that gap would destroy a CV the seeker is in the middle of uploading.
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY: RLS gives anonymous callers no DELETE on
 * storage.objects, which is the whole reason this cannot run in the browser.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT, 'prime-hospitality', '.env.local');

const BUCKET = 'resumes';
const PAGE = 1000;

// Supabase writes this marker so an otherwise empty folder still shows up in the
// dashboard. No profile will ever reference it, so it looks exactly like an
// orphan and is not one -- deleting it just makes cvs/ vanish from the UI.
const PLACEHOLDER = '.emptyFolderPlaceholder';

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const DELETE = argv.includes('--delete');
const graceIdx = argv.indexOf('--grace');
const GRACE_HOURS = graceIdx !== -1 && argv[graceIdx + 1] ? Number(argv[graceIdx + 1]) : 24;

if (!Number.isFinite(GRACE_HOURS) || GRACE_HOURS < 0) {
  console.error('--grace needs a non-negative number of hours');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Read .env.local by hand -- this script has no dependencies and wants none. */
function readEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const fileEnv = readEnvFile(ENV_FILE);
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SB_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  fileEnv.SB_SECRET_KEY ||
  fileEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Looked in the environment and ' + ENV_FILE);
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: 'Bearer ' + SERVICE_KEY,
  'Content-Type': 'application/json',
};

async function api(url, init) {
  const res = await fetch(url, Object.assign({ headers }, init));
  if (!res.ok) {
    throw new Error(init.method + ' ' + url + ' -> ' + res.status + ' ' + (await res.text()));
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// The same path resolution the app and the edge functions use. Kept in step
// with src/lib/cvStorage.ts and supabase/functions/_shared/resumes.ts by hand.
// ---------------------------------------------------------------------------

function resumeStoragePath(cvUrl) {
  if (!cvUrl) return null;
  const marker = '/' + BUCKET + '/';
  const idx = cvUrl.indexOf(marker);
  if (idx !== -1) {
    const p = cvUrl.slice(idx + marker.length).split('?')[0];
    return p || null;
  }
  if (cvUrl.startsWith('http://') || cvUrl.startsWith('https://')) return null;
  return cvUrl.replace(/^\/+/, '') || null;
}

// ---------------------------------------------------------------------------
// Reading both sides
// ---------------------------------------------------------------------------

/**
 * Every object under a prefix. The list endpoint returns one page at a time and
 * reports folders as entries with a null id, so it has to recurse.
 */
async function listObjects(prefix) {
  const found = [];
  let offset = 0;

  for (;;) {
    const page = await api(SUPABASE_URL + '/storage/v1/object/list/' + BUCKET, {
      method: 'POST',
      body: JSON.stringify({
        prefix,
        limit: PAGE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      }),
    });

    for (const entry of page) {
      const full = prefix ? prefix + entry.name : entry.name;
      if (entry.id === null) {
        // A folder placeholder, not a file. Descend.
        found.push.apply(found, await listObjects(full + '/'));
      } else {
        found.push({
          path: full,
          createdAt: entry.created_at || (entry.metadata && entry.metadata.lastModified) || null,
        });
      }
    }

    if (page.length < PAGE) break;
    offset += PAGE;
  }

  return found;
}

/** Every path referenced by a profile, in both the legacy URL and bare forms. */
async function listReferencedPaths() {
  const referenced = new Set();
  let offset = 0;

  for (;;) {
    const rows = await api(
      SUPABASE_URL +
        '/rest/v1/profiles?select=cv_url&cv_url=not.is.null&limit=' +
        PAGE +
        '&offset=' +
        offset,
      { method: 'GET' }
    );

    for (const row of rows) {
      const p = resumeStoragePath(row.cv_url);
      if (p) referenced.add(p);
    }

    if (rows.length < PAGE) break;
    offset += PAGE;
  }

  return referenced;
}

// ---------------------------------------------------------------------------

async function main() {
  console.log('Project : ' + SUPABASE_URL);
  console.log('Mode    : ' + (DELETE ? 'DELETE' : 'dry run (pass --delete to remove)'));
  console.log('Grace   : keeping anything uploaded in the last ' + GRACE_HOURS + 'h');
  console.log('');

  const [objects, referenced] = await Promise.all([listObjects(''), listReferencedPaths()]);

  console.log('Objects in bucket      : ' + objects.length);
  console.log('Referenced by a profile: ' + referenced.size);

  const cutoff = Date.now() - GRACE_HOURS * 3600 * 1000;
  const orphans = [];
  let heldBack = 0;

  for (const obj of objects) {
    if (referenced.has(obj.path)) continue;
    if (obj.path === PLACEHOLDER || obj.path.endsWith('/' + PLACEHOLDER)) continue;
    const created = obj.createdAt ? Date.parse(obj.createdAt) : NaN;
    // Unparseable timestamp is treated as recent: skipping a file costs storage,
    // deleting a live one costs someone their CV.
    if (!Number.isFinite(created) || created > cutoff) {
      heldBack++;
      continue;
    }
    orphans.push(obj);
  }

  console.log('Held back by grace     : ' + heldBack);
  console.log('Orphaned               : ' + orphans.length);
  console.log('');

  if (orphans.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  for (const o of orphans) {
    console.log('  ' + (DELETE ? 'delete ' : 'would delete ') + o.path + '  (' + o.createdAt + ')');
  }
  console.log('');

  if (!DELETE) {
    console.log('Dry run -- nothing was deleted. Re-run with --delete to remove these.');
    return;
  }

  // Batched: one request per 100 keeps the URL and the transaction sane.
  let removed = 0;
  for (let i = 0; i < orphans.length; i += 100) {
    const batch = orphans.slice(i, i + 100).map((o) => o.path);
    const res = await fetch(SUPABASE_URL + '/storage/v1/object/' + BUCKET, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ prefixes: batch }),
    });
    if (!res.ok) {
      console.error('Batch failed: ' + res.status + ' ' + (await res.text()));
      process.exitCode = 1;
      continue;
    }
    removed += batch.length;
  }

  console.log('Deleted ' + removed + ' orphaned file(s).');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
