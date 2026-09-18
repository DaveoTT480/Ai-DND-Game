#!/bin/sh
# Builds an UNSIGNED OldTavern.ipa for a signing service (Signulous, AltStore, Sideloadly...).
# Needs Xcode 16 or newer on a Mac. Run from anywhere:  sh ios/make-ipa.sh
set -eu
cd "$(dirname "$0")"
rm -rf build Payload OldTavern.ipa
xcodebuild \
  -project OldTavern.xcodeproj \
  -target OldTavern \
  -configuration Release \
  -sdk iphoneos \
  -derivedDataPath build \
  ONLY_ACTIVE_ARCH=NO \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=NO \
  DEVELOPMENT_TEAM="" \
  build | tail -n 20
mkdir -p Payload
cp -R build/Build/Products/Release-iphoneos/OldTavern.app Payload/
zip -qr OldTavern.ipa Payload
rm -rf Payload
echo
echo "Wrote $(pwd)/OldTavern.ipa ($(du -h OldTavern.ipa | cut -f1)). Upload it to your signing service."
