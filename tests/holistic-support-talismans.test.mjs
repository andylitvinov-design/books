import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('Holistic Support offers and opens personal talismans in all three locales',()=>{
  const page=read('app/[locale]/holistic-support/page.tsx')
  const hero=read('components/ideas-discovery.tsx')
  const widget=read('components/support-talisman-gallery.tsx')
  for(const locale of ['en','ru','es'])assert.match(widget,new RegExp('\\b'+locale+':\\s*\\{'))
  assert.match(read('components/holistic-support-topic-filter.tsx'),/data-holistic-order-trigger=\{id\}/)
  assert.match(page,/id="talismans"/)
  assert.match(page,/TaoistTalismanCatalog locale=\{locale\}/)
  assert.match(read('components/taoist-talisman-catalog.tsx'),/SupportTalismanGallery locale=\{locale\}/)
  assert.match(hero,/data-ideas-talismans/)
  assert.match(hero,/data-ideas-meditations/)
  assert.match(widget,/data-talisman-upload/)
  assert.match(widget,/TALISMAN_TOO_LARGE/)
})

test('Talismans are private, account-owned, and cannot become published by upload',()=>{
  const migration=read('supabase/migrations/20261025155308_hh_support_personal_talismans.sql')
  const route=read('app/api/holistic-support/talismans/route.js')
  const repository=read('lib/app/support-talismans.js')
  assert.match(migration,/public,file_size_limit,allowed_mime_types\)\s*values\s*\('hh-support-talismans','hh-support-talismans',false/)
  assert.match(migration,/create policy hh_support_talismans_reserved_upload/)
  assert.match(migration,/t.state='uploading'/)
  assert.match(migration,/account_id=\(select auth.uid\(\)\)/)
  assert.match(migration,/create policy hh_support_talismans_owner_read/)
  assert.match(route,/requireSameOrigin\(request,config\)/)
  assert.match(route,/auth\.verified\(\)/)
  assert.match(route,/contentType:'image\/jpeg',cacheControl:'60',upsert:false/)
  assert.match(route,/sharp\(Buffer\.from/)
  assert.match(repository,/TALISMAN_LIMIT = 30/)
  assert.doesNotMatch(route,/storage\/v1\/object\/public/)
})


test('Supabase private image upload includes linux native libvips and never loads it for anonymous gallery reads',()=>{
  const config=read('next.config.ts')
  const route=read('app/api/holistic-support/talismans/route.js')
  assert.match(config, /"\/api\/holistic-support\/talismans": \[/)
  assert.match(config,/node_modules\/@img\/sharp-libvips-linux-x64\/\*\*\/\*/)
  assert.match(config,/node_modules\/@img\/sharp-linux-x64\/\*\*\/\*/)
  assert.doesNotMatch(route,/^import sharp from /m)
  assert.match(route,/\(\{default:sharp\}=await import\('sharp'\)\)/)
  assert.ok(route.indexOf("auth.verified()")<route.indexOf("await import('sharp')"))
})
