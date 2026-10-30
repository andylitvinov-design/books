// Conservative selector, never a replacement for exact-head release or consent checks.
// If git diff is unavailable, changed paths are shared, or a dependency is unknown,
// every Chromium/WebKit journey runs. Manual dispatch always runs everything.
import { execFileSync } from "node:child_process";
import { appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ALL = ["coaching", "support", "ideas"];
const COACHING = [
  /^components\/public-coaching-discovery(?:\.jsx|\.module\.css)$/,
  /^app\/\[locale\]\/coaching\//,
  /^lib\/coaching\/public-(?:coaching-catalog|session-art)\.js$/,
  /^tests\/public-coaching-discovery\.test\.mjs$/,
  /^scripts\/verify-coaching-lounge-mobile\.mjs$/,
];
const SUPPORT = [
  /^components\/holistic-support-choices\.tsx$/,
  /^app\/\[locale\]\/(?:holistic-support|temple-insights)\//,
  /^tests\/holistic-support-(?!mobile-mock-parity)[^/]+\.test\.mjs$/,
  /^scripts\/verify-holistic-support-browser\.mjs$/,
];
const IDEAS_ALSO_SUPPORT = [
  /^components\/ideas-discovery(?:\.tsx|\.module\.css)$/,
  /^components\/tests-coaching-switchboard(?:\.tsx|\.module\.css)$/,
  /^app\/(?:\[locale\]|es)\/books\/page\.tsx$/,
  /^tests\/(?:ideas-[^/]+|tests-coaching-switchboard)\.test\.mjs$/,
  /^lib\/ideas-(?:guidance|preview-rotation)\.mjs$/,
  /^lib\/ideas-coaching-handoff\.ts$/,
  /^scripts\/verify-ideas-mobile-browser\.mjs$/,
];

export function classifyChangedFiles(files) {
  if (!Array.isArray(files) || files.length === 0) return [...ALL];
  const selected = new Set();
  for (const file of files) {
    if (typeof file !== "string" || !file) return [...ALL];
    if (COACHING.some(rule => rule.test(file))) selected.add("coaching");
    else if (SUPPORT.some(rule => rule.test(file))) selected.add("support");
    else if (IDEAS_ALSO_SUPPORT.some(rule => rule.test(file))) {
      selected.add("ideas");
      // HolisticSupportChoices embeds IdeasDiscovery: verify both entry points.
      selected.add("support");
    } else {
      // Shared/security/consent/locale, workflow, SQL, package or unknown file.
      return [...ALL];
    }
  }
  return ALL.filter(name => selected.has(name));
}

async function main() {
  let changedFiles = null;
  const base = process.env.HH_PR_BASE_SHA || "";
  if (process.env.HH_EVENT_NAME === "pull_request" && /^[a-f0-9]{40}$/.test(base)) {
    try {
      changedFiles = execFileSync("git", ["diff", "--no-renames", "--name-only", "-z", base, "HEAD"], {
        encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
      }).split("\0").filter(Boolean);
    } catch (error) {
      console.warn("Cannot inspect exact PR diff; all browser suites required:", error.message);
    }
  }
  const selected = classifyChangedFiles(changedFiles);
  if (!process.env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT is required");
  await appendFile(process.env.GITHUB_OUTPUT,
    ALL.map(name => name + "=" + selected.includes(name) + "\n").join(""));
  console.log("Required browser suites: " + selected.join(", ") +
    "; changed files: " + (changedFiles ? changedFiles.join(", ") : "unknown → ALL"));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
