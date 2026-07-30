#!/usr/bin/env node
'use strict';

/**
 * Is this machine ready to work on JobsAddis?
 *
 * The project moves between a Mac and a Windows PC, and everything that breaks
 * on arrival has the same shape: state that git does not carry. Dependencies,
 * .env.local, the Supabase CLI link, the git identity, the hooks path and the
 * Node version all live outside the repository, so a pull brings code that
 * expects them and says nothing about the ones that are missing.
 *
 * This lists them in one place.
 *
 *   node scripts/doctor.cjs            report, exit 1 if something is broken
 *   node scripts/doctor.cjs --fix      fix what can be fixed, then report
 *   node scripts/doctor.cjs --quiet    print only problems (used by git hooks)
 *   node scripts/doctor.cjs --install-hooks   arm the hooks and nothing else
 *
 * Deliberately written for old Node: `node` on the Mac resolves to v14, and
 * this has to run there to be able to say so. No optional chaining, no ??.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const spawnSync = require('child_process').spawnSync;

const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'prime-hospitality');

const CONFIG = {
  // next@16 requires this. The Mac's /usr/local/bin/node is v14 and shadows
  // Homebrew's, which is the most confusing failure on that machine: every
  // build dies somewhere deep inside Next with no mention of Node.
  nodeMinimum: '20.9.0',
  gitName: 'elias',
  gitEmail: 'eliashabibhamidabdu@gmail.com',
  // 359 commits are authored to this. It is the same address with the @ typed
  // as a dot, so GitHub has never linked any of them to the account.
  gitEmailTypo: 'eliashabibhamidabdu.gmail.com',
  hooksPath: '.githooks',
  supabaseProjectRef: 'rrypxbkipixmuufzkdxp',
};

// Only the variables the Next.js app itself reads. The TELEGRAM_* values and
// SB_SECRET_KEY are read by Edge Functions through Deno.env, which means they
// live in Supabase's own secret store and are not needed on a dev machine --
// listing them here would demand values nobody can supply locally.
const REQUIRED_ENV = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    where: 'Supabase dashboard -> Project Settings -> API -> Project URL',
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    where: 'Supabase dashboard -> Project Settings -> API -> anon / publishable key',
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    where: 'Supabase dashboard -> Project Settings -> API -> service_role key (secret)',
  },
  // Fallbacks only, so not required to work. Both real passwords are bcrypt
  // hashes in the app_config table, and verifyConfigPassword prefers those --
  // the env value is reached only if the row is missing. Worth setting so the
  // built-in default is never what stands in, not worth failing a machine over.
  {
    key: 'ADMIN_PASSWORD',
    optional: true,
    where: 'your choice -- only used if app_config.admin_password is missing (it is set)',
  },
  {
    key: 'IDP_PASSWORD',
    optional: true,
    where: 'your choice -- only used if app_config.idp_password is missing (it is set)',
  },
];

const args = process.argv.slice(2);
const FIX = args.indexOf('--fix') !== -1;
const QUIET = args.indexOf('--quiet') !== -1;
const HOOKS_ONLY = args.indexOf('--install-hooks') !== -1;

/* ------------------------------------------------------------------ helpers */

function run(cmd, cmdArgs, opts) {
  const options = Object.assign({ cwd: ROOT, encoding: 'utf8' }, opts || {});
  const result = spawnSync(cmd, cmdArgs, options);
  return {
    ok: result.status === 0,
    out: (result.stdout || '').trim(),
  };
}

function git(gitArgs) {
  const result = run('git', gitArgs);
  return result.ok ? result.out : null;
}

function versionParts(value) {
  return String(value).replace(/^v/, '').split('.').map(function (part) {
    return parseInt(part, 10) || 0;
  });
}

function atLeast(actual, minimum) {
  const a = versionParts(actual);
  const b = versionParts(minimum);
  for (let i = 0; i < 3; i++) {
    const left = a[i] || 0;
    const right = b[i] || 0;
    if (left > right) return true;
    if (left < right) return false;
  }
  return true;
}

function readIfPresent(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
    return null;
  }
}

function result(level, label, message, hint, fix) {
  return {
    level: level,
    label: label,
    message: message,
    hint: hint || [],
    fix: fix || null,
  };
}

/* ------------------------------------------------------------------- checks */

