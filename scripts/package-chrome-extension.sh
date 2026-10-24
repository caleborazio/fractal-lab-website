#!/bin/sh
# Zips fit-check-extension for upload to the Chrome Web Store, named with the
# manifest's version (bump "version" in manifest.json before each upload).
# Listing text and permission answers are in chrome-web-store.md.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$ROOT/fit-check-extension/manifest.json")
OUT="$ROOT/mind-the-fit-chrome-$VERSION.zip"
rm -f "$OUT"
cd "$ROOT/fit-check-extension"
zip -qr "$OUT" . -x '.*' -x '*/.*'
echo "Wrote $OUT"
