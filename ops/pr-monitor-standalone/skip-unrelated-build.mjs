// Vercel removes .git during upload for these standalone static roots.
// Read only public commit filenames from the canonical GitHub repo.
// Exit 0 = skip an unrelated commit; exit 1 = build for any uncertainty.
import {pathToFileURL} from 'node:url'
const ROOT = "ops/pr-monitor-standalone/"
const REPO = 'https://api.github.com/repos/andylitvinov-design/books/commits/'
export function shouldBuildFromCommit(commit, sha) {
 if (!commit || commit.sha !== sha || !Array.isArray(commit.parents) ||
     commit.parents.length !== 1 || !Array.isArray(commit.files) ||
     commit.files.length < 1 || commit.files.length >= 300) return true
 for (const file of commit.files) {
  if (!file || typeof file.filename !== 'string' ||
      (file.previous_filename !== undefined &&
       file.previous_filename !== null &&
       typeof file.previous_filename !== 'string')) return true
  if (file.filename.startsWith(ROOT) ||
      file.previous_filename?.startsWith(ROOT)) return true
 }
 return false
}
async function main() {
 const sha = process.env.VERCEL_GIT_COMMIT_SHA || ''
 if (process.env.VERCEL_GIT_COMMIT_REF !== 'codex/bootstrap-books' ||
     !/^[a-f0-9]{40}$/.test(sha)) process.exit(1)
 try {
  const response = await fetch(REPO + sha, {
   headers: {'Accept':'application/vnd.github+json', 'User-Agent':'holistic-house-vercel-guard'},
   cache:'no-store', redirect:'error', signal:AbortSignal.timeout(8000)
  })
  if (!response.ok) throw Error('GITHUB_HTTP_' + response.status)
  const commit = await response.json()
  const build = shouldBuildFromCommit(commit, sha)
  console.log(build ? 'HH_CONTROL_DEPLOY_RELEVANT_OR_UNVERIFIED' :
                      'HH_CONTROL_DEPLOY_UNCHANGED_SKIP')
  process.exit(build ? 1 : 0)
 } catch {
  // Offline, private, rate-limited or malformed GitHub API always BUILDS.
  console.error('HH_CONTROL_DEPLOY_GITHUB_LOOKUP_FAILED_BUILD')
  process.exit(1)
 }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
 main()
