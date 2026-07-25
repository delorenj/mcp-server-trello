#!/usr/bin/env bash
# versioning.sh — single source of all repo versioning logic.
#
# Installed by the `mise-versioning` skill. All version read/write/bump logic
# lives here; mise tasks are thin wrappers that call into it.
#
# Canonical version = the HIGHEST semver across every file in the manifest.
# All manifest files are kept in parity on every write (bump / set / sync).
#
# Usage:
#   versioning.sh current              Print canonical version as vX.Y.Z
#   versioning.sh bump <patch|minor|major>
#   versioning.sh set <X.Y.Z|vX.Y.Z>   Force all files to an explicit version
#   versioning.sh check                Exit 0 if all files in parity, else list drift
#   versioning.sh sync                 Force every file up to the canonical (highest) version
#   versioning.sh files                List the manifest
#
# Manifest: .mise/version-files.conf  — lines of "<type> <path>" (see file-types).
#   types: json toml cargo csproj gradle plain gittag
#
# Storage format per type:
#   json/toml/cargo/csproj/gradle/plain -> bare  "X.Y.Z"
#   gittag                              -> tag   "vX.Y.Z"
# `current` always prints with the leading "v".

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MANIFEST="${VERSION_FILES_CONF:-$REPO_ROOT/.mise/version-files.conf}"

die() { printf 'versioning: %s\n' "$1" >&2; exit 1; }

# Friendly display path for a manifest entry.
rel() {  # $1=type $2=abspath
  [[ "$1" == gittag ]] && { printf '(git tags)'; return; }
  local p="${2#"$REPO_ROOT"/}"; printf '%s' "${p:-$2}"
}

# ---- semver helpers ---------------------------------------------------------

# Strip a leading v/V and surrounding whitespace; validate X.Y.Z.
normalize() {
  local v="${1#[vV]}"
  v="$(printf '%s' "$v" | tr -d '[:space:]')"
  [[ "$v" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || return 1
  printf '%s' "$v"
}

# Return 0 if $1 > $2 (strict), comparing X.Y.Z numerically.
semver_gt() {
  local a b
  IFS=. read -r a1 a2 a3 <<<"$1"
  IFS=. read -r b1 b2 b3 <<<"$2"
  ((a1 != b1)) && { ((a1 > b1)); return; }
  ((a2 != b2)) && { ((a2 > b2)); return; }
  ((a3 > b3))
}

bump_semver() {
  local ver="$1" part="$2" x y z
  IFS=. read -r x y z <<<"$ver"
  case "$part" in
    major) x=$((x + 1)); y=0; z=0 ;;
    minor) y=$((y + 1)); z=0 ;;
    patch) z=$((z + 1)) ;;
    *) die "unknown bump part: $part (expected patch|minor|major)" ;;
  esac
  printf '%s.%s.%s' "$x" "$y" "$z"
}

# ---- manifest ---------------------------------------------------------------

[[ -f "$MANIFEST" ]] || die "manifest not found: $MANIFEST (run the mise-versioning init)"

# Emits "type<TAB>abspath" per manifest line, skipping blanks/comments.
manifest_entries() {
  while read -r type path _rest; do
    [[ -z "${type:-}" || "$type" == \#* ]] && continue
    case "$path" in
      /*) : ;;
      .|"") path="$REPO_ROOT" ;;
      *) path="$REPO_ROOT/$path" ;;
    esac
    printf '%s\t%s\n' "$type" "$path"
  done <"$MANIFEST"
}

# ---- per-type read -----------------------------------------------------------

read_version() {  # $1=type $2=path -> bare X.Y.Z on stdout, or nothing
  local type="$1" path="$2" raw=""
  case "$type" in
    json)
      [[ -f "$path" ]] || return 0
      raw="$(jq -r '.version // empty' "$path" 2>/dev/null || true)" ;;
    toml|cargo)
      [[ -f "$path" ]] || return 0
      raw="$(grep -m1 -E '^version[[:space:]]*=' "$path" 2>/dev/null \
             | sed -E 's/^version[[:space:]]*=[[:space:]]*["'\'']?([^"'\'' ]+).*/\1/' || true)" ;;
    csproj)
      [[ -f "$path" ]] || return 0
      raw="$(grep -m1 -oE '<Version>[^<]+</Version>' "$path" 2>/dev/null \
             | sed -E 's#</?Version>##g' || true)" ;;
    gradle)
      [[ -f "$path" ]] || return 0
      raw="$(grep -m1 -E '^[[:space:]]*version[[:space:]]*[=]?[[:space:]]*["'\'']' "$path" 2>/dev/null \
             | sed -E 's/.*["'\'']([0-9]+\.[0-9]+\.[0-9]+)["'\''].*/\1/' || true)" ;;
    plain)
      [[ -f "$path" ]] || return 0
      raw="$(head -n1 "$path" 2>/dev/null || true)" ;;
    gittag)
      raw="$(git -C "$REPO_ROOT" tag --list 'v[0-9]*' --sort=-v:refname 2>/dev/null | head -n1 || true)" ;;
    *) die "unknown manifest type: $type" ;;
  esac
  [[ -z "$raw" ]] && return 0
  normalize "$raw" 2>/dev/null || return 0
}

