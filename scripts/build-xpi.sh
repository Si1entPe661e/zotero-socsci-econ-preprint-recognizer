#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
XPI_PATH="$DIST_DIR/socsci-econ-preprint-recognizer.xpi"

if [[ ! -d "$ROOT_DIR/src" ]]; then
  echo "src directory is missing" >&2
  exit 1
fi

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

cd "$ROOT_DIR"
zip -r "$XPI_PATH" manifest.json bootstrap.js src assets >/dev/null
echo "$XPI_PATH"
