// Synthetic-only, real PostgreSQL RLS and moderation verification.
// No production accounts, public post, notification or payment is touched.
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {getAppConfig} from '../../lib/app/config.js'
import {createArticleSocialRepository} from '../../lib/practitioners/article-social-repository.js'
import {createArticleRepository} from '../../lib/practitioners/article-repository.js'
import {closeDatabase} from '../../lib/app/database.js'
import {assertIsolated,actor,A,B,rawAs} from './app-db-setup.mjs'

assertIsolated()
const config=getAppConfig()
assert.equal(config.test,true)
const social=createArticleSocialRepository(config)
const articles=createArticleRepository(config)
const accountA=actor(A),accountB=actor(B)

try {
 const published=await articles.publicList('en')
 assert.ok(published.length>=1,'Requires seeded synthetic English article')
 const id=published[0].id
 const baseline=(await social.publicStats([id]))[id]
 assert.equal(baseline.likes,0)
 assert.equal(baseline.comments,0)

 const first=await social.toggleLike(accountA,id)
 assert.deepEqual(first,{liked:true,likes:1})
 const second=await social.toggleLike(accountB,id)
 assert.deepEqual(second,{liked:true,likes:2})
 const unlike=await social.toggleLike(accountA,id)
 assert.deepEqual(unlike,{liked:false,likes:1})
 assert.equal((await social.publicStats([id]))[id].likes,1)

 const operationId=randomUUID()
 const payload={articleId:id,operationId,displayName:'Synthetic Reader',
  body:'This is a synthetic thoughtful question about the educational practice.',consent:true}
 const requested=await social.addComment(accountB,payload)
 assert.equal(requested.saved,true)
 assert.equal(requested.status,'pending')
 assert.equal(requested.duplicate,false)
 const repeat=await social.addComment(accountB,payload)
 assert.equal(repeat.id,requested.id)
 assert.equal(repeat.duplicate,true)
 assert.equal((await social.publicComments(id)).length,0)
 assert.equal((await social.publicStats([id]))[id].comments,0)
 assert.ok((await social.moderationList()).some(item=>item.id===requested.id&&item.status==='pending'))

 // The nonmoderator account may not bypass RLS by writing status.
 const illicit=await rawAs(accountA,'hh_app_backend',db=>
   db.query("update app.practitioner_article_comments set status='approved' where id=$1 returning id",[requested.id]))
 assert.equal(illicit.rowCount,0)

 await assert.rejects(
   rawAs(accountA,'authenticated',db=>
     db.query('select * from app.practitioner_article_comments where id=$1',[requested.id])),
   error=>['42501','42P01'].includes(error.code),
   'Direct client roles must never read unapproved comments or bypass grants',
 )

 assert.equal((await social.moderateComment(requested.id,'approve')).status,'approved')
 const readback=await social.publicComments(id)
 assert.equal(readback.length,1)
 assert.equal(readback[0].body,payload.body)
 assert.equal(readback[0].displayName,payload.displayName)
 assert.equal((await social.publicStats([id]))[id].comments,1)

 assert.equal((await social.moderateComment(requested.id,'hide')).status,'hidden')
 assert.equal((await social.publicComments(id)).length,0)
 assert.equal((await social.publicStats([id]))[id].comments,0)

 // This does not create a hidden social review of practitioners.
 console.log('PRACTITIONER_NEWS_SOCIAL_DB_PASS: unique likes, idempotent comments, RLS, pending/approve/hide')
} finally {
 await closeDatabase()
}
