import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getRemedy, getRemedyDirectory } from '../../data/remedies.js'
import { normalizeRemedyName } from './names.js'

const sources = JSON.parse(readFileSync(join(process.cwd(), 'data/remedy-source-status.json'), 'utf8')).remedies
const aliases = (value) => String(value ?? '').split(/[;,]/).map((name)=>name.trim()).filter(Boolean)

export function getRemedyNameRegistry() {
  const canonical = getRemedyDirectory('en').map(({slug})=> {
    const en=getRemedy('en',slug), ru=getRemedy('ru',slug)
    const source=sources.find((item)=>item.slug===slug)
    return { id:slug,slug,displayName:en.canonical_latin_name,sourceStatus:'canonical',importNames:[en.canonical_latin_name,ru.russian_common_name,en.russian_common_name,slug.replaceAll('-',' '),...aliases(en.aliases),...aliases(ru.aliases),...(source?.aliases??[])].filter(Boolean) }
  })
  const known=new Set(canonical.map((r)=>r.slug))
  return [...canonical,...sources.filter((r)=>!known.has(r.slug)).map((r)=>({id:`source:${r.slug}`,slug:null,displayName:r.preferredName,sourceStatus:'source_only',importNames:[r.preferredName,...r.aliases]}))]
}

const registry=getRemedyNameRegistry()
// Ambiguous aliases stay ambiguous. Never assign a species or canonical route by a guess.
export function findKnownRemedyName(name) {
  const normalized=normalizeRemedyName(name)
  if(!normalized)return undefined
  const preferred=registry.filter((r)=>normalizeRemedyName(r.displayName)===normalized)
  if(preferred.length===1)return preferred[0]
  const matches=registry.filter((r)=>r.importNames.some((n)=>normalizeRemedyName(n)===normalized))
  return matches.length===1 ? matches[0] : undefined
}

export function resolveRecommendationRemedy(value,index=0) {
  const slug=String(value?.remedySlug??'').trim()
  const entered=String(value?.displayNameOverride??'').normalize('NFKC').trim().replace(/\s+/g,' ')
  if(slug) {
    const canonical=registry.find((r)=>r.slug===slug)
    if(!canonical)throw new Error(`Unknown canonical remedy slug: ${slug}`)
    return {remedySlug:slug,displayNameOverride:null,displayName:canonical.displayName,sourceStatus:'canonical'}
  }
  if(!entered || entered.length>200 || /[\u0000-\u001f\u007f]/.test(entered))throw new Error(`Item ${index+1} needs a remedy name of 1–200 characters`)
  const known=findKnownRemedyName(entered)
  if(known?.sourceStatus==='canonical')return {remedySlug:known.slug,displayNameOverride:null,displayName:known.displayName,sourceStatus:'canonical'}
  return {remedySlug:null,displayNameOverride:known?.displayName??entered,sourceStatus:known?'source_only':'custom'}
}

// Only admin-safe name/status search data; source notes and classifications stay server-side.
export function getConsultationRemedyOptions() {
  return registry.map((r)=>({...r,label:r.displayName,searchText:r.importNames.join(' ')}))
}
