// Metadata-only editorial TRIAGE of HH-owned author questions.
// Heuristic flags are prompts for a human reviewer, never a psychometric
// validity judgment, diagnosis, clinical score or auto-published revision.
// This module imports no database, users, private reports or external services.
const LANGUAGES = Object.freeze(['en','ru'])
const doubleConstruct = {
  en: /\b(?:and|or)\b/i,
  ru: /(?:^|[\s,])(?:и|или|либо)(?=[\s,.!?]|$)/iu,
}
const suspiciousRecall = {
  en: /\b(?:today|right now|currently|at this moment|yesterday)\b/i,
  ru: /(?:сегодня|сейчас|прямо сейчас|вчера)/iu,
}
const explicitApplicability = q => Boolean(
  q?.allowNotApplicable === true || q?.notApplicable === true ||
  (Array.isArray(q?.options) && q.options.some(option=>
    /(?:not.?applicable|не применимо|не было такой ситуации)/i.test(
      typeof option === 'string' ? option : String(option?.label ?? ''))))
)

const sensitiveKey = key => /(?:felt-safety|body-mind-context|intimacy|sexual|consent)/.test(key)

export function auditAuthorItemContent(definitions = [], catalog = []) {
  const active = (Array.isArray(catalog) ? catalog : [])
    .filter(entry => entry?.startable === true && typeof entry.key === 'string' &&
      entry.key.startsWith('hh-'))
    .sort((a,b) => a.key.localeCompare(b.key))
  const versions = new Map((Array.isArray(definitions) ? definitions : [])
    .filter(definition => definition?.key?.startsWith('hh-'))
    .map(definition => [[definition.key,definition.version,definition.instrumentLocale].join('@'),definition]))
  const missingVersions=[]
  const rows=[]
  for(const entry of active){
    for(const locale of LANGUAGES){
      const definition=versions.get([entry.key,entry.version,locale].join('@'))
      if(!definition){
        missingVersions.push([entry.key,entry.version,locale].join('@'))
        continue
      }
      const scales=Array.isArray(definition.scoring?.dimensions)
        ?definition.scoring.dimensions:[]
      for(const [index,question] of (definition.questions||[]).entries()){
        const statement=typeof question?.text === 'string' ?question.text.trim():''
        const links=scales.filter(scale=>Array.isArray(scale.items) &&
          scale.items.includes(question?.id)).map(scale=>scale.key)
        const min=question?.min??definition.answerScale?.min??null
        const max=question?.max??definition.answerScale?.max??null
        const anchors=question?.anchors||question?.responseAnchors||
          definition.responseAnchors||null
        const applicability=explicitApplicability(question)
        const flags=[]
        if(!statement)flags.push('missing_item_text')
        if(statement && doubleConstruct[locale].test(statement))
          flags.push('double_construct_candidate')
        if(definition.timeframe==='past-7-days' && statement &&
            suspiciousRecall[locale].test(statement))
          flags.push('recall_period_conflict_candidate')
        if(!Number.isInteger(min)||!Number.isInteger(max)||min>=max)
          flags.push('response_bounds_review')
        if(!Array.isArray(anchors)||anchors.length<2)
          flags.push('response_anchors_review')
        if(question?.required!==false && sensitiveKey(entry.key) &&
            !applicability)flags.push('applicability_option_review')
        if(definition.scoringKey==='configured' && links.length===0)
          flags.push('source_dimension_mapping_review')
        rows.push(Object.freeze({
          key:entry.key,version:definition.version,locale,
          itemId:String(question?.id||''),itemOrder:index+1,
          text:statement,timeframe:definition.timeframe,
          dimensionKeys:Object.freeze(links),
          direction:question?.direction||null,
          min,max,anchorCount:Array.isArray(anchors)?anchors.length:0,
          required:question?.required!==false,applicability,
          reviewStatus:'pending_qualified_content_review',
          flags:Object.freeze(flags),
        }))
      }
    }
  }
  const distinctActive=new Set(active.map(entry=>entry.key))
  const seen=new Set(rows.map(row=>[row.key,row.version,row.locale].join('@')))
  return Object.freeze({
    purpose:'human_content_review_queue_only',
    disclaimer:'Automatic text flags are hypotheses, NOT failed validity or clinical accuracy.',
    families:distinctActive.size,
    expectedLanguageVersions:distinctActive.size*LANGUAGES.length,
    languageVersions:seen.size,
    missingVersions:Object.freeze(missingVersions),
    itemCount:rows.length,
    candidatesForReview:rows.filter(row=>row.flags.length>0).length,
    rows:Object.freeze(rows),
  })
}

// Intended for exporting own-author item text for a reviewer, never for
// importing licensed external questionnaires or exporting client responses.
// Escape spreadsheet-formula starters on output.
const csvValue=value=>{
  const raw=Array.isArray(value)?value.join(';'):String(value??'')
  const safe=/^\s*[=+@\-]/.test(raw)?"'"+raw:raw
  return '"'+safe.replace(/"/g,'""').replace(/[\r\n]+/g,' ')+'"'
}
export function authorItemContentCsv(audit) {
  const columns=['key','version','locale','itemId','itemOrder','text','timeframe',
    'dimensionKeys','direction','min','max','anchorCount','required','applicability',
    'reviewStatus','flags']
  return [columns.join(','),...audit.rows.map(row=>columns.map(key=>csvValue(row[key])).join(','))].join('\n')+'\n'
}
