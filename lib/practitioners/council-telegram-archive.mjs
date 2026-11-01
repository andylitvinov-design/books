// Public-only GitHub Issue #242 archive reader. No GitHub access token required.
const API='https://api.github.com/repos/andylitvinov-design/ai-projects-brain/issues/242/comments?per_page=100'
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
// The EXISTING 12:00 Toronto ChatGPT task publishes a public-only owner
// report here. This distinct marker and author check prevent arbitrary Issue
// comments (including external instructions) from being sent to Telegram.
const CHATGPT_MARKER=/^<!-- HH-CHATGPT-DAILY:(\d{4}-\d{2}-\d{2}) -->\s*/
const CHATGPT_END='<!-- HH-CHATGPT-END -->'
const OWNER='andylitvinov-design'
export function pickPublicChatgptReports(comments,{today,earliest}){
  const reports=[]
  for(const comment of Array.isArray(comments)?comments:[]){
    if(comment?.user?.login!==OWNER||
      !SAFE_URL.test(String(comment.html_url||'')))continue
    const body=String(comment.body||'')
    const hit=body.match(CHATGPT_MARKER)
    if(!hit)continue
    const date=hit[1]
    if(date<earliest||date>today||!/^\d{4}-\d{2}-\d{2}$/.test(date))continue
    const endAt=body.indexOf(CHATGPT_END)
    if(endAt<0||endAt!==body.lastIndexOf(CHATGPT_END))continue
    if(body.slice(endAt+CHATGPT_END.length).trim())continue
    const markdown=body.slice(hit[0].length,endAt).trim()
    if(markdown.length<350||markdown.length>30000||
      !markdown.startsWith('# Holistic House | ежедневный аудит | '+date)||
      !markdown.includes('https://holistichouse.vercel.app')||
      !markdown.includes('## Что проверено')||
      !markdown.includes('## Приоритеты')||
      !markdown.includes('## Ограничения'))continue
    if(!Number.isSafeInteger(comment.id)||comment.id<=0)continue
    reports.push({date,id:comment.id,markdown,url:comment.html_url})
  }
  // The same owner may accidentally publish twice. Prefer the oldest
  // verified daily comment, never send two reports for the same date.
  const unique=new Map()
  for(const item of reports.sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id))
    if(!unique.has(item.date))unique.set(item.date,item)
  return [...unique.values()].slice(-3)
}

// Separate 14:00 owner market brief. Public, signed, dated comments only.
const MARKET_MARKER=/^<!-- HH-MARKET-INTEL:(\d{4}-\d{2}-\d{2}) -->\s*/
const MARKET_END='<!-- HH-MARKET-INTEL-END -->'
const MARKET_SECTIONS=[
  '## Рынок и тренды','## Конкуренты','## Пять приоритетов',
  '## ТЗ для Codex','## Источники','## Обновление стратегии','## Ограничения'
]
export function pickPublicMarketIntelligenceReports(comments,{today,earliest}){
  const result=[]
  for(const comment of Array.isArray(comments)?comments:[]){
    if(comment?.user?.login!==OWNER||
      !SAFE_URL.test(String(comment.html_url||''))||
      !Number.isSafeInteger(comment.id)||comment.id<=0)continue
    const body=String(comment.body||'')
    const hit=body.match(MARKET_MARKER)
    if(!hit)continue
    const date=hit[1]
    if(date<earliest||date>today)continue
    const endAt=body.indexOf(MARKET_END)
    if(endAt<0||endAt!==body.lastIndexOf(MARKET_END)||
      body.slice(endAt+MARKET_END.length).trim())continue
    const markdown=body.slice(hit[0].length,endAt).trim()
    if(markdown.length<1200||markdown.length>25000||
      !markdown.startsWith('# Holistic House | Market Intelligence | '+date)||
      !markdown.includes('Сайт: https://holistichouse.vercel.app')||
      MARKET_SECTIONS.some(section=>!markdown.includes(section)))continue
    const priorities=markdown.split('## Пять приоритетов')[1]?.split('## ТЗ для Codex')[0]||''
    const ranks=[...priorities.matchAll(/^\s*(?:\*\*)?([1-5])[.)]/gm)].map(m=>m[1])
    if(ranks.join(',')!=='1,2,3,4,5')continue
    result.push({date,id:comment.id,markdown,url:comment.html_url})
  }
  const unique=new Map()
  for(const item of result.sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id))
    if(!unique.has(item.date))unique.set(item.date,item)
  return [...unique.values()].slice(-3)
}

