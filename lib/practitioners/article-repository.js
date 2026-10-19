import 'server-only'
import {randomUUID} from 'node:crypto'
import {AppError,requireUUID,revision} from '../assessments/contracts.js'
import {transaction} from '../app/database.js'
import {slugify} from './contracts.js'
import {validateArticleDraft} from './article-contracts.js'

const notFound=()=>{throw new AppError('NOT_FOUND',404)}
function view(row){
 const p=row.published||{}
 return {id:row.id,slug:row.slug,status:row.status,revision:row.revision,folderId:row.folder_id||null,reviewNote:row.review_note||'',
   draft:row.draft||{},published:p,practitionerId:row.practitioner_id,
   practitionerSlug:row.practitioner_slug||'',practitionerName:row.public_profile?.displayName||'',
   submittedAt:row.submitted_at,reviewedAt:row.reviewed_at,publishedAt:row.published_at,updatedAt:row.updated_at}
}
async function own(db,actor){
 const account=(await db.query("select status,onboarding_state from app.accounts where id=$1",[actor.id])).rows[0]
 if(account?.status!=='active'||account?.onboarding_state!=='active')throw new AppError('ACCOUNT_REQUIRED',401)
 const p=(await db.query('select * from app.practitioners where trusted_auth_user_id=$1',[actor.id])).rows[0]
 if(!p)throw new AppError('PRACTITIONER_REQUIRED',409)
 return p
}
async function ownedFolder(db,practitionerId,folderId){
 if(!folderId)return null
 requireUUID(folderId)
 const folder=(await db.query('select id from app.practitioner_article_folders where id=$1 and practitioner_id=$2',[folderId,practitionerId])).rows[0]
 if(!folder)throw new AppError('FOLDER_NOT_FOUND',404)
 return folder.id
}
function folderView(row){return {id:row.id,name:row.name,slug:row.slug,revision:row.revision,updatedAt:row.updated_at}}
function folderName(input){
 const name=String(input?.name||'').trim()
 if(!name||name.length>80||/[\u0000-\u001f]/.test(name))throw new AppError('INVALID_FOLDER_NAME',400)
 return name
}
const publicSql="a.published<>'{}'::jsonb and a.status in('published','submitted','changes_requested') and p.active and p.public_profile<>'{}'::jsonb and p.status in('approved','submitted','changes_requested')"
export function createArticleRepository(config){
 return {
  async folders(actor){
   return transaction(config,actor,async db=>{
    const p=await own(db,actor)
    return (await db.query('select * from app.practitioner_article_folders where practitioner_id=$1 order by lower(name), created_at',[p.id])).rows.map(folderView)
   })
  },
  async createFolder(actor,input){
   const name=folderName(input)
   return transaction(config,actor,async db=>{
    const p=await own(db,actor)
    const slug='folder-'+randomUUID().replace(/-/g,'').slice(0,16)
    const row=(await db.query('insert into app.practitioner_article_folders(practitioner_id,name,slug) values($1,$2,$3) returning *',[p.id,name,slug])).rows[0]
    return folderView(row)
   })
  },
  async renameFolder(actor,id,input){
   requireUUID(id);revision(input.expectedRevision)
   const name=folderName(input)
   return transaction(config,actor,async db=>{
    const p=await own(db,actor)
    const row=(await db.query('update app.practitioner_article_folders set name=$3,revision=revision+1,updated_at=now() where id=$1 and practitioner_id=$2 and revision=$4 returning *',[id,p.id,name,input.expectedRevision])).rows[0]
    if(!row)throw new AppError('REVISION_CONFLICT',409)
    return folderView(row)
   })
  },
  async removeFolder(actor,id){
   requireUUID(id)
   return transaction(config,actor,async db=>{
    const p=await own(db,actor)
    const deleted=(await db.query('delete from app.practitioner_article_folders where id=$1 and practitioner_id=$2 returning id',[id,p.id])).rows[0]
    if(!deleted)notFound()
    return {deleted:true,id:deleted.id}
   })
  },
  async mine(actor){
   return transaction(config,actor,async db=>{
    const p=await own(db,actor)
    return (await db.query('select * from app.practitioner_articles where practitioner_id=$1 order by updated_at desc limit 500',[p.id])).rows.map(view)
   })
  },
  async save(actor,id,input){
   if(id)requireUUID(id)
   const draft=validateArticleDraft(input.draft||{})
   return transaction(config,actor,async db=>{
    const p=await own(db,actor)
    const requestedFolder=input.folderId===undefined?undefined:await ownedFolder(db,p.id,input.folderId)
    if(id){
     revision(input.expectedRevision)
     const old=(await db.query('select * from app.practitioner_articles where id=$1 and practitioner_id=$2 for update',[id,p.id])).rows[0]
     if(!old)notFound()
     if(old.revision!==input.expectedRevision)throw new AppError('REVISION_CONFLICT',409)
     if(['archived','suspended'].includes(old.status))throw new AppError('ARTICLE_UNAVAILABLE',409)
     const status=old.published&&Object.keys(old.published).length?'published':'draft'
     return view((await db.query("update app.practitioner_articles set draft=$3,status=$4,folder_id=$5,review_note=null,revision=revision+1,updated_at=now() where id=$1 and practitioner_id=$2 returning *",
      [id,p.id,draft,status,requestedFolder===undefined?old.folder_id:requestedFolder])).rows[0])
    }
    const articleId=randomUUID(),slug=slugify(draft.title,'article')+'-'+articleId.slice(0,8)
    return view((await db.query("insert into app.practitioner_articles(id,practitioner_id,slug,draft,folder_id) values($1,$2,$3,$4,$5) returning *",
      [articleId,p.id,slug,draft,requestedFolder||null])).rows[0])
   })
  },
  async submit(actor,id,input){
   requireUUID(id);revision(input.expectedRevision)
   return transaction(config,actor,async db=>{
    const p=await own(db,actor)
    if(p.status!=='approved')throw new AppError('PRACTITIONER_REVIEW_REQUIRED',409)
    const old=(await db.query('select * from app.practitioner_articles where id=$1 and practitioner_id=$2 for update',[id,p.id])).rows[0]
    if(!old)notFound()
    if(old.revision!==input.expectedRevision)throw new AppError('REVISION_CONFLICT',409)
    if(['suspended','archived'].includes(old.status))throw new AppError('ARTICLE_UNAVAILABLE',409)
    validateArticleDraft(old.draft||{},{complete:true})
    return view((await db.query("update app.practitioner_articles set status='submitted',submitted_at=now(),review_note=null,revision=revision+1,updated_at=now() where id=$1 returning *",[id])).rows[0])
   })
  },
  async archive(actor,id,input){
   requireUUID(id);revision(input.expectedRevision)
   return transaction(config,actor,async db=>{
    const p=await own(db,actor)
    const row=(await db.query("update app.practitioner_articles set status='archived',revision=revision+1,updated_at=now() where id=$1 and practitioner_id=$2 and revision=$3 returning *",
      [id,p.id,input.expectedRevision])).rows[0]
    if(!row)throw new AppError('REVISION_CONFLICT',409)
    return view(row)
   })
  },
  async publicList(locale='en',practitionerSlug=''){
   if(!['en','ru','es'].includes(locale))return []
   return transaction(config,null,async db=>(await db.query("select a.*,p.slug practitioner_slug,p.public_profile from app.practitioner_articles a join app.practitioners p on p.id=a.practitioner_id where "+publicSql+" and a.published->>'locale'=$1 and ($2::text = '' or p.slug=$2) order by a.published_at desc nulls last,a.id limit 100",[locale,practitionerSlug])).rows.map(view),{server:true})
  },
  // The author's own public profile shows every published language edition.
  // Only approved article snapshots are queried; draft text is never exposed.
  async publicByPractitioner(practitionerSlug){
   if(!/^[a-z0-9-]{1,100}$/.test(practitionerSlug))return []
   return transaction(config,null,async db=>(await db.query("select a.*,p.slug practitioner_slug,p.public_profile from app.practitioner_articles a join app.practitioners p on p.id=a.practitioner_id where "+publicSql+" and p.slug=$1 and a.published->>'locale' in ('en','ru','es') order by a.published_at desc nulls last,a.id limit 100",[practitionerSlug])).rows.map(view),{server:true})
  },
  async publicArticle(locale,slug){
   if(!['en','ru','es'].includes(locale)||!/^[a-z0-9-]{1,100}$/.test(slug))notFound()
   return transaction(config,null,async db=>{
    const row=(await db.query("select a.*,p.slug practitioner_slug,p.public_profile from app.practitioner_articles a join app.practitioners p on p.id=a.practitioner_id where "+publicSql+" and a.slug=$1 and a.published->>'locale'=$2 limit 1",[slug,locale])).rows[0]
    if(!row)notFound()
    const allowed=row.published.linkedServiceIds||[]
    const services=allowed.length?(await db.query("select id,slug,localized_copy,pricing_mode,confirmed_price,currency from app.service_offerings where practitioner_id=$1 and id=any($2::uuid[]) and active and localized_copy<>'{}'::jsonb and status in('published','submitted','changes_requested')",[row.practitioner_id,allowed])).rows.map(x=>({id:x.id,slug:x.slug,title:x.localized_copy?.[locale]?.title||x.localized_copy?.en?.title||'',pricingMode:x.pricing_mode,price:x.confirmed_price==null?null:Number(x.confirmed_price),currency:x.currency})): []
    return {...view(row),services}
   },{server:true})
  },
  async moderationList(){
   return transaction(config,null,async db=>(await db.query("select a.*,p.slug practitioner_slug,p.public_profile from app.practitioner_articles a join app.practitioners p on p.id=a.practitioner_id where a.status in('submitted','changes_requested','published') order by a.updated_at desc limit 150")).rows.map(view),{server:true,moderator:true})
  },
  async moderate(id,input){
   requireUUID(id)
   if(!['approve','changes_requested','suspend','archive'].includes(input.action))throw new AppError('INVALID_ACTION',400)
   return transaction(config,null,async db=>{
    const row=(await db.query('select * from app.practitioner_articles where id=$1 for update',[id])).rows[0]
    if(!row)notFound()
    let result
    if(input.action==='approve'){
     const data=validateArticleDraft(row.draft||{},{complete:true})
     const p=(await db.query('select status,active from app.practitioners where id=$1',[row.practitioner_id])).rows[0]
     if(!p?.active||p.status!=='approved')throw new AppError('PRACTITIONER_REVIEW_REQUIRED',409)
     if(data.linkedServiceIds.length){
      const count=(await db.query("select count(*)::int count from app.service_offerings where practitioner_id=$1 and id=any($2::uuid[]) and active and localized_copy<>'{}'::jsonb and status in('published','submitted','changes_requested')",[row.practitioner_id,data.linkedServiceIds])).rows[0].count
      if(count!==data.linkedServiceIds.length)throw new AppError('INVALID_SERVICE',400)
     }
     result=(await db.query("update app.practitioner_articles set published=$2,status='published',review_note=null,reviewed_at=now(),published_at=now(),revision=revision+1,updated_at=now() where id=$1 returning *",[id,data])).rows[0]
    } else {
     const status=input.action==='suspend'?'suspended':input.action==='archive'?'archived':'changes_requested'
     result=(await db.query("update app.practitioner_articles set status=$2,review_note=$3,reviewed_at=now(),revision=revision+1,updated_at=now() where id=$1 returning *",[id,status,String(input.note||'').slice(0,800)])).rows[0]
    }
    return view(result)
   },{server:true,moderator:true})
  }
 }
}
