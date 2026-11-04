// Public, non-sensitive proof of the exact Vercel deployment serving this response.
// A missing or inconsistent Vercel system variable must never imply LIVE.
export const SCHEMA = 'HH_PUBLIC_RELEASE_EVIDENCE_V1';
const SHA = /^[a-f0-9]{40}$/i;
const DEPLOYMENT = /^dpl_[A-Za-z0-9]{8,64}$/;
const EXPECTED_PROJECT = 'prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b';
const EXPECTED_BRANCH = 'codex/public-book-library';
const EXPECTED_REPO = 'andylitvinov-design/books';

export function readPublicReleaseEvidence(env = {}) {
  const sha = String(env.VERCEL_GIT_COMMIT_SHA || '');
  const deployment_id = String(env.VERCEL_DEPLOYMENT_ID || '');
  const project_id = String(env.VERCEL_PROJECT_ID || '');
  const branch = String(env.VERCEL_GIT_COMMIT_REF || '');
  const repo = `${String(env.VERCEL_GIT_REPO_OWNER || '')}/${String(env.VERCEL_GIT_REPO_SLUG || '')}`;
  const environment = String(env.VERCEL_ENV || '');
  const available = SHA.test(sha) && DEPLOYMENT.test(deployment_id) &&
    project_id === EXPECTED_PROJECT && branch === EXPECTED_BRANCH &&
    repo === EXPECTED_REPO && environment === 'production';
  if (!available) return { schema: SCHEMA, available: false };
  return { schema: SCHEMA, available: true, sha, deployment_id,
    project_id, branch, repo, environment };
}
