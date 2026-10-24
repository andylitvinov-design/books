import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {validateArticleDraft} from '../lib/practitioners/article-contracts.js'
import {validateArticleSocialComment} from '../lib/practitioners/article-social-contracts.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const ID='11111111-1111-4111-8111-111111111111'
const OP='22222222-2222-4222-8222-222222222222'

test('short author note uses existing moderated article system and refreshes its own excerpt',()=>{
 const note={locale:'ru',kind:'note',title:'Практика внимания',body:'Небольшая заметка о внимании к своему состоянию в течение дня. Спокойная практика осознанного наблюдения без медицинских обещаний.',tags:['Внимание']}
 const a=validateArticleDraft(note,{complete:true})
 assert.equal(a.kind,'note')
 assert.equal(a.locale,'ru')
 assert.ok(a.excerpt.startsWith('Небольшая заметка'))
 const revised=validateArticleDraft({...a,body:'Обновлённая заметка о наблюдении за собой и простых вариантах внимательной практики в течение обычного дня без каких-либо обещаний.'},{complete:true})
 assert.match(revised.excerpt,/^Обновлённая заметка/)
 assert.ok(!revised.excerpt.startsWith('Небольшая'))
 assert.throws(()=>validateArticleDraft({...note,body:'коротко'},{complete:true}),e=>e.code==='INCOMPLETE_ARTICLE')
 assert.throws(()=>validateArticleDraft({...note,kind:'live'},{complete:true}),e=>e.code==='INVALID_ARTICLE_KIND')
 assert.throws(()=>validateArticleDraft({...note,body:'a'.repeat(1801)},{complete:true}),e=>e.code==='NOTE_TOO_LONG')
 const long=validateArticleDraft({locale:'en',title:'Existing long-form article',excerpt:'A complete article summary for the public.',body:'Long educational article. '.repeat(12)},{complete:true})
 assert.equal(long.kind,'article')
})

test('comments require a real account-bound operation and explicit public-display consent',()=>{
 const input={articleId:ID,operationId:OP,displayName:'Reader',body:'Thank you for sharing this helpful reflection.',consent:true}
 assert.equal(validateArticleSocialComment(input).articleId,ID)
 assert.throws(()=>validateArticleSocialComment({...input,consent:false}),e=>e.code==='INVALID_COMMENT')
 assert.throws(()=>validateArticleSocialComment({...input,articleId:'not-uuid'}),e=>e.code==='INVALID_COMMENT')
 assert.throws(()=>validateArticleSocialComment({...input,displayName:'A'}),e=>e.code==='INVALID_COMMENT')
 assert.throws(()=>validateArticleSocialComment({...input,body:'https://spam.example/join'}),e=>e.code==='INVALID_COMMENT')
 assert.throws(()=>validateArticleSocialComment({...input,body:'A'.repeat(801)}),e=>e.code==='INVALID_COMMENT')
 assert.throws(()=>validateArticleSocialComment({...input,unexpected:true}),e=>e.code==='INVALID_COMMENT')
})

test('public news feed reuses the published article snapshots, not private notes/CRM',()=>{
 const [masters,articleRepo,preview,articlePage,writer,switcher]=[
  'app/[locale]/masters/page.tsx','lib/practitioners/article-repository.js',
  'components/practitioner-article-directory.tsx','app/[locale]/articles/[slug]/page.tsx',
  'components/app/practitioner-articles.jsx','components/mentor-community-switch.tsx',
 ].map(read)
 assert.match(masters,/\.publicFeed\(\)/)
 assert.match(articleRepo,/publicFeed\(\)/)
 assert.match(articleRepo,/a\.published<>'\{\}'::jsonb/)
 assert.match(articleRepo,/a\.published->>'locale' in \('en','ru','es'\)/)
 assert.match(preview,/data-practitioner-news-feed/)
 assert.match(preview,/ArticleSocialBar/)
 assert.match(preview,/data-community-write-note/)
 assert.match(articlePage,/ArticleDiscussion/)
 assert.match(writer,/data-article-new-note/)
 assert.match(writer,/command\('submit'\)/)
 assert.match(switcher,/Лента новостей мастеров/)
 assert.match(masters,/MarketplaceMasterFinder/)
 assert.doesNotMatch(preview,/client-report|medical_record|localStorage/i)
})

test('comment and likes server API use session, rate-limit, approval and moderation gates',()=>{
 const [route,db,admin,ui,comments]=[
   'app/api/app/[...path]/route.js','lib/practitioners/article-social-repository.js',
   'app/admin/practitioners/articles/data/route.js','components/practitioner-article-social.tsx',
   'components/practitioner-articles-moderation.jsx',
 ].map(read)
 assert.match(route,/const actor = await auth\.verified\(\)/)
 assert.match(route,/joined === 'community\/likes'/)
 assert.match(route,/joined === 'community\/comments'/)
 assert.match(route,/op:'article-comment'/)
 assert.match(route,/op:'article-like'/)
 assert.match(db,/transaction\(config,actor/)
 assert.match(db,/c\.status='approved'/)
 assert.match(db,/status:'pending'/)
 assert.match(db,/unique|IDEMPOTENCY_CONFLICT/)
 assert.match(admin,/requireAdminRequest/)
 assert.match(admin,/requireSameOrigin/)
 assert.match(admin,/moderateComment/)
 assert.match(ui,/credentials:"same-origin"/)
 assert.match(ui,/consent:true/)
 assert.match(ui,/role="status"/)
 assert.match(comments,/Approve comment/)
})

test('new social tables are private to the existing authorized backend with strict RLS',()=>{
 const sql=read('supabase/migrations/20261024193000_hh_master_news_feed_social.sql')
 for(const table of ['practitioner_article_likes','practitioner_article_comments']){
  assert.match(sql,new RegExp('alter table app\\.'+table+' enable row level security'))
  assert.match(sql,new RegExp('revoke all on app\\.'+table+' from public,anon,authenticated'))
 }
 assert.match(sql,/account_id=\(select auth\.uid\(\)\)/)
 assert.match(sql,/app_private\.session_active\(\)/)
 assert.match(sql,/status='pending'/)
 assert.match(sql,/status='approved'/)
 assert.match(sql,/hh\.moderator/)
 assert.match(sql,/unique\(account_id,operation_id\)/)
 assert.doesNotMatch(sql,/grant .* to anon|grant .* to authenticated/i)
})

test('feed/discussion remain accessible on narrow phones and do not invent engagement',()=>{
 const social=read('components/practitioner-article-social.module.css')
 const feed=read('components/practitioner-articles-public.module.css')
 const writer=read('components/app/practitioner-articles.module.css')
 assert.match(social,/@media\(max-width:430px\)/)
 assert.match(social,/focus-visible/)
 assert.match(feed,/@media\(max-width:359px\)/)
 assert.match(writer,/max-width:430px/)
 assert.match(read('app/[locale]/masters/page.tsx'),/socialAvailable = false/)
})
