// Public-only GitHub Issue #242 archive reader. No GitHub access token required.
const API='https://api.github.com/repos/andylitvinov-design/ai-projects-brain/issues/242/comments?per_page=30&sort=created&direction=desc'
const MARKER=/^<!-- HH-COUNCIL-DAILY:(\d{4}-\d{2}-\d{2}) -->\s*/
const SAFE_URL=/^https:\/\/github\.com\/andylitvinov-design\/ai-projects-brain\/issues\/242#issuecomment-\d+$/
// The Actions appendix is untrusted public JSON. Only fully valid and correctly
// date-matched data is reused; older truncated JSON falls back to archive text.
export function readCouncilEvidence(body,date){
  const tail=String(body||'').split('<!-- HH-COUNCIL-EVIDENCE -->')[1]
  if(!tail||tail.length>43000)return null
  const json=tail.match(/\x60\x60\x60json\s*\n([\s\S]*?)\n\x60\x60\x60/i)?.[1]
  if(!json||json.length>36000)return null
  try{
    const evidence=JSON.parse(json)
    if(evidence?.source!=='https://holistichouse.vercel.app'||
      evidence?.date_toronto!==date||!Array.isArray(evidence.pages)||
      evidence.pages.length>24)return null
    return evidence
  }catch{return null}
}
export function pickPublicCouncilReports(comments,{today,earliest}){
  const result=[]
  for(const comment of Array.isArray(comments)?comments:[]){
    if(comment?.user?.login!=='github-actions[bot]')continue
    const body=comment.body||'',hit=body.match(MARKER)
    if(!hit||!SAFE_URL.test(String(comment.html_url||'')))continue
    const day=hit[1]
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||day<earliest||day>today)continue
    if(body.includes('<!-- HH-TELEGRAM-SENT:'+day+' -->'))continue
    const content=body.slice(hit[0].length)
      .split('<!-- HH-COUNCIL-EVIDENCE -->')[0].trim()
    if(content.length<200||content.length>80000)continue
    if(!content.startsWith('# Holistic House')||
      !content.includes('## Статус рецензентов')||
      !content.includes('## Приоритизированное ТЗ'))continue
    result.push({date:day,id:comment.id,markdown:content,url:comment.html_url,
      evidence:readCouncilEvidence(body,day)})
  }
  const unique=new Map()
  for(const item of result.sort((a,b)=>a.date.localeCompare(b.date)))
    if(!unique.has(item.date))unique.set(item.date,item)
  return [...unique.values()].slice(-3)
}
export async function fetchPublicCouncilReports({today,earliest},fetcher=fetch){
  const response=await fetcher(API,{
    method:'GET',redirect:'error',cache:'no-store',
    headers:{Accept:'application/vnd.github+json','user-agent':'HolisticHouseCouncilDigest/1.0'},
    signal:AbortSignal.timeout(13000)
  })
  if(!response.ok)throw Error('PUBLIC_COUNCIL_ARCHIVE_HTTP_'+response.status)
  const len=Number(response.headers.get('content-length')||0)
  if(len>2500000)throw Error('PUBLIC_ARCHIVE_TOO_LARGE')
  const body=await response.text()
  if(body.length>2500000)throw Error('PUBLIC_ARCHIVE_TOO_LARGE')
  let comments
  try{comments=JSON.parse(body)}catch{throw Error('PUBLIC_COUNCIL_ARCHIVE_INVALID')}
  if(!Array.isArray(comments))throw Error('PUBLIC_COUNCIL_ARCHIVE_INVALID')
  return pickPublicCouncilReports(comments,{today,earliest})
}
