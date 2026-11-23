import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SITE_OWNER_AVATARS,isSiteOwnerAvatarId,visibleSiteOwnerAvatars} from '../lib/coaching/site-owner-avatar-presets.mjs';
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('the eight already-generated site MP4s reuse My Coach paths without another render',()=>{
  assert.equal(SITE_OWNER_AVATARS.length,8);
  assert.equal(new Set(SITE_OWNER_AVATARS.map(x=>x.id)).size,8);
  for(const item of SITE_OWNER_AVATARS){
    assert.equal(isSiteOwnerAvatarId(item.id),true);
    assert.match(item.video,/^\/images\/holistic-house\/my-coach-motion\/(mira|sofia|max|alex)-natural-(calm|attentive)-v1\.mp4$/);
    assert.match(item.poster,/^\/images\/holistic-house\/my-coach-motion\/.*-still\.webp$/);
  }
  assert.equal(isSiteOwnerAvatarId('../../private'),false);
  assert.equal(visibleSiteOwnerAvatars(['mira-calm']).length,7);
});
test('private per-owner preference has session, origin, RLS, account and allowlist checks',()=>{
  const route=src('app/api/app/site-avatar-visibility/route.js');
  for(const re of [/createRequestAuth/,/auth\.verified\(\)/,/practitionerEmailAllowed\(actor\)/,
    /requireSameOrigin\(request,config\)/,/transaction\(ctx\.config,ctx\.actor/,
    /account_id=\$1/,/isSiteOwnerAvatarId/,/PRIVATE_HEADERS/])assert.match(route,re);
  assert.doesNotMatch(route,/service_role|\.storage\.remove|heygen\.ai/i);
  const migration=src('supabase/migrations/20261122041736_hh_site_owner_avatar_visibility_v1.sql');
  for(const re of [/references app\.accounts\(id\) on delete cascade/,/enable row level security/,
    /force row level security/,/revoke all .*anon,authenticated/,
    /account_id=\(select auth\.uid\(\)\)/,/account_active\(\)/])assert.match(migration,re);
});
test('existing avatar tab reuses personal private-delete and adds owner-only site-hidden gallery',()=>{
  const owner=src('components/app/site-owner-avatar-gallery.jsx');
  const live=src('components/app/my-live-photos.jsx');
  assert.match(live,/<SiteOwnerAvatarGallery locale=\{locale\}/);
  assert.match(live,/method: 'DELETE'/);
  assert.match(owner,/data-site-owner-avatar-gallery/);
  assert.match(owner,/method:'POST'/);
  assert.match(owner,/return null/);
  assert.doesNotMatch(owner,/uploadHeyGen|\.storage\./i);
});