function checkNode() {
  const current = process.version;
  if (atLeast(current, CONFIG.nodeMinimum)) {
    return [result('ok', 'Node', current)];
  }

  const hint = [];
  const candidates = [
    '/opt/homebrew/opt/node/bin/node',
    '/opt/homebrew/bin/node',
    '/usr/local/opt/node/bin/node',
  ];

  let found = null;
  for (let i = 0; i < candidates.length && !found; i++) {
    if (!fs.existsSync(candidates[i])) continue;
    const probe = run(candidates[i], ['--version']);
    if (probe.ok && atLeast(probe.out, CONFIG.nodeMinimum)) {
      found = { bin: candidates[i], version: probe.out };
    }
  }

  if (found) {
    hint.push('This machine already has ' + found.version + ', but an older one wins on PATH.');
    hint.push('Put it first, for this shell or in ~/.zshrc:');
    hint.push('  export PATH="' + path.dirname(found.bin) + ':$PATH"');
  } else if (os.platform() === 'win32') {
    hint.push('Install a current Node LTS from nodejs.org, or use nvm-windows.');
  } else {
    hint.push('Install a current Node LTS: brew install node');
  }

  return [
    result(
      'fail',
      'Node',
      current + ' -- next@16 needs >= ' + CONFIG.nodeMinimum,
      hint
    ),
  ];
}

function checkGitIdentity() {
  const name = git(['config', 'user.name']);
  const email = git(['config', 'user.email']);

  const fix = function () {
    run('git', ['config', 'user.name', CONFIG.gitName]);
    run('git', ['config', 'user.email', CONFIG.gitEmail]);
  };

  if (!email) {
    return [
      result('fail', 'Git identity', 'not set -- commits get attributed to the machine account', [
        'Set for this repository only:',
        '  git config user.email "' + CONFIG.gitEmail + '"',
      ], fix),
    ];
  }

  if (email === CONFIG.gitEmailTypo) {
    return [
      result('fail', 'Git identity', email + ' -- the @ is typed as a dot', [
        'GitHub cannot link commits to the account with this address, which is',
        'why 359 commits show as an unrecognised author.',
      ], fix),
    ];
  }

  if (email.indexOf('@') === -1) {
    return [
      result('fail', 'Git identity', email + ' -- not a valid address', [], fix),
    ];
  }

  return [result('ok', 'Git identity', (name || '?') + ' <' + email + '>')];
}

function checkHooks() {
  const results = [];
  const current = git(['config', 'core.hooksPath']);

  const fix = function () {
    run('git', ['config', 'core.hooksPath', CONFIG.hooksPath]);
    makeHooksExecutable();
  };

  if (current !== CONFIG.hooksPath) {
    results.push(
      result('fail', 'Git hooks', 'not installed -- nothing is checking commits on this machine', [
        'This is per-machine config, so it does not arrive with a clone. It is',
        'how a service_role key reached the public repo on 2026-07-18.',
        '  git config core.hooksPath ' + CONFIG.hooksPath,
      ], fix)
    );
    return results;
  }

  // A hook that is not executable is silently skipped by Git, which looks
  // exactly like a hook that is working and finding nothing.
  if (os.platform() !== 'win32') {
    const notExecutable = hookFiles().filter(function (file) {
      try {
        fs.accessSync(file, fs.constants.X_OK);
        return false;
      } catch (err) {
        return true;
      }
    });

    if (notExecutable.length) {
      results.push(
        result('fail', 'Git hooks', notExecutable.length + ' hook(s) are not executable, so Git skips them', [
          'chmod +x ' + CONFIG.hooksPath + '/*',
        ], makeHooksExecutable)
      );
      return results;
    }
  }

  results.push(result('ok', 'Git hooks', 'installed (' + hookFiles().length + ' active)'));
  return results;
}

function hookFiles() {
  const dir = path.join(ROOT, CONFIG.hooksPath);
  let entries = [];
  try {
    entries = fs.readdirSync(dir);
  } catch (err) {
    return [];
  }
  return entries
    .filter(function (name) {
      return fs.statSync(path.join(dir, name)).isFile();
    })
    .map(function (name) {
      return path.join(dir, name);
    });
}

function makeHooksExecutable() {
  if (os.platform() === 'win32') return;
  const all = hookFiles().concat([path.join(ROOT, CONFIG.hooksPath, 'lib', 'scan-secrets.sh')]);
  all.forEach(function (file) {
    try {
      fs.chmodSync(file, 0o755);
    } catch (err) {
      /* nothing useful to do about one unreadable file */
    }
  });
}

/**
 * Fingerprinted from package.json rather than package-lock.json on purpose.
 * `npm install` on the Mac rewrites the lockfile with optional @emnapi platform
 * packages, so a lockfile hash would differ from the committed one immediately
 * after a successful install and demand another one, forever.
 */
