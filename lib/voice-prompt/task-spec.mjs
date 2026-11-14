import {ccUuid,parseGithubSource} from '../command-center/contracts.mjs';

export const VOICE_PROMPT_VERSION = 'hh-voice-prompt-v1';
export const VOICE_MAX_TRANSCRIPT = 1400;
const SOURCE_RE = /https:\/\/github\.com\/andylitvinov-design\/books\/(?:pull|issues)\/[1-9]\d{0,7}(?=$|[\s),.!;:])/g;
const SENSITIVE = /(?:\b(?:sk-[a-z0-9]{16,}|gh[pousr]_[a-z0-9]{16,}|github_pat_[a-z0-9_]{20,})\b|(?:password|passwd|пароль|api[_-]?key|секретный\s+ключ|access[_-]?token)\s*[:=]\s*\S{8,})/iu;
const LOCALES = new Set(['ru','en','es']);
const SOURCES = new Set(['browser','typed']);
const KINDS = new Set(['code_change','product_spec','repo_pr_audit','repo_issue_audit']);
const SPEC_KEYS = ['schemaVersion','locale','source','requestId','intent','recipient','proposedKind','title','objective','description','project','target','constraints','acceptance','missingRequired','requiresApproval','executionState','sourceEngine'];
const CONSTRAINTS = Object.freeze(['Use existing Holistic House infrastructure; preserve permissions, consent and privacy','Never bypass branch protection, required checks or explicit approval']);
const ACCEPTANCE = Object.freeze(['Validate the actual outcome and applicable exact-HEAD checks','Confirm protected merge, deployed SHA and functional smoke before claiming LIVE']);
const QUESTIONS = {
  ru:'Какую именно страницу, функцию или проект нужно изменить?',
  en:'Which page, feature or project should be changed?',
  es:'¿Qué página, función o proyecto hay que cambiar?'
};
const short = (text,max) => typeof text==='string' && text.trim().length<=max && text.trim().length>0 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text);
const safe = s=>String(s||'').trim().replace(/\s+/g,' ');
const keysOnly = (value,keys) => Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>keys.includes(k)));
export function validateVoiceRequest(input){
  if(!keysOnly(input,['requestId','locale','transcript','sourceEngine','consent'])) return null;
  if(!ccUuid(input.requestId)||!LOCALES.has(input.locale)||!SOURCES.has(input.sourceEngine)||input.consent!==true) return null;
  if(!short(input.transcript,VOICE_MAX_TRANSCRIPT)||safe(input.transcript).length<6||SENSITIVE.test(input.transcript))return null;
  return {requestId:input.requestId,locale:input.locale,transcript:input.transcript.trim(),sourceEngine:input.sourceEngine};
}
function sourceFromWords(text){
  const urls=[...text.matchAll(SOURCE_RE)].map(x=>x[0]);
  return urls.length===1 && parseGithubSource(urls[0]) ? urls[0] : null;
}
function classify(text,ref){
  const audit=/^(?:проверь|проверить|проверка|аудит|посмотри\s+статус|check|audit|inspect|review|status|revisar|verificar)(?=$|[\s:,.!])/iu.test(text.trim());
  const modification=/(?:исправ|додел|разработ|реализ|внедр|fix|implement|update|change|merge|deploy|arregl|corrig|implementa)/iu.test(text);
  if(ref&&audit&&!modification){return parseGithubSource(ref).kind;}
  if(/(?:составь\s+(?:тз|план)|техническое\s+задание|technical\s+spec|write\s+(?:a\s+)?spec|plan\s+implementation|especificaci[oó]n)/iu.test(text))return 'product_spec';
  return 'code_change';
}
function clarification(text){
  return /^(?:доделай(?:\s+вс[её])?|продолжи|сделай|исправь|fix\s+it|finish\s+it|continue|hazlo|contin[uú]a)[\s.!?]*$/iu.test(text);
}
function safeModelPhrase(value,request,max){
  if(!short(value,max)||SENSITIVE.test(value)||/[\r\n]/.test(value))return null;
  const candidate=value.trim();
  const urls=candidate.match(/https?:\/\/[^\s]+/g)||[];
  if(urls.some(url=>!request.includes(url)))return null;
  const issueRefs=candidate.match(/(?:#|PR\s*#?)\d{3,8}/gi)||[];
  if(issueRefs.some(ref=>!request.includes(ref.replace(/PR\s*/i,''))&&!request.includes(ref)))return null;
  return candidate;
}
export function parseOwnedSuggestion(output,transcript){
  if(typeof output!=='string'||output.length>1800)return null;
  let value;try{value=JSON.parse(output.trim());}catch{return null;}
  if(!keysOnly(value,['title','objective'])||Object.keys(value).length!==2)return null;
  const title=safeModelPhrase(value.title,transcript,120),objective=safeModelPhrase(value.objective,transcript,280);
  return title&&title.length>=6&&objective&&objective.length>=8?{title,objective}:null;
}
export function compileVoiceTask(input,suggestion=null){
  const request=validateVoiceRequest({...input,consent:true});
  if(!request)return null;
  const {locale,requestId,transcript,sourceEngine}=request;
  const firstLine=safe(transcript).slice(0,120).trim();
  const title=suggestion?.title||firstLine;
  const objective=suggestion?.objective||safe(transcript).slice(0,280);
  const verifiedTitle=safeModelPhrase(title,transcript,140);
  const verifiedObjective=safeModelPhrase(objective,transcript,280);
  if(!verifiedTitle||!verifiedObjective)return null;
  const sourceRef=sourceFromWords(transcript);
  const kind=classify(transcript,sourceRef);
  const description=[`Original ${locale.toUpperCase()} request (${sourceEngine}):`,transcript,`Proposed objective (review): ${verifiedObjective}`,
    'Constraints: preserve existing auth, consent, privacy and approved costs.',
    'Completion: verify applicable exact-HEAD tests and real outcome. MERGED is not LIVE.'].join('\n\n');
  if(description.length>2000)return null; // Never silently crop the spoken request.
  const spec={schemaVersion:1,locale,source:'voice',requestId,intent:'create_task',recipient:'command_center',
    proposedKind:kind,title:verifiedTitle,objective:verifiedObjective,description,project:'Holistic House',
    target:{repo:'andylitvinov-design/books',sourceRef},constraints:[...CONSTRAINTS],acceptance:[...ACCEPTANCE],
    missingRequired:clarification(transcript)?[QUESTIONS[locale]]:[],requiresApproval:true,executionState:'draft',sourceEngine};
  return validateVoiceTaskSpec(spec,transcript)?spec:null;
}
export function validateVoiceTaskSpec(spec,transcript){
  if(!keysOnly(spec,SPEC_KEYS)||Object.keys(spec).length!==SPEC_KEYS.length)return false;
  if(spec.schemaVersion!==1||spec.source!=='voice'||spec.intent!=='create_task'||spec.recipient!=='command_center'||
    spec.project!=='Holistic House'||spec.requiresApproval!==true||spec.executionState!=='draft')return false;
  if(!ccUuid(spec.requestId)||!LOCALES.has(spec.locale)||!SOURCES.has(spec.sourceEngine)||!KINDS.has(spec.proposedKind))return false;
  if(!short(spec.title,140)||spec.title.length<6||!short(spec.objective,280)||!short(spec.description,2000)||SENSITIVE.test(spec.description))return false;
  if(typeof transcript!=='string'||!spec.description.includes(transcript.trim()))return false;
  if(!keysOnly(spec.target,['repo','sourceRef'])||Object.keys(spec.target).length!==2||spec.target.repo!=='andylitvinov-design/books')return false;
  if(spec.target.sourceRef!==null&&(!parseGithubSource(spec.target.sourceRef)||!transcript.includes(spec.target.sourceRef)))return false;
  if(spec.proposedKind.startsWith('repo_')&&parseGithubSource(spec.target.sourceRef)?.kind!==spec.proposedKind)return false;
  if(JSON.stringify(spec.constraints)!==JSON.stringify(CONSTRAINTS)||JSON.stringify(spec.acceptance)!==JSON.stringify(ACCEPTANCE))return false;
  if(!Array.isArray(spec.missingRequired)||spec.missingRequired.length>1||spec.missingRequired.some(x=>typeof x!=='string'||x.length>120))return false;
  return true;
}
