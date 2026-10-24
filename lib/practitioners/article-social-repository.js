import 'server-only'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {transaction} from '../app/database.js'
import {validateArticleSocialComment} from './article-social-contracts.mjs'

const publicArticleSql=`a.published<>'{}'::jsonb
  and a.status in('published','submitted','changes_requested')
  and p.active and p.public_profile<>'{}'::jsonb
  and p.status in('approved','submitted','changes_requested')`
const requirePublished=async(db,id)=>{
 const found=(await db.query(`select a.id from app.practitioner_articles a
   join app.practitioners p on p.id=a.practitioner_id
   where a.id=$1 and ${publicArticleSql} limit 1`,[id])).rows[0]
 if(!found)throw new AppError('ARTICLE_NOT_FOUND',404)
}
const viewComment=row=>({
 id:row.id,displayName:row.display_name,body:row.body,
 createdAt:row.created_at instanceof Date?row.created_at.toISOString():row.created_at,
})

export function createArticleSocialRepository(config){
 return {
  async publicStats(ids){
   const clean=[...new Set((Array.isArray(ids)?ids:[]).filter(id=>typeof id==='string'))].slice(0,100)
   for(const id of clean)requireUUID(id)
   if(!clean.length)return {}
   return transaction(config,null,async db=>{
    const rows=(await db.query(`select a.id,
      (select count(*)::int from app.practitioner_article_likes l where l.article_id=a.id) as likes,
      (select count(*)::int from app.practitioner_article_comments c
        where c.article_id=a.id and c.status='approved') as comments
     from app.practitioner_articles a join app.practitioners p on p.id=a.practitioner_id
     where a.id=any($1::uuid[]) and ${publicArticleSql}`,[clean])).rows
    return Object.fromEntries(rows.map(row=>[row.id,{likes:row.likes,comments:row.comments}]))
   },{server:true})
  },
  async publicComments(articleId){
   requireUUID(articleId)
   return transaction(config,null,async db=>{
    await requirePublished(db,articleId)
    const rows=(await db.query(`select c.id,c.display_name,c.body,c.created_at
      from app.practitioner_article_comments c
      where c.article_id=$1 and c.status='approved'
      order by c.created_at desc,c.id desc limit 60`,[articleId])).rows
    return rows.map(viewComment)
   },{server:true})
  },
  async toggleLike(actor,articleId){
   requireUUID(articleId)
   return transaction(config,actor,async db=>{
    await requirePublished(db,articleId)
    const liked=(await db.query(`select 1 from app.practitioner_article_likes
      where article_id=$1 and account_id=$2`,[articleId,actor.id])).rowCount>0
    if(liked){
     await db.query('delete from app.practitioner_article_likes where article_id=$1 and account_id=$2',[articleId,actor.id])
    }else{
     await db.query(`insert into app.practitioner_article_likes(article_id,account_id)
       values($1,$2) on conflict do nothing`,[articleId,actor.id])
    }
    const current=(await db.query('select 1 from app.practitioner_article_likes where article_id=$1 and account_id=$2',[articleId,actor.id])).rowCount>0
    const likes=(await db.query('select count(*)::int as n from app.practitioner_article_likes where article_id=$1',[articleId])).rows[0]?.n??0
    return {liked:current,likes}
   })
  },
  async addComment(actor,raw){
   const input=validateArticleSocialComment(raw)
   return transaction(config,actor,async db=>{
    await requirePublished(db,input.articleId)
    const prior=(await db.query(`select id,article_id,status from app.practitioner_article_comments
      where account_id=$1 and operation_id=$2`,[actor.id,input.operationId])).rows[0]
    if(prior){
      if(prior.article_id!==input.articleId)throw new AppError('IDEMPOTENCY_CONFLICT',409)
      return {saved:true,id:prior.id,status:prior.status,duplicate:true}
    }
    const row=(await db.query(`insert into app.practitioner_article_comments
      (article_id,account_id,operation_id,display_name,body)
      values($1,$2,$3,$4,$5) on conflict(account_id,operation_id) do nothing
      returning id,status`,[input.articleId,actor.id,input.operationId,input.displayName,input.body])).rows[0]
    if(!row)return {saved:true,status:'pending',duplicate:true}
    return {saved:true,id:row.id,status:'pending',duplicate:false}
   })
  },
  async deleteComment(actor,id){
   requireUUID(id)
   return transaction(config,actor,async db=>{
    const removed=await db.query('delete from app.practitioner_article_comments where id=$1 and account_id=$2 returning id',[id,actor.id])
    if(!removed.rowCount)throw new AppError('NOT_FOUND',404)
    return {deleted:true}
   })
  },
  async moderationList(){
   return transaction(config,null,async db=>(await db.query(`select c.id,c.display_name,c.body,c.status,c.created_at,
      a.slug article_slug,a.published->>'title' article_title,
      p.public_profile->>'displayName' practitioner_name
      from app.practitioner_article_comments c
      join app.practitioner_articles a on a.id=c.article_id
      join app.practitioners p on p.id=a.practitioner_id
      where c.status in('pending','approved')
      order by case when c.status='pending' then 0 else 1 end,c.created_at desc limit 150`)).rows.map(row=>({
        id:row.id,displayName:row.display_name,body:row.body,status:row.status,
        createdAt:row.created_at,articleSlug:row.article_slug,articleTitle:row.article_title,
        practitionerName:row.practitioner_name,
      })),{server:true,moderator:true})
  },
  async moderateComment(id,action){
   requireUUID(id)
   if(!['approve','hide'].includes(action))throw new AppError('INVALID_ACTION',400)
   return transaction(config,null,async db=>{
    const updated=(await db.query(`update app.practitioner_article_comments
      set status=$2,reviewed_at=now()
      where id=$1 and status in('pending','approved') returning id,status`,
      [id,action==='approve'?'approved':'hidden'])).rows[0]
    if(!updated)throw new AppError('NOT_FOUND',404)
    return {id:updated.id,status:updated.status}
   },{server:true,moderator:true})
  },
 }
}
