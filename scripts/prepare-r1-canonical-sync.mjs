import {execFileSync,spawnSync} from 'node:child_process'
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs'
if(process.env.CI!=='true'||process.env.GITHUB_REPOSITORY!=='andylitvinov-design/books'||process.env.GITHUB_REF!=='refs/heads/codex/holistic-house-app-r1')throw new Error('Feature CI only')
const base='59ce68425204412a86c60404d65db1539ed84a65'
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'})
const originalPackage=JSON.parse(readFileSync('package.json','utf8'))
git('config','user.email','synthetic-review@example.invalid');git('config','user.name','R1 Source Review')
const merge=spawnSync('git',['merge','--no-commit','--no-ff',base],{encoding:'utf8'})
if(merge.status!==0&&merge.status!==1)throw new Error('Cannot prepare canonical merge')
const resolved=['app/[locale]/client/page.tsx','app/es/client/page.tsx','components/mobile-bottom-navigation.tsx','middleware.ts','package.json']
const conflicts=git('diff','--name-only','--diff-filter=U').trim().split('\n').filter(Boolean)
if(conflicts.some(p=>!resolved.includes(p)))throw new Error('Unexpected conflict paths: '+conflicts.join(','))
const source=path=>git('show',`${base}:${path}`)
function changeOnce(content,from,to){if(content.split(from).length!==2)throw new Error('Canonical source marker changed');return content.replace(from,to)}
for(const path of ['app/[locale]/client/page.tsx','app/es/client/page.tsx']){
 let content="import { AppEntryLink } from '@/components/app/app-entry-link';\n"+source(path)
 const marker=path.startsWith('app/es/')?'<PublicSiteHeader locale="es" />':'<PublicSiteHeader locale={typedLocale} />'
 content=changeOnce(content,marker,marker+(path.startsWith('app/es/')?'<AppEntryLink locale="es" />':'\n      <AppEntryLink locale={typedLocale} />'))
 writeFileSync(path,content)
}
let nav=source('components/mobile-bottom-navigation.tsx')
nav=changeOnce(nav,'|document-preview(?:\\/|$)', '|(?:ru|en)\\/app(?:\\/|$)|document-preview(?:\\/|$)')
writeFileSync('components/mobile-bottom-navigation.tsx',nav)
let middleware=source('middleware.ts')
middleware=changeOnce(middleware,"    || decoded.startsWith('/api/client')","    || /^\\/(ru|en)\\/app(?:\\/|$)/.test(decoded)\n    || /^\\/api\\/app(?:\\/|$)/.test(decoded)\n    || decoded.startsWith('/api/client')")
middleware=changeOnce(middleware,"    || decoded.startsWith('/admin/')","    || /^\\/admin(?:\\/|$)/.test(decoded)")
middleware=changeOnce(middleware,"'private, no-store, max-age=0'","'private, no-store, max-age=0, must-revalidate'")
writeFileSync('middleware.ts',middleware)
const pkg=JSON.parse(source('package.json'))
for(const key of ['scripts','dependencies','devDependencies','overrides'])pkg[key]={...pkg[key],...originalPackage[key]}
pkg.engines=originalPackage.engines
writeFileSync('package.json',JSON.stringify(pkg,null,2)+'\n')
let regression=readFileSync('.github/workflows/hh-app-regression.yml','utf8')
regression=regression.replaceAll('5ac4e18f4673e2793644fd6ca41544b4605818d0',base)
writeFileSync('.github/workflows/hh-app-regression.yml',regression)
for(const path of ['scripts/prepare-r1-canonical-sync.mjs','.github/workflows/hh-app-canonical-sync.yml'])unlinkSync(path)
git('add','-A')
if(git('diff','--name-only','--diff-filter=U').trim())throw new Error('Unresolved merge')
console.log('Prepared merge with canonical '+base+'; no branch or production ref changed.')
