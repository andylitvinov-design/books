// Public, no-secret production identity; unavailable values fail closed.
// Vercel documents these values as system metadata at build and runtime.
export const RELEASE_EVIDENCE_SCHEMA='HH_PUBLIC_RELEASE_EVIDENCE_V1';
export const PRODUCTION_HOST='holistichouse.vercel.app';
export const PROJECT_ID='prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b';
const SHA=/^[0-9a-f]{40}$/i;
const DEPLOYMENT=/^dpl_[A-Za-z0-9]{12,80}$/;
function unavailable(){
 return {status:503,body:{schema:RELEASE_EVIDENCE_SCHEMA,available:false,
  reason:'SYSTEM_DEPLOYMENT_IDENTITY_UNAVAILABLE'}};
}
export function releaseEvidenceFromEnv(env,hostname){
 if(hostname!==PRODUCTION_HOST)return {status:404,body:{
  schema:RELEASE_EVIDENCE_SCHEMA,available:false,reason:'NON_CANONICAL_HOST'}};
 const sha=env.VERCEL_GIT_COMMIT_SHA||'';
 const id=env.VERCEL_DEPLOYMENT_ID||'';
 const project=env.VERCEL_PROJECT_ID||'';
 const environment=env.VERCEL_ENV||'';
 const branch=env.VERCEL_GIT_COMMIT_REF||'';
 const owner=env.VERCEL_GIT_REPO_OWNER||'';
 const repository=env.VERCEL_GIT_REPO_SLUG||'';
 if(environment!=='production'||branch!=='codex/public-book-library'||
    !SHA.test(sha)||!DEPLOYMENT.test(id)||project!==PROJECT_ID||
    owner!=='andylitvinov-design'||repository!=='books')return unavailable();
 return {status:200,body:{schema:RELEASE_EVIDENCE_SCHEMA,available:true,
  sha,deployment_id:id,project_id:project,environment,branch,
  repo:'andylitvinov-design/books'}};
}
