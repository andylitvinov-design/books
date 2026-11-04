import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// Exit 0 = Vercel skips deploy; exit 1 = build continues.
// Do NOT skip site code, public assets, test data, config or unknown files.
// Only clearly non-runtime documentation, GitHub Actions configuration and
// dedicated CI implementation/tests qualify as safe-to-ignore changes.
const NON_RUNTIME = [
  /^docs\/myspace\/[\w./-]+\.(?:md|mdx|txt)$/i,
  /^\.github\/workflows\/[\w.-]+\.ya?ml$/,
  /^docs\/operations\/CI_RELEASE_POLICY\.md$/,
  /^scripts\/ci-[\w.-]+\.mjs$/,
  /^lib\/ci\/[\w./-]+\.mjs$/,
  /^tests\/ci-[\w.-]+\.test\.mjs$/,
  /^tests\/pr-(?:fast-lane|sweep-guard)\.test\.mjs$/,
  /^README(?:\.[\w.-]+)?\.md$/i,
];

export function maySkipBuild(changedPaths) {
  return Array.isArray(changedPaths)
    && changedPaths.length > 0
    && changedPaths.every(path =>
      typeof path === "string" &&
      !path.split("/").some(part => part === "." || part === "..") &&
      !path.includes("\\") &&
      NON_RUNTIME.some(pattern => pattern.test(path))
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
export async function inspectGithubCompare(previous, current, fetcher = fetch) {
  if (!/^[a-f0-9]{40}$/i.test(previous ?? "") || !/^[a-f0-9]{40}$/i.test(current ?? ""))
    return { paths: null, reason: "invalid-sha" };
  const uri = `https://api.github.com/repos/andylitvinov-design/books/compare/${previous}...${current}?per_page=100`;
  try {
    const response = await fetcher(uri, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "HolisticHouse-Vercel-Build-Guard",
      },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return { paths: null, reason: "github-http-" + (Number(response.status) || "unknown") };
    const data = await response.json();
    // GitHub's compare REST response has no head_commit. The final entry in
    // the complete paginated commits array is the tested target commit.
    if (data.base_commit?.sha !== previous || data.status !== "ahead" || data.behind_by !== 0)
      return { paths: null, reason: "github-not-verified-ahead" };
    if (!Array.isArray(data.commits) || !Number.isInteger(data.ahead_by)
      || data.ahead_by < 1 || data.ahead_by > 100
      || data.total_commits !== data.ahead_by || data.commits.length !== data.ahead_by
      || data.commits.at(-1)?.sha !== current)
      return { paths: null, reason: "github-commit-history-incomplete" };
    if (!Array.isArray(data.files) || data.files.length >= 300 || data.files.length === 0)
      return { paths: null, reason: "github-unbounded-files-or-commits" };
    // Renames are ambiguous because the old path may be runtime code. Build.
    if (data.files.some(file => file.status === "renamed"
      || !["added", "modified", "removed", "changed"].includes(file.status)
      || typeof file.filename !== "string"))
      return { paths: null, reason: "github-ambiguous-paths" };
    return { paths: data.files.map(file => file.filename), reason: "github-verified" };
  } catch {
    return { paths: null, reason: "github-request-failed" };
  }
}

// Backwards-compatible API for existing callers.
export async function changedFilesViaGithub(previous, current, fetcher = fetch) {
  return (await inspectGithubCompare(previous, current, fetcher)).paths;
}

// Pro credit guard: GitHub Actions verifies PRs, and only the production
// branch needs a Vercel build. Ignore all Preview builds as a defense-in-depth
// in case Git branch rules are bypassed by a branch created before this policy.
export function shouldSkipPreviewBuild(environment = process.env) {
  return environment.VERCEL_ENV === "preview" && !(environment.VERCEL_PROJECT_ID === "prj_bjwATbHF61gzEhfsrNe54lEnvJZw" && environment.HH_LAB_MODE === "true" && environment.HH_DISABLE_EXTERNAL_SIDE_EFFECTS === "true");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (shouldSkipPreviewBuild()) {
    console.log("Skip Vercel Preview build; automatic production deploys remain enabled.");
    process.exit(0);
  }
  if (process.env.VERCEL_ENV === "preview") {
    console.log("Explicit isolated Lab preview: run build.");
    process.exit(1);
  }
  const previous = process.env.VERCEL_GIT_PREVIOUS_SHA;
  const current = process.env.VERCEL_GIT_COMMIT_SHA;
  // Never print env values or a GitHub response body: only presence, source and reason.
  const validSha = sha => /^[a-f0-9]{40}$/i.test(sha ?? "");
  console.log("Vercel build guard input: env=" + (process.env.VERCEL_ENV || "unset")
    + "; previous=" + (validSha(previous) ? "valid" : "missing-or-invalid")
    + "; current=" + (validSha(current) ? "valid" : "missing-or-invalid"));
  const local = changedFilesBetween(previous, current);
  const result = local === null
    ? await inspectGithubCompare(previous, current)
    : { paths: local, reason: "local-git-diff" };
  const changed = result.paths;
  const safe = maySkipBuild(changed);
  console.log("Vercel build guard decision: source=" + result.reason
    + "; fileCount=" + (Array.isArray(changed) ? changed.length : "unknown")
    + "; runtimeChange=" + (Array.isArray(changed) && !safe ? "yes" : "unknown-or-none"));
  if (safe) {
    console.log("Skip Vercel build: only verified non-runtime documentation or dedicated GitHub CI files changed.");
    process.exit(0);
  }
  console.log("Run Vercel build: application changed or safe comparison unavailable.");
  process.exit(1);
}
