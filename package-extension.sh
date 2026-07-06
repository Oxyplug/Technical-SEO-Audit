#!/usr/bin/env bash
# package-extension.sh — build a clean Chrome Web Store upload ZIP.
# Ships only what Chrome needs and excludes repo/dev/store-prep files.
set -euo pipefail

cd "$(dirname "$0")"

NAME="oxyplug-image-audit"
VERSION="$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")"
OUTPUT="dist/${NAME}-v${VERSION}.zip"

mkdir -p dist
rm -f "$OUTPUT"

# Strip stray macOS metadata so it never ends up in the package.
find . -name '.DS_Store' -delete

zip -r "$OUTPUT" . \
  -x '.git/*' \
  -x '.github/*' \
  -x '.idea/*' \
  -x 'dist/*' \
  -x 'store-assets/*' \
  -x 'CHROMEWEBSTORE.md' \
  -x 'PRIVACY_POLICY.md' \
  -x 'README.md' \
  -x 'CODE_REVIEW.md' \
  -x 'CHANGES.md' \
  -x 'LICENSE' \
  -x '.gitignore' \
  -x '*.sh' \
  -x '.DS_Store'

echo ""
echo "Packaged: $OUTPUT"
echo "Contents:"
unzip -l "$OUTPUT"
