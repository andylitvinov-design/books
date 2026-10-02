// One-use source repair/format preparation; it never pushes a commit or changes a ref.
import {readFile,writeFile,readdir} from 'node:fs/promises'
import {join} from 'node:path'
if(process.env.GITHUB_REPOSITORY!=='andylitvinov-design/books'||process.env.GITHUB_REF!=='refs/heads/codex/holistic-house-app-r1'||process.env.CI!=='true')throw new Error('Feature-branch CI only')
async function replace(path,from,to){const before=await readFile(path,'utf8');if(before.split(from).length!==2)throw new Error('Expected one source match: '+path);await writeFile(path,before.replace(from,to))}
await replace('tests/app-database.integration.mjs',"await assert.rejects(()=>repo.inboxUpdate(request.id,{status:'closed',expectedRevision:cancelled.revision}),/REVISION_CONFLICT/)","// SELECT FOR UPDATE also applies the UPDATE RLS policy: cancelled requests are not mutable.\n await assert.rejects(()=>repo.inboxUpdate(request.id,{status:'closed',expectedRevision:cancelled.revision}),/NOT_FOUND/)\n assert.equal((await repo.inbox()).find(r=>r.id===request.id).status,'cancelled')")
await replace('components/app/app-workspace.jsx',"hide=()=>setData(null)","hide=()=>{setData(null);setState('loading')}")
await replace('lib/app/repository.js',"if(!actor.signedInAt||Date.now()-Date.parse(actor.signedInAt)>10*60*1000)","if(!Number.isFinite(Date.parse(actor.signedInAt))||Date.parse(actor.signedInAt)>Date.now()||Date.now()-Date.parse(actor.signedInAt)>10*60*1000)")
const pkg=JSON.parse(await readFile('package.json','utf8'));pkg.scripts['test:app']+=' tests/app-timestamps.test.mjs';await writeFile('package.json',JSON.stringify(pkg,null,2)+'\n')
// Diagnostic is operational and enabled only in loopback, non-Vercel synthetic CI.
await replace('lib/app/http.js',"export function safeError(error){",`export function safeError(error){
 if(process.env.CI==='true'&&process.env.HH_APP_TEST_RUNTIME==='isolated'&&!process.env.VERCEL&&!(error instanceof AppError)){
  const detail=String(error?.message||'').replace(/https?:\\/\\/[^\\s]+/g,'[url]').replace(/(?:password|token|secret|code_verifier)=[^\\s&]+/gi,'[redacted]').slice(0,300)
  console.error('HH_APP_TEST_ERROR',error?.name||'Error',error?.code||'',detail)
 }
`)
await replace('.github/workflows/hh-app-browser.yml',"          node scripts/verify-app-r1.mjs\n",`          if ! node scripts/verify-app-r1.mjs; then
            grep 'HH_APP_TEST_ERROR' /tmp/hh-app-next.log | tail -10 || true
            exit 1
          fi
`)
const{format}=await import('/tmp/hh-format/node_modules/prettier/index.mjs')
const roots=['components/app','lib/app','lib/assessments','lib/profile','data/assessments','app/api/app','app/admin/app-requests','app/[locale]/app']
async function walk(path){for(const item of await readdir(path,{withFileTypes:true})){const file=join(path,item.name);if(item.isDirectory())await walk(file);else if(/\.(?:js|jsx|ts|tsx|css)$/.test(file))await writeFile(file,await format(await readFile(file,'utf8'),{filepath:file,singleQuote:true,semi:false,printWidth:100}))}}
for(const root of roots)await walk(root)
for(const file of ['data/app-services.js','tests/app-database.integration.mjs','tests/app-assessments.test.mjs','tests/app-http-security.test.mjs','tests/app-timestamps.test.mjs','tests/app-migration-contract.test.mjs'])await writeFile(file,await format(await readFile(file,'utf8'),{filepath:file,singleQuote:true,semi:false,printWidth:100}))
console.log('Explicit source patches and readable formatting prepared; no branch refs changed.')
