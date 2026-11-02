import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseEvidenceFromEnv,RELEASE_EVIDENCE_SCHEMA,PRODUCTION_HOST,PROJECT_ID} from '../lib/ci/public-release-evidence.mjs';
const sample={
 VERCEL_GIT_COMMIT_SHA:'a'.repeat(40),
 VERCEL_DEPLOYMENT_ID:'dpl_8j2MtL8NYfv1xseUZdaAbQgcoqbT',
 VERCEL_PROJECT_ID:PROJECT_ID,
 VERCEL_ENV:'production',
 VERCEL_GIT_COMMIT_REF:'codex/public-book-library',
 VERCEL_GIT_REPO_OWNER:'andylitvinov-design',
 VERCEL_GIT_REPO_SLUG:'books'
};
test('canonical production alias returns only precise non-secret deployment identity',()=>{
 const r=releaseEvidenceFromEnv(sample,PRODUCTION_HOST);
 assert.equal(r.status,200);
 assert.deepEqual(r.body,{schema:RELEASE_EVIDENCE_SCHEMA,available:true,
  sha:sample.VERCEL_GIT_COMMIT_SHA,deployment_id:sample.VERCEL_DEPLOYMENT_ID,
  project_id:PROJECT_ID,environment:'production',
  branch:'codex/public-book-library',repo:'andylitvinov-design/books'});
 assert.ok(!JSON.stringify(r.body).includes('token'));
});
test('preview, wrong branch, project, git source and missing metadata fail closed',()=>{
 for(const change of [
  {VERCEL_ENV:'preview'},{VERCEL_GIT_COMMIT_REF:'feature'},
  {VERCEL_GIT_COMMIT_SHA:'unknown'}, {VERCEL_GIT_COMMIT_SHA:''},
  {VERCEL_DEPLOYMENT_ID:'bad'}, {VERCEL_DEPLOYMENT_ID:''},
  {VERCEL_PROJECT_ID:'prj_not_yours'},
  {VERCEL_GIT_REPO_OWNER:'someone_else'},
  {VERCEL_GIT_REPO_SLUG:'other'}
 ]){
  const r=releaseEvidenceFromEnv({...sample,...change},PRODUCTION_HOST);
  assert.equal(r.status,503);
  assert.equal(r.body.available,false);
  assert.equal(JSON.stringify(r.body).includes(sample.VERCEL_GIT_COMMIT_SHA),false);
 }
});
test('preview hostname cannot impersonate production even with production metadata',()=>{
 const r=releaseEvidenceFromEnv(sample,'preview.vercel.app');
 assert.equal(r.status,404);
 assert.equal(r.body.available,false);
});
test('route remains GET-only, non-cacheable and never exposes env or tokens',async()=>{
 const fs=await import('node:fs/promises');
 const route=await fs.readFile(new URL('../app/api/public/release-evidence/route.js',import.meta.url),'utf8');
 assert.match(route,/export async function GET/);
 assert.match(route,/dynamic='force-dynamic'/);
 assert.match(route,/Cache-Control/);
 assert.match(route,/no-store/);
 assert.doesNotMatch(route,/JSON\.stringify\(process\.env\)/);
});
