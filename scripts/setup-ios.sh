#!/usr/bin/env bash
# One-shot setup for the Avocato iOS app. Run this on a Mac with Xcode
# already installed from the App Store. Safe to re-run.
set -euo pipefail

DEST="${1:-$HOME/Desktop/avocato-app}"
REPO="https://github.com/sigongan/Vercel-.git"
BRANCH="claude/recipe-extraction-tool-hui8ci"

echo "==> Checking prerequisites"
command -v git >/dev/null || { echo "git not found — install Xcode Command Line Tools first: xcode-select --install"; exit 1; }
command -v node >/dev/null || { echo "Node.js not found — install it first (e.g. https://nodejs.org)"; exit 1; }
command -v npm >/dev/null || { echo "npm not found — comes with Node.js"; exit 1; }

if ! command -v pod >/dev/null; then
  echo "==> CocoaPods not found, installing (you may be asked for your Mac password)"
  sudo gem install cocoapods
fi

if [ -d "$DEST" ]; then
  echo "==> $DEST already exists, pulling latest instead of re-cloning"
  cd "$DEST"
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
else
  echo "==> Cloning into $DEST"
  git clone "$REPO" "$DEST"
  cd "$DEST"
  git checkout "$BRANCH"
fi

echo "==> Installing dependencies"
npm install

echo "==> Generating app icon & splash screen sizes"
npx @capacitor/assets generate --ios

echo "==> Adding/syncing the iOS platform"
if [ -d "ios" ]; then
  npx cap sync ios
else
  npx cap add ios
  npx cap sync ios
fi

echo ""
echo "Done. Opening Xcode..."
npx cap open ios

echo ""
echo "In Xcode: click the App project -> Signing & Capabilities -> pick your"
echo "Apple Developer team under 'Team' -> press the Run button."
