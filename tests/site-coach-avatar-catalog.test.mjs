import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {SITE_COACH_AVATAR_CATALOG,isSiteCoachAvatarId} from '../lib/app/site-coach-avatar-catalog.mjs'

const text=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('eight generated, first-party clips are canonical and safely named',()=>{
  assert.equal(SITE_COACH_AVATAR_CATALOG.length,8)
  assert.equal(new Set(SITE_COACH_AVATAR_CATALOG.map(item=>item.id)).size,8)
  assert.deepEqual(new Set(SITE_COACH_AVATAR_CATALOG.map(item=>item.personaId)),
    new Set(['mira','sofia','max','alex']))
  for(const item of SITE_COACH_AVATAR_CATALOG){
    assert.equal(isSiteCoachAvatarId(item.id),true)
    assert.match(item.video,/^\/images\/holistic-house\/my-coach-motion\/(mira|sofia|max|alex)-natural-(calm|attentive)-v1\.mp4$/)
    assert.match(item.poster,/^\/images\/holistic-house\/my-coach-motion\/(mira|sofia|max|alex)-still\.webp$/)
    assert.ok(item.names.en&&item.names.ru&&item.names.es)
  }
  assert.equal(isSiteCoachAvatarId('../support-photo'),false)
  assert.equal(isSiteCoachAvatarId('mira-idle'),false)
})

test('owner-only, same-origin per-account hide and restore leave public assets intact',()=>{
  const api=text('app/api/app/site-coach-avatars/route.js')
  assert.match(api,/practitionerEmailAllowed\(actor\)/)
  assert.match(api,/requireSameOrigin\(request,config\)/)
  assert.match(api,/await auth\.verified\(\)/)
  assert.match(api,/transaction\(config,actor/)
  assert.match(api,/account_id=\$1 and avatar_id=\$2/)
  assert.match(api,/on conflict do nothing/)
  assert.doesNotMatch(api,/\.storage\.remove|\.storage\.from|unlink\(|rmSync\(|\/v3\/assets|api\.heygen\.com/)
  const migration=text('supabase/migrations/20261122035500_hh_site_coach_avatar_visibility_v1.sql')
  assert.match(migration,/force row level security/i)
  assert.match(migration,/account_id=\(select auth\.uid\(\)\)/i)
  assert.match(migration,/app_private\.account_active\(\)/)
  assert.match(migration,/on delete cascade/)
})

test('private photo deletion is preserved for regular clients',()=>{
  const photo=text('app/api/app/support-photo/route.js')
  assert.match(photo,/export async function DELETE/)
  assert.match(photo,/requireSameOrigin\(request,config\)/)
  assert.match(photo,/ctx\.storage\.remove\(\[keyFor\(ctx\.actor\)\]\)/)
  const workspace=text('components/app/app-workspace.jsx')
  assert.match(workspace,/OwnerCoachAvatarLibrary/)
  assert.match(workspace,/<MyPersonalVideos locale=/)
})

test('cabinet UI only mounts on avatar tab, with no autoplay and restore',()=>{
  const ui=text('components/app/owner-coach-avatar-library.jsx')
  assert.match(ui,/tab!=='avatars'/)
  assert.match(ui,/error\?\.code==='ACCESS_DENIED'/)
  assert.match(ui,/hidden\?'POST':'DELETE'/)
  assert.match(ui,/preload="none"/)
  assert.doesNotMatch(ui,/\bautoPlay\b/)
  for(const phrase of ['Remove from my avatars','Убрать из моих аватаров','Quitar de mis avatares'])
    assert.ok(ui.includes(phrase))
})
