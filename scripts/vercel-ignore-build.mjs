import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// Exit 0 = Vercel skips deploy; exit 1 = build continues.
// Do NOT skip site code, public assets, test data, config or unknown files.
// Only documentation that is never served by the application and CI workflow
// definitions qualify as safe-to-ignore changes.
const NON_RUNTIME = [
  /^docs\/myspace\/[\w./-]+\.(?:md|mdx|txt)$/i,
  /^\.github\/workflows\/[\w.-]+\.ya?ml$/,
  /^README(?:\.[\w.-]+)?\.md$/i,
];

export function maySkipBuild(changedPaths) {
  return Array.isArray(changedPaths)
    && changedPaths.length > 0
    && changedPaths.every(path =>
      typeof path === "string" && NON_RUNTIME.some(pattern => pattern.test(path))
    );
}

export function changedFilesBetween(previous, current, git = execFileSync) {
  if (!/^[a-f0-9]{40}$/i.test(previous ?? "") || !/^[a-f0-9]{40}$/i.test(current ?? "")) return null;
  try {
    const result = git("git", ["diff", "--name-only", "--no-renames", previous, current], {
      encoding: "utf8",
      timeout: 10000,
      maxBuffer: 1024 * 1024,
    });
    return result.split("\n").map(name => name.trim()).filter(Boolean);
  } catch {
    // A shallow clone or absent previous SHA must never hide actual site edits.
    return null;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const changed = changedFilesBetween(
    process.env.VERCEL_GIT_PREVIOUS_SHA,
    process.env.VERCEL_GIT_COMMIT_SHA,
  );
  if (maySkipBuild(changed)) {
    console.log("Skip Vercel build: only My Space notes, README, or GitHub CI files changed.");
    process.exit(0);
  }
  console.log("Run Vercel build: application changed or safe comparison unavailable.");
  process.exit(1);
}
