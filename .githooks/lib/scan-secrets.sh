#!/bin/sh
#
# Scans lines on standard input for anything shaped like a credential.
#
# Shared by pre-commit, pre-push and post-merge so there is exactly one copy of
# the patterns to maintain. The caller decides which lines to feed in; a single
# leading "+" is stripped so diff output and plain file contents both work.
#
# Prints each finding as three indented lines and exits 1 when anything is
# found, 0 when nothing is. The caller supplies its own headline, because what
# to do about a hit differs between committing, pushing and pulling.

input=$(cat)
[ -n "$input" ] || exit 0

lines=$(printf '%s\n' "$input" | grep -v '^+++' | sed 's/^+//')
[ -n "$lines" ] || exit 0

findings=$(mktemp)
trap 'rm -f "$findings"' EXIT

# Placeholders are what .env.example and the docs are made of. Excluding them by
# shape rather than by filename keeps the scan honest if a real key is ever
# pasted into a file that happens to be documentation.
placeholder='your_|_here|<[a-z_]+>|example|placeholder|change_me|changeme|redacted|xxx|\.\.\.'

scan() {
  printf '%s\n' "$lines" \
    | grep -oE "$1" \
    | grep -viE "$placeholder" \
    | sort -u \
    | while IFS= read -r hit; do
        [ -n "$hit" ] && printf '%s\t%s\t%s\n' "$2" "$(printf '%s' "$hit" | cut -c1-28)" "$3"
      done >> "$findings"
}

# Supabase legacy JWT. anon and service_role share this shape; neither belongs
# in a source file, so both are flagged.
scan 'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}' \
     'Supabase/JWT key' \
     'Read it from process.env or Deno.env -- never inline it.'

scan 'sb_secret_[A-Za-z0-9_-]{12,}' \
     'Supabase secret key' \
     'Belongs in Vercel and Supabase secrets, not the repository.'

scan '[0-9]{8,10}:AA[A-Za-z0-9_-]{30,}' \
     'Telegram bot token' \
     'Belongs in Supabase Edge Function secrets.'

scan 'postgres(ql)?://[^ "'"'"']*:[^ "'"'"'@]+@[^ "'"'"']+' \
     'Database URL with password' \
     'Use SUPABASE_DB_URL from the environment.'

scan '(ghp|gho|ghs|ghu)_[A-Za-z0-9]{30,}' \
     'GitHub token' \
     'Use a GitHub Actions secret.'

scan 'sk-[A-Za-z0-9]{24,}' \
     'API secret key' \
     'Read it from the environment.'

scan 'sk_live_[A-Za-z0-9]{16,}' \
     'Live API secret key' \
     'Read it from the environment.'

# A secret-shaped variable assigned a long literal, for anything the patterns
# above do not recognise by shape.
scan '(SERVICE_ROLE_KEY|SECRET|PASSWORD|TOKEN)[A-Z_]*["'"'"']?\s*[:=]\s*["'"'"'][^"'"'"']{16,}["'"'"']' \
     'Secret assigned a literal' \
     'Move the value to the environment and read it at runtime.'

[ -s "$findings" ] || exit 0

while IFS="$(printf '\t')" read -r label hit advice; do
  echo "  * $label: $hit..."
  echo "      $advice"
  echo ""
done < "$findings"

exit 1