function depsFingerprint() {
  const raw = readIfPresent(path.join(APP, 'package.json'));
  if (!raw) return null;
  const pkg = JSON.parse(raw);
  const payload = JSON.stringify([pkg.dependencies || {}, pkg.devDependencies || {}]);
  return crypto.createHash('sha1').update(payload).digest('hex');
}

function stampPath() {
  return path.join(APP, 'node_modules', '.jobsaddis-deps');
}

function checkDependencies() {
  const want = depsFingerprint();
  if (!want) {
    return [result('fail', 'Dependencies', 'prime-hospitality/package.json is missing')];
  }

  const installed = fs.existsSync(path.join(APP, 'node_modules'));
  const stamp = readIfPresent(stampPath());

  const fix = function () {
    // Installing under a Node this old fails deep inside a postinstall script
    // with nothing that points at the Node version, so refuse and say why. Fix
    // the PATH first and the install works the first time.
    if (!atLeast(process.version, CONFIG.nodeMinimum)) {
      process.stdout.write(
        '  skipping npm install -- fix the Node version above first, or it fails obscurely\n'
      );
      return;
    }
    process.stdout.write('  installing dependencies...\n');
    const install = spawnSync('npm', ['install'], {
      cwd: APP,
      stdio: 'inherit',
      shell: true,
    });
    if (install.status === 0) {
      fs.writeFileSync(stampPath(), want);
    }
  };

  if (!installed) {
    return [
      result('fail', 'Dependencies', 'node_modules is missing', [
        'cd prime-hospitality && npm install',
      ], fix),
    ];
  }

  // No stamp at all means node_modules predates this script rather than that
  // anything is wrong, so it is worth recording but not worth alarm.
  if (!stamp) {
    return [
      result('warn', 'Dependencies', 'installed, but not yet recorded on this machine', [
        'Run `npm run setup` once so future pulls can tell whether the packages',
        'you have still match package.json.',
      ], fix),
    ];
  }

  if (stamp !== want) {
    return [
      result('fail', 'Dependencies', 'package.json has changed since the last install', [
        'Whatever you just pulled added or bumped a package. Until you install,',
        'the failure shows up as a module that cannot be found.',
        '  cd prime-hospitality && npm install',
      ], fix),
    ];
  }

  return [result('ok', 'Dependencies', 'in sync with package.json')];
}

