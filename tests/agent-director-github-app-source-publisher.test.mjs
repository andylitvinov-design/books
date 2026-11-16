import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { createGithubOwnedPublisher, validateGithubOwnedPatch, ownedGithubAppConfigured, publishOwnedDraftSource } from '../lib/agent-director/github-app-source-publisher.mjs';

const base='a'.repeat(40), oldBlob='b'.repeat(40), tree='c'.repeat(40), newBlob='d'.repeat(40), newTree='e'.repeat(40), commit='f'.repeat(40);
const job={id:'job_source_patch_1',projectKey:'holistic-house',task:'Repair verified source defect',githubPlan:{repo:'acme/books',baseBranch:'codex/bootstrap-books',prTitle:'Fix source defect',prBody:'Controlled source patch'}};
const project={repo:'acme/books',defaultBranch:'codex/bootstrap-books',productionBranch:'codex/public-book-library'};
const source='export const answer = 41;\n';
const patch=[{path:'src/example.js',content:'export const answer = 42;\n',expectedBlobSha:oldBlob}];

function json(status,body){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});}
function fakeGithub({head=base,blob=oldBlob}={}){
 const calls=[],branches=new Map();
 const fetchImpl=async(url,options={})=>{
  const u=new URL(url),method=options.method||'GET',path=u.pathname;
  calls.push({method,path,search:u.search,body:options.body?JSON.parse(options.body):null});
  if(method==='GET'&&path.endsWith('/repos/acme/books'))return json(200,{full_name:'acme/books',permissions:{push:true}});
  if(method==='GET'&&path.endsWith('/git/ref/heads/codex%2Fbootstrap-books'))return json(200,{ref:'refs/heads/codex/bootstrap-books',object:{sha:head}});
  if(method==='GET'&&path.endsWith('/git/ref/heads/codex/bootstrap-books'))return json(200,{ref:'refs/heads/codex/bootstrap-books',object:{sha:head}});
  if(method==='GET'&&path.includes('/contents/src/example.js'))return json(200,{type:'file',encoding:'base64',sha:blob,content:Buffer.from(source).toString('base64')});
  if(method==='GET'&&path.includes('/git/ref/heads/')){
   const key=decodeURIComponent(path.split('/git/ref/heads/')[1]||'');
   if(branches.has(key))return json(200,{ref:'refs/heads/'+key,object:{sha:branches.get(key)}});
   return json(404,{message:'Not Found'});
  }
  if(method==='GET'&&path.endsWith('/git/commits/'+base))return json(200,{sha:base,tree:{sha:tree}});
  if(method==='POST'&&path.endsWith('/git/blobs'))return json(201,{sha:newBlob});
  if(method==='POST'&&path.endsWith('/git/trees'))return json(201,{sha:newTree});
  if(method==='POST'&&path.endsWith('/git/commits'))return json(201,{sha:commit});
  if(method==='POST'&&path.endsWith('/git/refs')){
   const branchName=String(options.body&&JSON.parse(options.body).ref).replace(/^refs\/heads\//,'');
   branches.set(branchName,commit);return json(201,{ref:'refs/heads/'+branchName,object:{sha:commit}});
  }
  if(method==='POST'&&path.endsWith('/pulls'))return json(201,{number:4321,html_url:'https://github.com/acme/books/pull/4321',head:{sha:commit},base:{ref:'codex/bootstrap-books'},draft:true});
  return json(500,{message:'Unexpected test route '+method+' '+path});
 };
 return {fetchImpl,calls,branches};
}

test('GitHub source Owned patch contract rejects unsafe paths, duplicate paths and oversized patches',()=>{
 assert.throws(()=>validateGithubOwnedPatch('[]'),/FILE_COUNT/);
 assert.throws(()=>validateGithubOwnedPatch(JSON.stringify([{path:'.env',content:'secret',expectedBlobSha:null}])),/PATH_REJECTED/);
 assert.throws(()=>validateGithubOwnedPatch(JSON.stringify([{path:'.github/workflows/ci.yml',content:'x',expectedBlobSha:null}])),/PATH_REJECTED/);
 assert.throws(()=>validateGithubOwnedPatch(JSON.stringify([{path:'src/a.js',content:'x',expectedBlobSha:null},{path:'src/a.js',content:'y',expectedBlobSha:null}])),/PATH_REJECTED/);
 assert.throws(()=>validateGithubOwnedPatch(JSON.stringify([{path:'src/a.js',content:'x'}])),/EXPECTED_BLOB/);
});

test('readBaseHead reports the live approved base SHA without writing',async()=>{
 const f=fakeGithub(),publisher=createGithubOwnedPublisher({token:'test-token',fetchImpl:f.fetchImpl});
 const head=await publisher.readBaseHead({job,project});
 assert.equal(head.baseSha,base);assert.equal(head.baseBranch,'codex/bootstrap-books');assert.equal(head.readOnly,true);
 assert.equal(f.calls.filter(x=>x.method!=='GET').length,0);
});

test('readFile requires a pinned live base HEAD and returns a verified regular file',async()=>{
 const f=fakeGithub(),publisher=createGithubOwnedPublisher({token:'test-token',fetchImpl:f.fetchImpl});
 const value=await publisher.readFile({job,project,path:'src/example.js',expectedBaseSha:base});
 assert.equal(value.blobSha,oldBlob);assert.equal(value.content,source);assert.equal(value.readOnly,true);
 await assert.rejects(publisher.readFile({job,project,path:'src/example.js',expectedBaseSha:'0'.repeat(40)}),/BASE_HEAD_STALE/);
 await assert.rejects(publisher.readFile({job,project,path:'../package.json',expectedBaseSha:base}),/PATH_REJECTED/);
});

test('publishPatch creates one commit on a new branch, opens Draft PR and verifies GitHub readback',async()=>{
 const f=fakeGithub(),publisher=createGithubOwnedPublisher({token:'test-token',fetchImpl:f.fetchImpl});
 const result=await publisher.publishPatch({job,project,expectedBaseSha:base,filesJson:JSON.stringify(patch),
  commitMessage:'fix: correct example result',confirmWrite:true});
 assert.equal(result.status,'COMMIT_PUBLISHED_VERIFIED');assert.equal(result.commitSha,commit);
 assert.equal(result.prNumber,4321);assert.equal(result.draft,true);assert.equal(result.merged,false);assert.equal(result.deployed,false);
 assert.equal(f.calls.filter(x=>x.method==='POST'&&x.path.endsWith('/git/blobs')).length,1);
 assert.equal(f.calls.filter(x=>x.method==='POST'&&x.path.endsWith('/git/commits')).length,1);
 assert.equal(f.calls.filter(x=>x.method==='POST'&&x.path.endsWith('/pulls')).length,1);
 assert.deepEqual(f.calls.find(x=>x.method==='POST'&&x.path.endsWith('/git/trees')).body.tree.map(x=>x.path),['src/example.js']);
});

test('publishPatch refuses missing confirmation, stale base/file and protected or sensitive paths',async()=>{
 const f=fakeGithub(),publisher=createGithubOwnedPublisher({token:'test-token',fetchImpl:f.fetchImpl});
 await assert.rejects(publisher.publishPatch({job,project,expectedBaseSha:base,filesJson:JSON.stringify(patch),commitMessage:'fix: example',confirmWrite:false}),/EXPLICIT_CONFIRMATION/);
 await assert.rejects(publisher.publishPatch({job,project,expectedBaseSha:'0'.repeat(40),filesJson:JSON.stringify(patch),commitMessage:'fix: example',confirmWrite:true}),/BASE_HEAD_STALE/);
 const stale=fakeGithub({blob:'9'.repeat(40)}),stalePublisher=createGithubOwnedPublisher({token:'test-token',fetchImpl:stale.fetchImpl});
 await assert.rejects(stalePublisher.publishPatch({job,project,expectedBaseSha:base,filesJson:JSON.stringify(patch),commitMessage:'fix: example',confirmWrite:true}),/FILE_BLOB_STALE/);
 const badProject={...project,defaultBranch:'main',productionBranch:'codex/public-book-library'};
 await assert.rejects(publisher.publishPatch({job,project:badProject,expectedBaseSha:base,filesJson:JSON.stringify(patch),commitMessage:'fix: example',confirmWrite:true}),/BASE_BRANCH_NOT_APPROVED/);
 await assert.rejects(publisher.publishPatch({job,project,expectedBaseSha:base,filesJson:JSON.stringify([{path:'secrets/token.js',content:'x',expectedBlobSha:null}]),commitMessage:'fix: example',confirmWrite:true}),/PATH_REJECTED/);
});


test('first-party GitHub App writer is disabled without protected server config',async()=>{
 const job={id:'job_owned_writer_v1',projectKey:'holistic-house',
  githubPlan:{repo:'andylitvinov-design/books',baseBranch:'codex/public-book-library'}};
 const project={repo:'andylitvinov-design/books',defaultBranch:'codex/bootstrap-books',productionBranch:'codex/public-book-library'};
 const filesJson=JSON.stringify([{path:'docs/owned-github-acceptance.md',content:'Test-only controlled note',expectedBlobSha:null}]);
 const input={job,project,expectedBaseSha:'a'.repeat(40),filesJson,commitMessage:'docs: add controlled owner note',
   confirmWrite:true,ownerAuthorized:true,freeCiBudgetVerified:true};
 let calls=0;
 const deps={env:{},fetchImpl:async()=>{calls++;throw Error('MUST_NOT_FETCH')}};
 assert.equal(ownedGithubAppConfigured({}),false);
 await assert.rejects(publishOwnedDraftSource(input,deps),/APP_NOT_CONFIGURED/);
 assert.equal(calls,0);
 await assert.rejects(publishOwnedDraftSource({...input,ownerAuthorized:false},deps),/OWNER_APPROVAL_REQUIRED/);
 await assert.rejects(publishOwnedDraftSource({...input,confirmWrite:false},deps),/OWNER_APPROVAL_REQUIRED/);
 await assert.rejects(publishOwnedDraftSource({...input,freeCiBudgetVerified:false},deps),/CI_COST_UNVERIFIED/);
 assert.equal(calls,0);
});

test('first-party writer rejects unapproved file paths, other repositories, and sensitive source',async()=>{
 const job={id:'job_owned_writer_v1',projectKey:'holistic-house',
  githubPlan:{repo:'andylitvinov-design/books',baseBranch:'codex/public-book-library'}};
 const project={repo:'andylitvinov-design/books',defaultBranch:'codex/bootstrap-books',productionBranch:'codex/public-book-library'};
 const base={job,project,expectedBaseSha:'a'.repeat(40),confirmWrite:true,
  ownerAuthorized:true,freeCiBudgetVerified:true,commitMessage:'fix: safe scoped code update'};
 for(const path of ['.github/workflows/ci.yml','ops/pr-monitor/api/auth.js','lib/auth/token.js','supabase/functions/secret.ts','app/api/payment.ts','docs/secrets.md']){
  const patch=JSON.stringify([{path,content:'change',expectedBlobSha:null}]);
  await assert.rejects(publishOwnedDraftSource({...base,filesJson:patch},{env:{},fetchImpl:async()=>{throw Error('MUST_NOT_FETCH')}}),/PATH_REJECTED|PATH_NOT_APPROVED/);
 }
 await assert.rejects(publishOwnedDraftSource({...base,job:{...job,githubPlan:{...job.githubPlan,repo:'some/other'}}},
  {env:{}}),/PROJECT_SCOPE_INVALID/);
});


test('first-party App broker publishes one scoped Draft PR with independent readback',async()=>{
 const privateKey=generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'pem'}).toString();
 const env={HH_AGENT_GITHUB_WRITE_ENABLED:'true',HH_AGENT_GITHUB_APP_ID:'123',
  HH_AGENT_GITHUB_APP_INSTALLATION_ID:'456',HH_AGENT_GITHUB_APP_PRIVATE_KEY:privateKey};
 const job={id:'run_verified_owner_v1',projectKey:'holistic-house',
  task:'Update approved documentation',githubPlan:{repo:'andylitvinov-design/books',
   baseBranch:'codex/public-book-library',prTitle:'docs: safe owner review'}};
 const project={repo:'andylitvinov-design/books',defaultBranch:'codex/bootstrap-books',
  productionBranch:'codex/public-book-library'};
 const calls=[],original='a'.repeat(40),treeSha='c'.repeat(40),blobSha='d'.repeat(40),
  nextTree='e'.repeat(40),newSha='f'.repeat(40);
 let branch='';
 const fetchImpl=async(url,options={})=>{
  const u=new URL(url),p=u.pathname,method=options.method||'GET';
  calls.push({p,method,body:options.body?JSON.parse(options.body):null});
  if(p==='/app/installations/456/access_tokens')return json(201,{token:'test-installation-token-not-production',
    expires_at:new Date(Date.now()+600000).toISOString()});
  if(method==='GET'&&p==='/repos/andylitvinov-design/books')
   return json(200,{full_name:'andylitvinov-design/books',permissions:{push:true}});
  if(method==='GET'&&p.includes('/git/ref/heads/codex%2Fpublic-book-library'))
   return json(200,{object:{sha:original}});
  if(method==='GET'&&p.includes('/git/ref/heads/codex/public-book-library'))
   return json(200,{object:{sha:original}});
  if(method==='GET'&&p.includes('/contents/docs/test-native-writer.md'))
   return json(404,{message:'Not Found'});
  if(method==='GET'&&p.includes('/git/ref/heads/')){
   return branch?json(200,{object:{sha:newSha}}):json(404,{message:'Not Found'});
  }
  if(method==='GET'&&p.endsWith('/git/commits/'+original))
   return json(200,{sha:original,tree:{sha:treeSha}});
  if(method==='POST'&&p.endsWith('/git/blobs'))return json(201,{sha:blobSha});
  if(method==='POST'&&p.endsWith('/git/trees'))return json(201,{sha:nextTree});
  if(method==='POST'&&p.endsWith('/git/commits'))return json(201,{sha:newSha});
  if(method==='POST'&&p.endsWith('/git/refs')){
   branch=JSON.parse(options.body).ref.replace(/^refs\/heads\//,'');return json(201,{ref:'refs/heads/'+branch,object:{sha:newSha}});
  }
  if(method==='POST'&&p.endsWith('/pulls'))
   return json(201,{number:64,html_url:'https://github.com/andylitvinov-design/books/pull/64',
    head:{sha:newSha},base:{ref:'codex/public-book-library'},draft:true});
  if(method==='GET'&&p.endsWith('/pulls/64'))
   return json(200,{state:'open',draft:true,
    head:{sha:newSha,ref:branch},base:{ref:'codex/public-book-library'},
    html_url:'https://github.com/andylitvinov-design/books/pull/64'});
  return json(503,{error:'Unexpected synthetic request '+method+' '+p});
 };
 const result=await publishOwnedDraftSource({job,project,expectedBaseSha:original,
  filesJson:JSON.stringify([{path:'docs/test-native-writer.md',content:'A bounded safe note.',expectedBlobSha:null}]),
  commitMessage:'docs: add safe owner note',confirmWrite:true,
  ownerAuthorized:true,freeCiBudgetVerified:true},{env,fetchImpl});
 assert.equal(result.status,'COMMIT_PUBLISHED_VERIFIED');
 assert.equal(result.verified,true);assert.equal(result.draft,true);
 assert.equal(result.ciVerified,false);assert.equal(result.merged,false);assert.equal(result.deployed,false);
 assert.equal(result.prNumber,64);assert.equal(result.source,'FIRST_PARTY_GITHUB_APP');
 assert.ok(calls.some(c=>c.p==='/app/installations/456/access_tokens'));
 assert.equal(calls.filter(c=>c.method==='POST'&&c.p.endsWith('/git/commits')).length,1);
 assert.equal(calls.filter(c=>c.method==='POST'&&c.p.endsWith('/pulls')).length,1);
 assert.ok(calls.some(c=>c.method==='GET'&&c.p.endsWith('/pulls/64')));
 assert.ok(calls.every(c=>!c.p.includes('/merge')));
});
