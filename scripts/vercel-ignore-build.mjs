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


/** Compare source safely when Vercel's shallow Git clone omits the previous SHA.
 * GitHub returns file names without downloading hundreds of megabytes of blobs.
 * Any API error or truncated/ambiguous diff causes a normal build.
 */
export async function changedFilesViaGithub(previous, current, fetcher = fetch) {
  if (!/^[a-f0-9]{40}$/i.test(previous ?? "") || !/^[a-f0-9]{40}$/i.test(current ?? "")) return null;
  const uri = `https://api.github.com/repos/andylitvinov-design/books/compare/${previous}...${current}`;
  try {
    const response = await fetcher(uri, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "HolisticHouse-Vercel-Build-Guard",
      },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.base_commit?.sha !== previous || data.head_commit?.sha !== current
      || data.status !== "ahead" || !Array.isArray(data.files)
      || data.ahead_by > 200 || data.files.length >= 300 || data.files.length === 0) return null;
    // Renames are ambiguous because the old path may be runtime code. Build.
    if (data.files.some(file => file.status === "renamed"
      || !["added", "modified", "removed", "changed"].includes(file.status)
      || typeof file.filename !== "string")) return null;
    return data.files.map(file => file.filename);
  } catch {
    return null;
  }
}

// Pro credit guard: GitHub Actions verifies PRs, and only the production
// branch needs a Vercel build. Ignore all Preview builds as a defense-in-depth
// in case Git branch rules are bypassed by a branch created before this policy.
export function shouldSkipPreviewBuild(environment = process.env) {
  return environment.VERCEL_ENV === "preview";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (shouldSkipPreviewBuild()) {
    console.log("Skip Vercel Preview build; automatic production deploys remain enabled.");
    process.exit(0);
  }
  const previous = process.env.VERCEL_GIT_PREVIOUS_SHA;
  const current = process.env.VERCEL_GIT_COMMIT_SHA;
  const local = changedFilesBetween(previous, current);
  const changed = local ?? await changedFilesViaGithub(previous, current);
  if (maySkipBuild(changed)) {
    console.log("Skip Vercel build: only My Space notes, README, or GitHub CI files changed.");
    process.exit(0);
  }
  console.log("Run Vercel build: application changed or safe comparison unavailable.");
  process.exit(1);
}
