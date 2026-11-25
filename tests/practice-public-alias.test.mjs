import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {validateProfileAlias,PROFILE_ALIAS_RESERVED} from '../lib/practitioners/profile-alias-contract.mjs'

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8')
const invalid=(candidate,code)=>assert.throws(()=>validateProfileAlias(candidate),e=>e.code===code)

test('public aliases are short, normalized and cannot claim platform/system names',()=>{
  assert.equal(validateProfileAlias('Andy-Litvinov'),'andy-litvinov')
  assert.equal(validateProfileAlias('  Andy123  '),'andy123')
  assert.equal(validateProfileAlias('a-b'),'a-b')
  invalid('', 'INVALID_ALIAS')
  invalid('ab','INVALID_ALIAS')
  invalid('a'.repeat(25),'INVALID_ALIAS')
  invalid('-andrey','INVALID_ALIAS')
  invalid('andrey-','INVALID_ALIAS')
  invalid('andrey--litvinov','INVALID_ALIAS')
  invalid('Andrey Litvinov','INVALID_ALIAS')
  invalid('андрей','INVALID_ALIAS')
  invalid('andy@example.com','INVALID_ALIAS')
  invalid(null,'INVALID_ALIAS')
  assert.ok(PROFILE_ALIAS_RESERVED.has('admin'))
  for(const alias of ['admin','api','masters','holistic-house','billing','official','en','ru','es']){
    invalid(alias,'ALIAS_RESERVED')
  }
})

test('alias storage preserves historical links and implements backend-only RLS',async()=>{
  const [sql,repo,endpoint]=await Promise.all([
    read('supabase/migrations/20261025181000_hh_practitioner_public_aliases.sql'),
    read('lib/practitioners/repository.js'),
    read('app/api/app/[...path]/route.js'),
  ])
  assert.match(sql,/alias text primary key/)
  assert.match(sql,/on app\.practitioner_profile_aliases\(practitioner_id\) where is_primary/)
  assert.match(sql,/enable row level security/)
  assert.match(sql,/revoke all .* from public, anon, authenticated/)
  assert.match(sql,/for insert to hh_app_backend with check/)
  assert.match(sql,/for update to hh_app_backend/)
  assert.match(sql,/trusted_auth_user_id=\(select auth\.uid\(\)\)/)
  assert.match(repo,/ownedPractitioner\(db,actor,true\)/)
  assert.match(repo,/await readyAccount\(db,actor\)/)
  assert.match(repo,/ALIAS_CHANGE_LIMIT/)
  assert.match(repo,/ALIAS_TAKEN/)
  assert.match(repo,/error\?\.code==='23505'/)
  assert.match(repo,/set is_primary=false/)
  assert.doesNotMatch(repo,/delete from app\.practitioner_profile_aliases/)
  assert.match(repo,/publicStatusSql\('p'\)/)
  assert.match(repo,/publicAlias:primaryAlias/)
  assert.match(endpoint,/joined === 'practice\/alias' && method === 'GET'/)
  assert.match(endpoint,/joined === 'practice\/alias'\)/)
  assert.match(endpoint,/practitioner-alias-check/)
  assert.match(endpoint,/practitioner-alias-save/)
  assert.match(endpoint,/requireSameOrigin\(request, config\)/)
})

test('short EN/RU/ES routes reuse reviewed master content, canonical URLs and restricted CSP',async()=>{
  const [en,localized,original,middleware]=await Promise.all([
    read('app/m/[alias]/page.tsx'),
    read('app/[locale]/m/[alias]/page.tsx'),
    read('app/[locale]/masters/[slug]/page.tsx'),
    read('middleware.ts'),
  ])
  assert.match(en,/locale:'en'/)
  assert.match(localized,/resolvePublicAlias\(alias\)/)
  assert.match(localized,/MasterProfile\(\{params:Promise\.resolve\(\{locale,slug\}\)\}\)/)
  assert.match(localized,/notFound\(\)/)
  assert.match(localized,/profileMetadata\(/)
  assert.match(original,/canonical: "\/" \+ locale \+ "\/masters\/" \+ slug/)
  assert.match(middleware,/m\\\/\[a-z0-9-\]\{3,24\}/)
  assert.doesNotMatch(localized,/draft_profile|trusted_auth_user_id|service_role/)
})

test('mobile My Practice displays reserved link, live preview and copy without exposing a draft',async()=>{
  const [workspace,widget,css]=await Promise.all([
    read('components/app/practice-workspace.jsx'),
    read('components/app/practice-public-alias.jsx'),
    read('components/app/practice-public-alias.module.css'),
  ])
  assert.match(workspace,/<PracticePublicAlias practitioner=\{p\}/)
  assert.match(workspace,/publicPath=p\.publicAlias/)
  assert.match(workspace,/profileLive=\{profileLive\}/)
  assert.match(widget,/maxLength=\{24\}/)
  assert.match(widget,/profileLive&&<div className=\{styles\.share\}>/)
  assert.match(widget,/navigator\.clipboard/)
  assert.match(widget,/method:'POST',credentials:'same-origin'/)
  assert.match(widget,/data-practice-public-alias/)
  assert.match(widget,/ru:/)
  assert.match(widget,/es:/)
  assert.match(widget,/en:/)
  assert.match(css,/min-width:0/)
  assert.match(css,/min-height:44px/)
  assert.match(css,/@media\(max-width:340px\)/)
})
