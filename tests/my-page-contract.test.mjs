import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const sql=read('supabase/migrations/20261113173500_universal_my_page_v1.sql')
const api=read('lib/app/my-page.js')
const privateRoute=read('app/api/app/my-page/route.js')
const video=read('app/api/public/my-page/video/[id]/route.js')
const publicRoute=read('app/[locale]/u/[handle]/page.jsx')
const ui=read('components/app/my-page-client.jsx')
test('new pages and items are FORCE RLS and not in public Data API',()=>{
 assert.match(sql,/app_private\.user_pages enable row level security/i)
 assert.match(sql,/app_private\.user_pages force row level security/i)
 assert.match(sql,/app_private\.user_page_items force row level security/i)
 assert.match(sql,/revoke all on app_private\.user_pages,app_private\.user_page_items from public,anon,authenticated,hh_app_inbox/i)
 assert.match(sql,/visibility='public' and exists/)
 assert.match(sql,/is_published/)
})
test('verified owner and same-origin write guard precede post',()=>{
 assert.match(privateRoute,/requireSameOrigin\(request,config\)/)
 assert.match(privateRoute,/await auth\.verified\(\)/)
 assert.match(privateRoute,/ACCOUNT_CHANGED/)
 assert.match(privateRoute,/await consumeRate/)
 assert.match(privateRoute,/readBody\(request,2600\)/)
})
test('public page never fetches owner-only video URL or private test scores',()=>{
 assert.match(api,/transaction\(config,null/)
 assert.match(api,/\{server:true\}/)
 assert.match(publicRoute,/getPublicMyPage/)
 assert.doesNotMatch(publicRoute,/context_ciphertext|answers|session_id|secretKey/)
 assert.match(video,/createSignedUrl\(key,60\)/)
 assert.match(video,/url\.origin!==new URL\(config\.supabaseUrl\)\.origin/)
})
test('no automatic publication, consent before video sharing, delete revokes media',()=>{
 assert.match(sql,/visibility text not null default 'private'/)
 assert.match(sql,/revoke_deleted_user_page_video/)
 assert.match(api,/if\(!page\?\.is_published\)bad\('PAGE_NOT_PUBLIC',409\)/)
 assert.match(api,/and status='ready'/)
 assert.match(api,/if\(!input\.published\)await db\.query/)
 assert.match(ui,/data-my-page-google/)
 assert.match(ui,/action:'setVisibility'/)
 assert.match(ui,/action:'addVideo'/)
})
test('Personal My Page entry is in both Life and Work, EN/RU/ES',()=>{
 assert.match(read('components/app/profile-hub-tabs.jsx'),/data-profile-my-page/)
 assert.match(read('components/practice-showcase.jsx'),/data-work-my-page/)
 for(const v of ['ru','en','es']){
  assert.match(ui,new RegExp('^'+v+':','m'))
  assert.match(publicRoute,new RegExp('^ '+v+':','m'))
 }
})

test('my video library links to user publication workspace',()=>{
 assert.match(read('components/app/my-personal-videos.jsx'),/data-my-videos-publish-page/)
})
test('public projection suppresses opted-out counts',()=>{
 assert.match(api,/if\(!page\.share_tests\)page\.test_count=null/)
 assert.match(api,/if\(!page\.share_practices\)page\.practice_count=null/)
 assert.match(api,/if\(!page\.share_videos\)page\.video_count=null/)
})