export async function fetchPublicDailyArchives({today,earliest},fetcher=fetch){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(today)||!/^\d{4}-\d{2}-\d{2}$/.test(earliest))
    throw Error('INVALID_COUNCIL_DATE')
  // GitHub's comments endpoint is chronologically paginated; its old
  // sort/direction query was ignored. Filter to our bounded Toronto period
  // so newer daily archives remain visible as the issue accumulates comments.
  const url=new URL(API)
  url.searchParams.set('since',earliest+'T00:00:00Z')
  const response=await fetcher(url.href,{
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
  return {
    council:pickPublicCouncilReports(comments,{today,earliest}),
    chatgpt:pickPublicChatgptReports(comments,{today,earliest}),
    market:pickPublicMarketIntelligenceReports(comments,{today,earliest})
  }
}
// Preserve the existing public-only API for current readers/tests.
export async function fetchPublicCouncilReports(period,fetcher=fetch){
  return (await fetchPublicDailyArchives(period,fetcher)).council
}

// Dedicated public-safe owner revenue archive; never reads private CRM,
// diagnostics, billing, or Telegram subscriber details from GitHub.
const REVENUE_MARKER=/^<!-- HH-REVENUE-DAILY:(\d{4}-\d{2}-\d{2}) -->\s*/
const REVENUE_END='<!-- HH-REVENUE-END -->'
export function pickPublicRevenueReports(comments,{today,earliest}){
  const result=[]
  for(const comment of Array.isArray(comments)?comments:[]){
    if(comment?.user?.login!==OWNER||
      !SAFE_URL.test(String(comment.html_url||'')))continue
    const body=String(comment.body||'')
    const hit=body.match(REVENUE_MARKER)
    if(!hit)continue
    const date=hit[1]
    if(date<earliest||date>today)continue
    const endAt=body.indexOf(REVENUE_END)
    if(endAt<0||endAt!==body.lastIndexOf(REVENUE_END)||
      body.slice(endAt+REVENUE_END.length).trim())continue
    const markdown=body.slice(hit[0].length,endAt).trim()
    if(markdown.length<500||markdown.length>17000||
      !markdown.startsWith('# Holistic House | 5 идей для роста выручки | '+date)||
      !markdown.includes('## Идеи')||
      !markdown.includes('## Источники')||
      !markdown.includes('## Ограничения')||
      !Number.isSafeInteger(comment.id)||comment.id<=0)continue
    result.push({date,id:comment.id,markdown,url:comment.html_url})
  }
  const unique=new Map()
  for(const entry of result.sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id))
    if(!unique.has(entry.date))unique.set(entry.date,entry)
  return [...unique.values()].slice(-3)
}
export async function fetchPublicRevenueReports({today,earliest},fetcher=fetch){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(today)||!/^\d{4}-\d{2}-\d{2}$/.test(earliest))
    throw Error('INVALID_REVENUE_DATE')
  const url=new URL(API)
  url.searchParams.set('since',earliest+'T00:00:00Z')
  const response=await fetcher(url.href,{
    method:'GET',redirect:'error',cache:'no-store',
    headers:{Accept:'application/vnd.github+json','user-agent':'HolisticHouseRevenueBrief/1.0'},
    signal:AbortSignal.timeout(13000)
  })
  if(!response.ok)throw Error('PUBLIC_REVENUE_ARCHIVE_HTTP_'+response.status)
  const length=Number(response.headers.get('content-length')||0)
  if(length>2500000)throw Error('PUBLIC_ARCHIVE_TOO_LARGE')
  const body=await response.text()
  if(body.length>2500000)throw Error('PUBLIC_ARCHIVE_TOO_LARGE')
  let comments
  try{comments=JSON.parse(body)}catch{throw Error('PUBLIC_REVENUE_ARCHIVE_INVALID')}
  if(!Array.isArray(comments))throw Error('PUBLIC_REVENUE_ARCHIVE_INVALID')
  return pickPublicRevenueReports(comments,{today,earliest})
}

// Dedicated owner-only market archive; shares the existing bounded Issue fetcher.
export async function fetchPublicMarketIntelligenceReports(period,fetcher=fetch){
  return (await fetchPublicDailyArchives(period,fetcher)).market
}