function parseEnv(text) {
  const values = {};
  text.split(/\r?\n/).forEach(function (line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.charAt(0) === '#') return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    value = value.replace(/^["']|["']$/g, '');
    values[key] = value;
  });
  return values;
}

function looksUnset(value) {
  if (!value) return true;
  return /your_|_here|change_me|changeme|placeholder|^xxx/i.test(value);
}

function checkEnv() {
  const file = path.join(APP, '.env.local');
  const raw = readIfPresent(file);

  const missing = [];
  const values = raw ? parseEnv(raw) : {};
  REQUIRED_ENV.forEach(function (entry) {
    if (looksUnset(values[entry.key])) missing.push(entry);
  });

  if (!missing.length) {
    return [result('ok', 'Environment', REQUIRED_ENV.length + ' keys set')];
  }

  // Only the keys the app cannot run without are worth failing over.
  const blocking = missing.filter(function (entry) {
    return !entry.optional;
  });
  const level = blocking.length ? 'fail' : 'warn';

  const hint = [];
  if (!raw) {
    hint.push('prime-hospitality/.env.local does not exist on this machine.');
  }
  hint.push('Missing or unset:');
  missing.forEach(function (entry) {
    hint.push('  ' + entry.key);
    hint.push('      ' + entry.where);
  });
  hint.push('This file is gitignored, so it never travels between machines --');
  hint.push('copy the values across by hand or from the Vercel dashboard.');

  // Writes the keys in as comments rather than as empty assignments: an empty
  // value is read by Next as a set-but-blank variable, which fails further from
  // the cause than a genuinely absent one.
  const fix = function () {
    const lines = [];
    if (!raw) {
      lines.push('# Local development values for the Next.js app.');
      lines.push('# Gitignored. Never commit this file.');
      lines.push('');
    } else {
      lines.push('');
      lines.push('# --- added by `npm run setup` -- fill these in ---');
    }
    missing.forEach(function (entry) {
      lines.push('# ' + entry.where);
      lines.push('# ' + entry.key + '=');
      lines.push('');
    });
    fs.appendFileSync(file, lines.join('\n'));
    process.stdout.write('  wrote the missing keys into prime-hospitality/.env.local as comments\n');
  };

  return [
    result(level, 'Environment', missing.length + ' of ' + REQUIRED_ENV.length + ' keys missing', hint, fix),
  ];
}

function checkSupabaseLink() {
  const refFile = path.join(APP, 'supabase', '.temp', 'project-ref');
  const linked = readIfPresent(refFile);

  if (!linked) {
    return [
      result('warn', 'Supabase CLI', 'not linked on this machine', [
        'Link state lives in the gitignored supabase/.temp/, so it is per-machine.',
        'Only needed for `db push` and `functions deploy`, not for `npm run dev`.',
        '  cd prime-hospitality',
        '  npx supabase login',
        '  npx supabase link --project-ref ' + CONFIG.supabaseProjectRef,
      ]),
    ];
  }

  if (linked.trim() !== CONFIG.supabaseProjectRef) {
    return [
      result('fail', 'Supabase CLI', 'linked to ' + linked.trim() + ', expected ' + CONFIG.supabaseProjectRef, [
        'Re-link before deploying anything:',
        '  cd prime-hospitality && npx supabase link --project-ref ' + CONFIG.supabaseProjectRef,
      ]),
    ];
  }

  return [result('ok', 'Supabase CLI', 'linked to ' + CONFIG.supabaseProjectRef)];
}

function checkLockfileNoise() {
  const dirty = git(['status', '--porcelain', '--', 'prime-hospitality/package-lock.json']);
  if (!dirty) return [];

  return [
    result('warn', 'Lockfile', 'package-lock.json is modified locally', [
      '`npm install` adds optional platform packages for whichever machine ran',
      'it, so the two PCs rewrite this file back and forth. Unless you actually',
      'changed a dependency, discard it:',
      '  git checkout -- prime-hospitality/package-lock.json',
    ]),
  ];
}

/* ------------------------------------------------------------------ reporting */

const MARKS = { ok: '[ ok ]', warn: '[warn]', fail: '[FAIL]' };

function report(results) {
  const problems = results.filter(function (item) {
    return item.level !== 'ok';
  });

  if (QUIET && !problems.length) return;

  const shown = QUIET ? problems : results;

  process.stdout.write('\n');
  if (QUIET) {
    process.stdout.write('JobsAddis -- this machine needs attention after that change:\n\n');
  } else {
    process.stdout.write('JobsAddis -- machine check\n\n');
  }

  // '  ' + a six-character mark + '  ' + the padded label, so continuation
  // lines start under the message rather than under the mark.
  const indent = new Array(2 + 6 + 2 + LABEL_WIDTH + 1).join(' ');

  shown.forEach(function (item) {
    process.stdout.write('  ' + MARKS[item.level] + '  ' + pad(item.label) + item.message + '\n');
    item.hint.forEach(function (line) {
      process.stdout.write(indent + line + '\n');
    });
    if (item.hint.length) process.stdout.write('\n');
  });

  const fixable = problems.filter(function (item) {
    return item.fix;
  });

  if (fixable.length && !FIX) {
    process.stdout.write('  ' + fixable.length + ' of these can be fixed for you: npm run setup\n');
  }
  process.stdout.write('\n');
}

const LABEL_WIDTH = 15;

function pad(label) {
  let out = label;
  while (out.length < LABEL_WIDTH) out += ' ';
  return out;
}

/* ---------------------------------------------------------------------- main */

function checkAll() {
  return []
    .concat(checkNode())
    .concat(checkGitIdentity())
    .concat(checkHooks())
    .concat(checkDependencies())
    .concat(checkEnv())
    .concat(checkSupabaseLink())
    .concat(checkLockfileNoise());
}

function main() {
  // Vercel and GitHub Actions install dependencies too, and none of this is
  // meaningful there. Failing in a build because a CI runner has no .env.local
  // would be a self-inflicted outage.
  if (process.env.CI || process.env.VERCEL) return 0;

  if (HOOKS_ONLY) {
    if (git(['rev-parse', '--git-dir']) === null) return 0;
    if (git(['config', 'core.hooksPath']) !== CONFIG.hooksPath) {
      run('git', ['config', 'core.hooksPath', CONFIG.hooksPath]);
      process.stdout.write('JobsAddis: git hooks armed (core.hooksPath -> ' + CONFIG.hooksPath + ')\n');
    }
    makeHooksExecutable();
    return 0;
  }

  if (FIX) {
    checkAll().forEach(function (item) {
      if (item.level !== 'ok' && item.fix) item.fix();
    });
  }

  const results = checkAll();
  report(results);

  // The hooks call this for information and must never block a pull.
  if (QUIET) return 0;

  const broken = results.filter(function (item) {
    return item.level === 'fail';
  });
  return broken.length ? 1 : 0;
}

process.exit(main());
