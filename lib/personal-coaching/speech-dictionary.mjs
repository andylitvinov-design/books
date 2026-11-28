// First-party, owner-scoped, short confirmed spelling pairs only.
// No provider request, profile summary, archive text, or persistence.
import {normalizeSpeechAmendments} from './speech-amendments.mjs'
const languages=new Set(['ru','en','es'])
const maxTerms=32,maxRecords=20
const safe=s=>typeof s==='string'&&s.length<=80&&s.trim().length>0&&!/[\u0000-\u001f\u007f]/u.test(s)
const key=(s,locale)=>s.trim().normalize('NFC').toLocaleLowerCase(locale)
function collect(rows,locale){
 const groups=new Map()
 for(const row of rows){
  if(!safe(row?.raw)||!safe(row?.text))continue
  const raw=key(row.raw,locale),text=key(row.text,locale)
  if(!groups.has(raw))groups.set(raw,new Map())
  groups.get(raw).set(text,{raw:row.raw.trim(),text:row.text.trim()})
 }
 return groups
}
export function projectSpeechDictionary(records,locale){
 if(!languages.has(locale)||!Array.isArray(records)||records.length>maxRecords)throw Error('INVALID_SPEECH_DICTIONARY')
 const rows=[]
 for(const record of records){
  if(record?.provenance!=='client_reviewed_dialogue')continue
  try{rows.push(...normalizeSpeechAmendments(record.speechAmendments,record.turns,record.id).filter(x=>x.locale===locale))}catch{/* Invalid record never supplies a term. */}
 }
 const groups=collect(rows,locale)
 return [...groups.values()].filter(g=>g.size===1).slice(0,maxTerms).map(g=>[...g.values()][0])
}
export function archivedSpeechSuggestion({current=[],turns,sessionId,archive=[],raw,locale}={}){
 if(!languages.has(locale)||!safe(raw)||!Array.isArray(archive)||archive.length>maxTerms)return ''
 try{
  const rows=normalizeSpeechAmendments(current,turns,sessionId).filter(x=>x.locale===locale)
  const matches=collect([...rows,...archive],locale).get(key(raw,locale))
  return matches?.size===1?[...matches.values()][0].text:''
 }catch{return ''}
}
