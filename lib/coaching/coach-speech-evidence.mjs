// Pure speech-evidence primitives. No model calls, storage or audio transport.
const localeSet=new Set(['ru','en','es'])
export function speechEvidenceLanguage(value,locale){
  const text=String(value||'').trim()
  if(!localeSet.has(locale)||!text)return 'unknown'
  const cyr=(text.match(/\p{Script=Cyrillic}/gu)||[]).length
  const lat=(text.match(/\p{Script=Latin}/gu)||[]).length
  // Mixed speech, names and acronym-only answers are not definitive mismatches.
  if(!cyr&&!lat)return 'unknown'
  if(cyr&&lat)return 'mixed'
  if(locale==='ru'&&lat){
    // A short all-lowercase foreign-script token with Polish-style orthography
    // can be a misrecognition of Russian. This is only a review signal.
    if(/^[a-z]{8,40}$/u.test(text)&&/(?:sz|cz|rz|czy)/u.test(text))return 'review'
    return lat>=20?'review':'unknown'
  }
  if(locale!=='ru'&&cyr>=20)return 'review'
  return locale==='ru'&&cyr||locale!=='ru'&&lat?'compatible':'unknown'
}
export function speechEvidenceCandidate({raw,candidate,locale,revision,currentRevision,userEdited=false}={}){
  if(userEdited||revision!==currentRevision)return {state:'stale'}
  const a=String(raw||'').trim(),b=String(candidate||'').trim()
  if(!a||!b)return {state:'uncertain'}
  const normal=s=>s.normalize('NFC').toLocaleLowerCase(localeSet.has(locale)?locale:'en').replace(/[.!?,;:]+$/u,'').replace(/\s+/gu,' ').trim()
  // Never promote disagreements (even apparently obvious replacements)
  // into a confirmed client fact. The UI can offer the acoustic candidate.
  if(normal(a)===normal(b)&&speechEvidenceLanguage(b,locale)!=='review')
    return {state:'machine_checked',text:b}
  return {state:'uncertain',candidate:b}
}
export function speechWordErrors(reference,hypothesis){
  const words=s=>String(s||'').normalize('NFC').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]
  const a=words(reference),b=words(hypothesis)
  let row=Array.from({length:b.length+1},(_,i)=>i)
  for(let i=1;i<=a.length;i++){
    const next=[i]
    for(let j=1;j<=b.length;j++)next[j]=Math.min(row[j]+1,next[j-1]+1,row[j-1]+(a[i-1]===b[j-1]?0:1))
    row=next
  }
  return {errors:row[b.length],words:a.length}
}
// Scope the initial live guard narrowly. Long foreign-language passages and
// mixed-language input may be intentional; never suppress them automatically.
export function isSuspectShortRussianSpeech(text,locale){
  return locale==='ru'&&/^[a-z]{8,40}$/u.test(String(text||'').trim())&&speechEvidenceLanguage(text,locale)==='review'
}

// Expanded checks are opt-in and are only a review signal, not language detection.
// Preserve code-switching, short ordinary words and all typed input.
export function shouldReviewSpeech(text,locale,expanded=false){
 return isSuspectShortRussianSpeech(text,locale)||(expanded===true&&speechEvidenceLanguage(text,locale)==='review')
}
export function speechReviewCandidateText(candidate,raw,locale){
 if(typeof candidate!=='string'||candidate.length>1200||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(candidate))return ''
 const value=candidate.trim()
 if(!value||speechEvidenceLanguage(value,locale)==='review')return ''
 if(shouldReviewSpeech(raw,locale,true)&&value===String(raw).trim())return ''
 return value
}

// Observational review never changes a stored turn, Director, results or memory.
export function observeSpeechCandidate(row,text){
 if(!row?.observationOnly)return {...row,candidate:speechReviewCandidateText(text,row.raw,row.locale),pending:false}
 const candidate=speechReviewCandidateText(text,row.raw,row.locale)
 if(row.edited!==null&&row.edited!==undefined)return {...row,candidate,pending:false}
 if(!candidate||speechEvidenceCandidate({raw:row.raw,candidate,locale:row.locale,revision:0,currentRevision:0}).state==='machine_checked')return null
 return {...row,candidate,pending:false}
}
export function canObserveOrdinarySpeech({enabled,source,reviewAvailable,sensitive,raw,count}={}){
 return enabled===true&&source==='speech'&&reviewAvailable===true&&sensitive===false&&typeof raw==='string'&&raw.trim().length>0&&raw.length<=1200&&Number.isInteger(count)&&count>=0&&count<30
}

// Ordinary observations stay invisible while pending. Only actionable differences
// or an explicit human edit may open the review surface.
export function visibleSpeechReview(row){
 return Boolean(row)&&(!row.observationOnly||(!row.pending&&Boolean(row.candidate||row.edited)))
}
