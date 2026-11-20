import {createHash} from 'node:crypto'

const text=value=>typeof value==='string'
  ?value.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/gu,' ').trim():''
const digest=value=>createHash('sha256').update(value).digest('hex')

/**
 * Plaud has no public personal-account API. This accepts only a client-authorized
 * exported file; MCP/CLI can supply the same `manual` payload after user review.
 */
export function normalizePlaudImport(input={}){
 if(input?.mode!=='manual')throw Error('PLAUD_IMPORT_MODE_UNSUPPORTED')
 const filename=text(input.filename).slice(0,180)
 const content=text(input.content)
 if(!filename||!content||content.length>200_000)throw Error('PLAUD_IMPORT_INVALID')
 const stripped=content.replace(/^\d+\n\d\d:\d\d:\d\d[,.]\d+\s+-->\s+\d\d:\d\d:\d\d[,.]\d+\n/gmu,'')
  .replace(/^\[[^\]]+\]\s*/gmu,'').trim()
 if(!stripped)throw Error('PLAUD_IMPORT_INVALID')
 return {provider:'plaud_import',providerRecordId:digest(filename+'|'+content),revisionHash:digest(content),
  sourceFilename:filename,text:stripped.slice(0,120_000),importMode:'manual'}
}

/** Validates the GraphQL body, because HTTP 200 does not mean Linear succeeded. */
export function parseLinearGraphqlResponse(body,{mutation=false}={}){
 if(!body||typeof body!=='object'||Array.isArray(body)||!body.data||typeof body.data!=='object')throw Error('LINEAR_GRAPHQL_INVALID')
 if(Array.isArray(body.errors)&&body.errors.length)throw Error('LINEAR_GRAPHQL_ERROR')
 if(mutation&&Object.values(body.data).some(value=>value&&typeof value==='object'&&value.success!==true))
  throw Error('LINEAR_MUTATION_UNSUCCESSFUL')
 return body.data
}

/** Minimal, bounded Fireflies projection; raw provider payload is never a command. */
export function prepareFirefliesRecord(input={}){
 const id=text(input.id)
 const title=text(input.title).slice(0,240)
 const date=text(input.date)
 if(!id||!title||!date||!Number.isFinite(Date.parse(date)))throw Error('FIREFLIES_RECORD_INVALID')
 const sentences=(Array.isArray(input.sentences)?input.sentences:[]).map(row=>text(row?.text)).filter(Boolean).slice(0,500)
 const summary=text(input.summary?.overview||input.summary?.action_items||'').slice(0,12_000)
 const canonical=JSON.stringify({id,title,date,sentences,summary})
 return {provider:'fireflies',providerRecordId:id,revisionHash:digest(canonical),title,occurredAt:new Date(date).toISOString(),
  text:[summary,...sentences].filter(Boolean).join('\n').slice(0,120_000)}
}
