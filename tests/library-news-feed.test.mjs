import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const source = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('Library defaults to Latest news feed with videos, articles and guides while keeping Books access',()=>{
  const page = source('app/[locale]/library/page.tsx')
  const hub = source('components/library-hub.tsx')
  const feed = source('components/library-feed.tsx')
  const css = source('components/library-feed.module.css')
  assert.match(page,/rawView === "videos".*"latest"/)
  assert.match(hub,/library-media-switch/)
  assert.match(hub,/view=books/)
  assert.match(hub,/view=videos/)
  assert.match(hub,/LibraryFeed/)
  assert.match(feed,/role="group"/)
  assert.match(feed,/setLimit\(current => current \+ 8\)/)
  assert.match(feed,/youtube-nocookie\.com\/embed/)
  assert.match(feed,/setPlayingId\(item.id\)/)
  assert.match(css,/@media\(max-width:640px\)/)
  assert.match(css,/grid-template-columns:116px minmax\(0,1fr\)/)
})

test('Only explicitly approved public YouTube resources are included, not client private storage',()=>{
  const lib=source('lib/clients/material-library.js')
  const pubApi=source('app/api/admin/materials/[id]/route.js')
  const mediaApi=source('app/api/admin/materials/[id]/media/route.js')
  const migration=source('supabase/migrations/20261018014000_hh_public_materials_library_feed.sql')
  const ownerUI=source('components/practitioner-materials-cabinet.jsx')
  assert.match(lib,/where kind='youtube' and status='ready' and public_locale=\$1 and published_at is not null/)
  assert.match(lib,/parseSessionYouTubeUrl\(row.url\)/)
  assert.doesNotMatch(lib.slice(lib.indexOf('export async function listPublicLibraryVideos')),/object_key|storage\.from|privateMediaObjectStream/)
  assert.match(pubApi,/ownerMaterialRequest/)
  assert.match(pubApi,/data.reviewed!==true/)
  assert.match(ownerUI,/window.confirm/)
  assert.match(ownerUI,/Publish to Library/)
  assert.match(ownerUI,/This original file stays private/)
  assert.match(mediaApi,/ownerMaterialRequest/)
  assert.match(migration,/published_at IS NULL OR/)
  assert.match(migration,/kind='youtube' AND status='ready'/)
  assert.match(migration,/hh_material_public_feed_idx/)
})

test('News feed includes approved existing video mirrors without new upload or generating avatars',()=>{
  const hub=source('components/library-hub.tsx')
  for(const id of ['Y4K4piEwwA8','s30Y42IwPcg','ILyRWyHtJoE','AE8Pelpo424','Cz6SxXJNZbw','Q9NvYECKWuc'])
    assert.ok(hub.includes(id),'Missing approved video '+id)
  assert.match(hub,/publishedIds\.has\(youtubeId\)/)
  assert.match(hub,/sort\(\(a, b\)/)
  assert.match(hub,/publishedVideos\.map/)
  assert.match(hub,/articles\.map/)
})
