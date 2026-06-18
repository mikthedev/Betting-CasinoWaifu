#!/usr/bin/env node
/**
 * Ensures local-testing session recorder files exist before npm start.
 * Recorder output (local-testing/records/) stays gitignored.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const TARGET = path.join(ROOT, "local-testing");
const MARKER = path.join(TARGET, "sessionRecorder.js");

const FILES = ["sessionRecorder.js", "sessionRecorder.css", "costRates.js"];

const SOURCES = [
  path.join(ROOT, "..", "Interactive CasinoWaifu", "local-testing"),
  path.join(ROOT, "..", "CasinoWaifu", "local-testing"),
];

function copyFrom(source) {
  if (!fs.existsSync(path.join(source, "sessionRecorder.js"))) return false;
  fs.mkdirSync(path.join(TARGET, "records"), { recursive: true });
  for (const file of FILES) {
    fs.copyFileSync(path.join(source, file), path.join(TARGET, file));
  }
  return true;
}

if (fs.existsSync(MARKER)) {
  process.exit(0);
}

for (const source of SOURCES) {
  if (copyFrom(source)) {
    console.log(`[recorder] Copied session recorder from ${source}`);
    process.exit(0);
  }
}

console.warn(
  "[recorder] Session recorder not found. Copy manually:\n" +
  "  mkdir -p local-testing/records\n" +
  '  cp "../Interactive CasinoWaifu/local-testing/sessionRecorder.js" local-testing/\n' +
  '  cp "../Interactive CasinoWaifu/local-testing/sessionRecorder.css" local-testing/\n' +
  '  cp "../Interactive CasinoWaifu/local-testing/costRates.js" local-testing/\n' +
  "See docs/DEV-RECORDER.md"
);