# ---- per-type write ----------------------------------------------------------

write_version() {  # $1=type $2=path $3=bare-new-version
  local type="$1" path="$2" new="$3" tmp
  case "$type" in
    json)
      [[ -f "$path" ]] || return 0
      tmp="$(mktemp)"
      jq --indent 2 --arg v "$new" '.version = $v' "$path" >"$tmp" && mv "$tmp" "$path" ;;
    toml|cargo)
      [[ -f "$path" ]] || return 0
      # Replace only the first top-level `version = "..."` line.
      sed -i -E "0,/^version[[:space:]]*=/{s/^(version[[:space:]]*=[[:space:]]*[\"']?)[^\"' ]+([\"']?)/\1$new\2/}" "$path" ;;
    csproj)
      [[ -f "$path" ]] || return 0
      sed -i -E "0,/<Version>[^<]+<\/Version>/{s#<Version>[^<]+</Version>#<Version>$new</Version>#}" "$path" ;;
    gradle)
      [[ -f "$path" ]] || return 0
      sed -i -E "0,/^[[:space:]]*version[[:space:]]*[=]?[[:space:]]*[\"']/{s/([\"'])[0-9]+\.[0-9]+\.[0-9]+([\"'])/\1$new\2/}" "$path" ;;
    plain)
      printf '%s\n' "$new" >"$path" ;;
    gittag)
      if git -C "$REPO_ROOT" rev-parse "v$new" >/dev/null 2>&1; then
        printf 'versioning: git tag v%s already exists, skipping\n' "$new" >&2
      else
        git -C "$REPO_ROOT" tag -a "v$new" -m "v$new"
        printf 'versioning: created git tag v%s\n' "$new" >&2
      fi ;;
    *) die "unknown manifest type: $type" ;;
  esac
}

# ---- canonical resolution ----------------------------------------------------

canonical() {  # highest version across the manifest -> bare X.Y.Z (empty if none)
  local best="" v
  while IFS=$'\t' read -r type path; do
    v="$(read_version "$type" "$path")" || true
    [[ -z "$v" ]] && continue
    if [[ -z "$best" ]] || semver_gt "$v" "$best"; then best="$v"; fi
  done < <(manifest_entries)
  printf '%s' "$best"
}

write_all() {  # $1=bare-new-version : write to every manifest file
  local new="$1" type path
  while IFS=$'\t' read -r type path; do
    write_version "$type" "$path" "$new"
    printf '  %-7s %s -> %s\n' "$type" "$(rel "$type" "$path")" "$new" >&2
  done < <(manifest_entries)
}

# ---- commands ----------------------------------------------------------------

cmd_current() {
  local v; v="$(canonical)"
  printf 'v%s\n' "${v:-0.0.0}"
}

cmd_bump() {
  local part="${1:-patch}" cur new
  cur="$(canonical)"; [[ -z "$cur" ]] && cur="0.0.0"
  new="$(bump_semver "$cur" "$part")"
  printf 'versioning: %s bump v%s -> v%s\n' "$part" "$cur" "$new" >&2
  write_all "$new"
  printf 'v%s\n' "$new"
}

cmd_set() {
  local new; new="$(normalize "${1:?usage: set <X.Y.Z>}")" || die "invalid version: $1"
  printf 'versioning: set -> v%s\n' "$new" >&2
  write_all "$new"
  printf 'v%s\n' "$new"
}

cmd_check() {
  local canon drift=0 v type path; canon="$(canonical)"
  [[ -z "$canon" ]] && { echo "versioning: no version found in any manifest file" >&2; return 0; }
  while IFS=$'\t' read -r type path; do
    v="$(read_version "$type" "$path")" || true
    [[ -z "$v" ]] && continue
    if [[ "$v" != "$canon" ]]; then
      printf 'DRIFT  %-7s %s = v%s (canonical v%s)\n' "$type" "$(rel "$type" "$path")" "$v" "$canon" >&2
      drift=1
    fi
  done < <(manifest_entries)
  if ((drift)); then echo "versioning: files out of parity; run 'versioning.sh sync'" >&2; return 1; fi
  printf 'versioning: all files in parity at v%s\n' "$canon"
}

cmd_sync() {
  local canon; canon="$(canonical)"
  [[ -z "$canon" ]] && die "no version found in any manifest file"
  printf 'versioning: syncing all files to v%s\n' "$canon" >&2
  write_all "$canon"
  printf 'v%s\n' "$canon"
}

cmd_files() {
  while IFS=$'\t' read -r type path; do
    printf '%s\t%s\n' "$type" "$(rel "$type" "$path")"
  done < <(manifest_entries)
}

main() {
  local cmd="${1:-current}"; shift || true
  case "$cmd" in
    current|cur) cmd_current ;;
    bump)        cmd_bump "$@" ;;
    set)         cmd_set "$@" ;;
    check)       cmd_check ;;
    sync)        cmd_sync ;;
    files)       cmd_files ;;
    *) die "unknown command: $cmd (current|bump|set|check|sync|files)" ;;
  esac
}

main "$@"
