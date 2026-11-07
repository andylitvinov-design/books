import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
const root=new URL('../',import.meta.url)
const read=p=>readFileSync(new URL(p,root),'utf8')
const localPatch=()=>existsSync(new URL('source-patches.json',root))
  ?JSON.parse(read('source-patches.json')):null
test('provider fences videos.insert before first Google request',()=>{
 const s=read('lib/app/community-youtube-provider.js')
 const fence=s.indexOf("state='initiating'")
 const insert=s.indexOf("uploadType=resumable")
 assert.ok(fence>=0&&insert>fence)
 assert.match(s,/if\(!fenced\)fail\('UPLOAD_ALREADY_ATTEMPTED'\)/)
 assert.match(s,/if\(!a\.session_ciphertext\)fail\('OPERATOR_RECONCILIATION_REQUIRED'\)/)
})
test('RLS schema is private, forced, idempotent and gated',()=>{
 const sql=read('supabase/migrations/20261106231500_hh_community_video_publishing_v2.sql')
 assert.match(sql,/force row level security/i)
 assert.match(sql,/revoke all on app_private\.%I from public,anon,authenticated/i)
 assert.match(sql,/source_video_id uuid not null unique references app_private\\.personal_videos\\(id\\) on delete cascade/)
 assert.match(sql,/publication_id uuid not null unique/)
 assert.match(sql,/owner_account_id uuid not null references app\\.accounts\\(id\\) on delete cascade/)
 assert.doesNotMatch(sql,/source_video_id[^\\n]+on delete restrict/)
 const rls=read('scripts/verify-community-video-rls-ci.mjs')
 assert.match(rls,/delete from app\\.accounts where id=\\$1/)
 assert.match(rls,/OWNER_ERASURE_CASCADE_OK/)
 assert.match(sql,/visibility='public_catalog' and catalog_consent_at is not null/)
})
test('personal video delete is blocked while publication active',()=>{
 const patch=localPatch()?.find(p=>p.path==='lib/app/personal-videos.js')
 const source=patch?patch.operations.map(x=>x.replace).join('\n'):read('lib/app/personal-videos.js')
 assert.match(source,/VIDEO_PUBLICATION_WITHDRAW_FIRST/)
})
test('only explicit user action opens community publishing',()=>{
 const patch=localPatch()?.find(p=>p.path==='components/mandala-video-delivery.tsx')
 const all=patch?patch.operations.map(x=>x.replace).join('\n'):read('components/mandala-video-delivery.tsx')
 assert.match(all,/onClick=\{\(\)=>void saveToMyHouse\(true\)\}/)
 assert.doesNotMatch(all,/useEffect\([^]*communityPreview/)
})
