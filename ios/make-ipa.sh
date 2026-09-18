#!/bin/bash
# Builds an UNSIGNED OldTavern.ipa for a signing service (Signulous, AltStore, Sideloadly...).
# Needs Xcode 16 or newer on a Mac. Run from anywhere:  bash ios/make-ipa.sh
set -euo pipefail
cd "$(dirname "$0")"
rm -rf build Payload OldTavern.ipa
xcodebuild \
  -project OldTavern.xcodeproj \
  -target OldTavern \
  -configuration Release \
  -sdk iphoneos \
  SYMROOT="$PWD/build" \
  ONLY_ACTIVE_ARCH=NO \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=NO \
  DEVELOPMENT_TEAM="" \
  build 2>&1 | tee build.log | grep -E --line-buffered "error:|warning: .*\.swift|BUILD (SUCCEEDED|FAILED)" || true
APP="build/Release-iphoneos/OldTavern.app"
if [ ! -d "$APP" ]; then
  echo "Build failed; last lines of build.log:"; tail -n 60 build.log; exit 1
fi
mkdir -p Payload
cp -R "$APP" Payload/
zip -qr OldTavern.ipa Payload
rm -rf Payload
echo
echo "Wrote $(pwd)/OldTavern.ipa ($(du -h OldTavern.ipa | cut -f1)). Upload it to your signing service."
