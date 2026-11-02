// Public, read-only Vercel deployment identity. This reveals only IDs and
// commit metadata already associated with the public GitHub repository.
// Response deliberately contains only these approved public fields.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const SHA = /^[0-9a-f]{40}$/i;
const DEPLOYMENT = /^dpl_[A-Za-z0-9]+$/;
const PROJECT = "prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b";
const HEAD_BRANCH = "codex/public-book-library";
const OWNER = "andylitvinov-design";
const REPO = "books";

export function GET() {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || "";
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || "";
  const projectId = process.env.VERCEL_PROJECT_ID || "";
  const environment = process.env.VERCEL_ENV || "";
  const gitRef = process.env.VERCEL_GIT_COMMIT_REF || "";
  const repositoryOwner = process.env.VERCEL_GIT_REPO_OWNER || "";
  const repositoryName = process.env.VERCEL_GIT_REPO_SLUG || "";
  const valid = SHA.test(commitSha) &&
    DEPLOYMENT.test(deploymentId) &&
    projectId === PROJECT &&
    environment === "production" &&
    gitRef === HEAD_BRANCH &&
    repositoryOwner === OWNER &&
    repositoryName === REPO;

  const headers = {
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    "CDN-Cache-Control": "no-store",
    "Vercel-CDN-Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };

  // Missing system metadata is UNKNOWN, never a false production success.
  if (!valid) {
    return Response.json(
      { schema: "HH_PUBLIC_DEPLOYMENT_PROOF_V1", status: "UNVERIFIED" },
      { status: 503, headers },
    );
  }

  return Response.json(
    {
      schema: "HH_PUBLIC_DEPLOYMENT_PROOF_V1",
      status: "RUNTIME_DEPLOYMENT",
      deployment_id: deploymentId,
      project_id: projectId,
      commit_sha: commitSha,
      git_ref: gitRef,
      environment,
      repository: OWNER + "/" + REPO,
    },
    { status: 200, headers },
  );
}
