import { AppError, assertObject, onlyKeys, requireUUID, text } from '../assessments/contracts.js'

// Text-only source, rendered without dangerous HTML. No automatic medical claims or AI publishing.
export function validateArticleDraft(input,{complete=false}={}){
  assertObject(input)
  onlyKeys(input,['locale','title','excerpt','body','coverPath','sourceUrls','linkedServiceIds','tags'])
  const locale=text(input.locale||'en',2)
  if(!['en','ru','es'].includes(locale))throw new AppError('INVALID_LOCALE',400)
  const title=text(input.title||'',160),excerpt=text(input.excerpt||'',500)
  const body=text(input.body||'',16000)
  const coverPath=text(input.coverPath||'',300)
  if(coverPath&&!(/^\/images\/[a-zA-Z0-9/_-]+\.(png|jpg|jpeg|webp)$/.test(coverPath)||/^\/media\/remedies\/[a-z0-9-]+\/[a-zA-Z0-9-]+\.(png|jpg|jpeg|webp)$/.test(coverPath)))throw new AppError('INVALID_IMAGE',400)
  const sourceUrls=Array.isArray(input.sourceUrls)?input.sourceUrls:[]
  if(sourceUrls.length>8)throw new AppError('INVALID_LIST',400)
  const sources=sourceUrls.map(item=>{
    const s=text(item,500);let u
    try{u=new URL(s)}catch{throw new AppError('INVALID_URL',400)}
    if(u.protocol!=='https:')throw new AppError('INVALID_URL',400)
    return u.toString()
  })
  const sourceTags=input.tags===undefined?[]:input.tags
  if(!Array.isArray(sourceTags)||sourceTags.length>12)throw new AppError('INVALID_LIST',400)
  const tags=[]
  const normalizedTags=new Set()
  for(const value of sourceTags){
    const tag=text(value,80)
    if(/[\r\n]/.test(tag))throw new AppError('INVALID_TAG',400)
    const key=tag.toLocaleLowerCase()
    if(tag&&!normalizedTags.has(key)){tags.push(tag);normalizedTags.add(key)}
  }
  const ids=Array.isArray(input.linkedServiceIds)?input.linkedServiceIds:[]
  if(ids.length>2)throw new AppError('INVALID_LIST',400)
  for(const id of ids)requireUUID(id)
  if(complete&&(!title||excerpt.length<30||body.length<200))throw new AppError('INCOMPLETE_ARTICLE',400)
  return {locale,title,excerpt,body,coverPath,sourceUrls:sources,linkedServiceIds:[...new Set(ids)],tags}
}
