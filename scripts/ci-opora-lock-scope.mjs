// Only the hermetic OPORA browser fixture may avoid a second run.
// Mandatory OPORA unit tests, Core and server owners remain required.
// Immutable tested BASE policy: unknown, mixed or changed policy stays FULL.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const MANIFESTS=new Set(['package.json','package-lock.json']);
const SERVER_PATHS=new Set([
  'app/api/app/my-coach/live-relay/route.js',
  'lib/app/clarity-live-relay.js',
  'lib/coaching/clarity-relay-entry.mjs',
  'lib/coaching/relay-session-capacity.mjs',
  'lib/coaching/clarity-trusted-live-connection.mjs',
  'tests/clarity-relay-entry.test.mjs',
  'tests/clarity-trusted-live-connection.test.mjs',
]);
const ROOTS=Object.freeze({'@vercel/functions':'3.11.4','ws':'8.23.0'});
const VERSIONS=Object.freeze({
  ...ROOTS,'@vercel/cli-config':'0.4.0','@vercel/cli-exec':'1.0.1','@vercel/oidc':'5.0.0',
  execa:'5.1.1','get-stream':'6.0.1','human-signals':'2.1.0','is-stream':'2.0.1',
  'merge-stream':'2.0.0','mimic-fn':'2.1.0','npm-run-path':'4.0.1','onetime':'5.1.2',
  'os-paths':'4.4.0','strip-final-newline':'2.0.0','xdg-app-paths':'5.1.0','xdg-portable':'7.3.0',zod:'4.6.7',
});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const without=(a,...keys)=>Object.fromEntries(Object.entries(a).filter(([k])=>!keys.includes(k)));
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const refs=p=>Object.keys(Object.assign({},p?.dependencies,p?.optionalDependencies,p?.peerDependencies,p?.devDependencies));
function testList(s){
  const m=/^node --conditions=react-server --test (tests\/[a-z0-9_/-]+\.(?:test|integration)\.mjs(?: tests\/[a-z0-9_/-]+\.(?:test|integration)\.mjs)*)( && npm run test:monetization)?$/.exec(s);
  return m?{tests:m[1].split(' '),tail:m[2]||''}:null;
}
export function isolatedOporaServerAddition({rows,basePackage,currentPackage,baseLock,currentLock}={}){
  if(!Array.isArray(rows)||rows.length<3||rows.length>SERVER_PATHS.size+2)return false;
  const paths=new Set();
  for(const row of rows){
    if(!row||paths.has(row.filename)||row.previous_filename||
       !['A','M','added','modified'].includes(row.status)||
       !(MANIFESTS.has(row.filename)||SERVER_PATHS.has(row.filename)))return false;
    if(MANIFESTS.has(row.filename)&&!['M','modified'].includes(row.status))return false;
    paths.add(row.filename);
  }
  if(![...MANIFESTS].every(p=>paths.has(p))||![...paths].some(p=>p.startsWith('app/api/')||p.startsWith('lib/')))return false;
  try{
    const [a,b,l,m]=[basePackage,currentPackage,baseLock,currentLock].map(raw=>{
      if(typeof raw!=='string'||raw.length>2_000_000)throw Error('bad source');
      const value=JSON.parse(raw);if(!object(value))throw Error('bad object');return value;
    });
    if(!object(a.dependencies)||!object(b.dependencies)||!object(a.scripts)||!object(b.scripts)||
       !same(without(a,'dependencies','scripts'),without(b,'dependencies','scripts'))||
       !same(without(a.scripts,'test:app'),without(b.scripts,'test:app')))return false;
    if(Object.entries(a.dependencies).some(([k,v])=>b.dependencies[k]!==v))return false;
    const roots=Object.keys(b.dependencies).filter(k=>!Object.hasOwn(a.dependencies,k));
    if(!roots.length||roots.some(k=>!Object.hasOwn(ROOTS,k)||b.dependencies[k]!==ROOTS[k]))return false;
    if(a.scripts['test:app']!==b.scripts['test:app']){
      const old=testList(a.scripts['test:app']),next=testList(b.scripts['test:app']);
      if(!old||!next||old.tail!==next.tail||new Set(next.tests).size!==next.tests.length||
         !same(next.tests.filter(p=>old.tests.includes(p)),old.tests)||
         next.tests.some(p=>!old.tests.includes(p)&&(!paths.has(p)||!SERVER_PATHS.has(p))))return false;
    }
    if(l.lockfileVersion!==3||m.lockfileVersion!==3||!same(without(l,'packages'),without(m,'packages'))||
       !object(l.packages)||!object(m.packages))return false;
    const p=l.packages,q=m.packages;
    if(!object(p[''])||!object(q[''])||!same(p[''].dependencies,a.dependencies)||!same(q[''].dependencies,b.dependencies)||
       !same(without(p[''],'dependencies'),without(q[''],'dependencies'))||
       Object.keys(p).some(k=>k!==''&&(!Object.hasOwn(q,k)||!same(p[k],q[k]))))return false;
    const added=Object.keys(q).filter(k=>!Object.hasOwn(p,k));
    if(!added.length||added.length>Object.keys(VERSIONS).length)return false;
    const names=new Set(added.map(k=>k.replace(/^node_modules\//,'')));
    if(roots.some(k=>!names.has(k)))return false;
    // Existing dependency resolution must not change through a new optional peer.
    for(const [k,value] of Object.entries(p)){
      if(!k)continue;
      if(names.has(k.split('node_modules/').at(-1))||refs(value).some(n=>names.has(n)))return false;
    }
    for(const key of added){
      const n=key.slice('node_modules/'.length),value=q[key];
      if(key!=='node_modules/'+n||!Object.hasOwn(VERSIONS,n)||!object(value)||
         value.version!==VERSIONS[n]||value.link||value.hasInstallScript||value.bin||value.inBundle||
         value.resolved!=='https://registry.npmjs.org/'+n+'/-/'+n.split('/').at(-1)+'-'+value.version+'.tgz'||
         !/^sha512-[A-Za-z0-9+/]{86}==$/.test(value.integrity||''))return false;
    }
    const visited=new Set(),todo=[...roots];
    while(todo.length){
      const n=todo.pop();if(visited.has(n)||!names.has(n))continue;
      visited.add(n);todo.push(...refs(q['node_modules/'+n]));
    }
    return visited.size===names.size;
  }catch{return false;}
}
export function classifyOporaExactMerge(env=process.env,git=execFileSync){
  try{
    if(env.GITHUB_EVENT_NAME!=='pull_request'||env.GITHUB_BASE_REF!=='codex/public-book-library'||
       !/^[0-9a-f]{40}$/.test(env.HH_HEAD_SHA||'')||!/^[0-9a-f]{40}$/.test(env.GITHUB_SHA||''))return true;
    const run=(...args)=>git('git',args,{encoding:'utf8',maxBuffer:2_000_000,stdio:['ignore','pipe','pipe']});
    const merge=run('rev-parse','HEAD').trim(),base=run('rev-parse','HEAD^1').trim(),head=run('rev-parse','HEAD^2').trim();
    if(merge!==env.GITHUB_SHA||head!==env.HH_HEAD_SHA||base!==env.HH_EVENT_BASE)return true;
    const fields=run('diff','--no-renames','--name-status','-z',base,merge).split('\0');
    if(fields.pop()!==''||!fields.length||fields.length%2)return true;
    const rows=[];for(let i=0;i<fields.length;i+=2)rows.push({status:fields[i],filename:fields[i+1]});
    return !isolatedOporaServerAddition({rows,basePackage:run('show',base+':package.json'),currentPackage:run('show',merge+':package.json'),
      baseLock:run('show',base+':package-lock.json'),currentLock:run('show',merge+':package-lock.json')});
  }catch{return true;}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)
  console.log(String(classifyOporaExactMerge()));
