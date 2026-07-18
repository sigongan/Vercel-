#!/usr/bin/env node
// Capacitor's `cap sync ios` regenerates ios/App/CapApp-SPM/Package.swift on
// every run, and (as of @capacitor/ios 8.4.2) it writes `.v26` for the iOS
// platform version — but the file's own `swift-tools-version: 5.9` header
// predates the `.v26` IOSVersion case (added in PackageDescription 6.2), so
// Xcode fails package resolution with "'v26' is unavailable" no matter how
// recent the installed Xcode is. Setting the Xcode targets' own Minimum
// Deployment doesn't influence this generated file, so this runs after every
// sync (see the "cap:sync" npm script) to patch it back to a version the
// declared tools-version actually supports.
const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "ios", "App", "CapApp-SPM", "Package.swift");

if (!fs.existsSync(target)) {
  process.exit(0);
}

const original = fs.readFileSync(target, "utf8");
const patched = original.replace(/\.v26\b/g, ".v15");

if (patched !== original) {
  fs.writeFileSync(target, patched);
  console.log("fix-cap-spm: patched .v26 -> .v15 in CapApp-SPM/Package.swift");
}
