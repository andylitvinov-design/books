// Navigation only: never store auth tokens, account IDs, client text or consent.
export const PAGE_AUTH_KEY='hh-google-page-action-v1'
export const PAGE_AUTH_MARKER='hh_resume'
const TTL=15*60*1000
const CONTINUATIONS=new Set(['my-coach-action','energywork-daybook','clarity-daybook','goal-daybook','business-daybook'])
const SOURCE=/^\/(en|ru|es)(?:\/(?:my-coach(?:\/programs(?:\/[a-z-]+)?)?|coaching(?:\/sessions)?|academy(?:\/principles-of-energywork(?:\/(?:daybook|learn))?)?|app(?:\/(?:portrait|profile|daybook|courses|my-courses|clarity|progress|coaching|course))?|holistic-support(?:\/mobile)?|practice|development-vectors))?\/?$/
const PUBLIC_QUERY=new Set(['coach','method','warmth','directness','pace','depth','goalCourse','program','week','tab','coachId','start','clarityDay','greetingProgram'])
const ORIGIN='https://holistichouse.vercel.app'
const validPublicQuery=(key,value)=>PUBLIC_QUERY.has(key)&&/^[-_a-zA-Z0-9]{1,80}$/.test(value)&&(key!=='clarityDay'||/^[123]$/.test(value))&&(key!=='greetingProgram'||['clarity','business','love','health'].includes(value))
export function isPageAuthContinuation(value){return CONTINUATIONS.has(value)}
export function safePageAuthReturnPath(value,continuation,locale){
 if(!isPageAuthContinuation(continuation)||typeof value!=='string'||value.length>600||!value.startsWith('/')||value.startsWith('//')||/[%\\\u0000-\u0020#]/.test(value))return false
 let url
 try{url=new URL(value,ORIGIN)}catch{return false}
 const match=url.pathname.match(SOURCE)
 if(url.origin!==ORIGIN||!match||url.pathname!==value.split('?')[0])return false
 if(match[1]!==locale&&!(continuation==='energywork-daybook'&&locale==='en'&&match[1]==='es'))return false
 for(const [key,val] of url.searchParams){
  if(!validPublicQuery(key,val)||url.searchParams.getAll(key).length!==1)return false
 }
 return true
}
export function pageAuthReturnPath(href,continuation,locale){
 const url=new URL(href,ORIGIN),query=new URLSearchParams()
 for(const [key,value] of url.searchParams)if(validPublicQuery(key,value)&&url.searchParams.getAll(key).length===1)query.set(key,value)
 const path=url.pathname+(query.toString()?'?'+query.toString():'')
 return safePageAuthReturnPath(path,continuation,locale)?path:null
}
export function pageAuthSuccessPath(path,continuation,locale){
 if(!safePageAuthReturnPath(path,continuation,locale))return null
 const url=new URL(path,ORIGIN)
 url.searchParams.set(PAGE_AUTH_MARKER,continuation)
 return url.pathname+url.search
}
function validAction(kind,action,locale){
 if(!action||typeof action!=='object'||Array.isArray(action))return false
 if(kind==='reiki')return Object.keys(action).length===0
 if(kind==='coach-link')return Object.keys(action).length===1&&typeof action.href==='string'&&/^\/(?:en|ru|es)\/coaching\/sessions\?coach=/.test(action.href)&&safePageAuthReturnPath(action.href,'my-coach-action',locale)
 if(kind==='coach-topic')return Object.keys(action).length===1&&typeof action.id==='string'&&/^[a-z0-9_-]{1,100}$/.test(action.id)
 if(kind==='program')return Object.keys(action).length===1&&(action.coachId===null||typeof action.coachId==='string'&&/^[a-z0-9-]{1,40}$/.test(action.coachId))
 return false
}
export function rememberPageAuthAction({continuation,locale,kind,action},browser=window,now=Date.now()){
 const path=pageAuthReturnPath(browser.location.href,continuation,locale)
 if(!path||!validAction(kind,action,locale))throw Error('INVALID_PAGE_AUTH_ACTION')
 const hash=/^#[a-zA-Z0-9_-]{1,80}$/.test(browser.location.hash)?browser.location.hash:''
 browser.sessionStorage.setItem(PAGE_AUTH_KEY,JSON.stringify({continuation,locale,kind,action,path,hash,expires:now+TTL}))
 return path
}
export function takePageAuthAction({continuation,locale,kind},browser=window,now=Date.now()){
 const url=new URL(browser.location.href)
 const resumed=url.searchParams.getAll(PAGE_AUTH_MARKER).length===1&&url.searchParams.get(PAGE_AUTH_MARKER)===continuation
 const failed=['cancelled','failed'].includes(url.searchParams.get('auth'))
 if(!resumed&&!failed)return null
 let record
 try{record=JSON.parse(browser.sessionStorage.getItem(PAGE_AUTH_KEY)||'null')}catch{return null}
 if(record?.kind!==kind||record.continuation!==continuation||record.locale!==locale)return null
 const path=pageAuthReturnPath(url.href,continuation,locale)
 if(record.path!==path)return null
 // Claim before async work: multiple CTAs and StrictMode cannot replay the action.
 try{browser.sessionStorage.removeItem(PAGE_AUTH_KEY)}catch{return null}
 url.searchParams.delete(PAGE_AUTH_MARKER)
 url.searchParams.delete('auth')
 if(/^#[a-zA-Z0-9_-]{1,80}$/.test(record.hash||''))url.hash=record.hash
 browser.history.replaceState(browser.history.state,'',url.pathname+url.search+url.hash)
 if(!resumed||failed||!Number.isFinite(record.expires)||record.expires<=now||record.expires>now+TTL||!validAction(kind,record.action,locale))return null
 return record.action
}
