// Safe local preview of a CSV content export. Import never publishes externally.
import {GROWTH_CHANNELS,GROWTH_LANGUAGES,GROWTH_BRANDS,normalizePostFields,GrowthStudioError} from './model.mjs'

const MAX_BYTES=524_288
const MAX_ROWS=500
const ALIASES = Object.freeze({
  title:['title','name','post_title','post name','posttitle'],
  caption:['caption','text','content','post','message','post_text','post text','description'],
  brand:['brand','project','workspace'],
  channel:['channel','network','platform','social_network','social network'],
  locale:['locale','language','lang'],
  campaign:['campaign','campaign_id','campaign id','utm_campaign'],
  sourceUrl:['sourceurl','source_url','source url','url','link','link(s)','website','landing_url'],
  mediaUrl:['mediaurl','media_url','media url','image','imageurl','image_url','photo_url','video_url','media url(s)'],
  mediaAlt:['mediaalt','media_alt','media alt','alt','alt_text','alt text(s)','image_description'],
  scheduledAt:['scheduledat','scheduled_at','scheduled at','scheduled','schedule','datetime','publication_date','publication date','date'],
})
const canonical = key=>String(key).trim().toLowerCase().replace(/^\uFEFF/,'').replace(/[\s-]+/g,'_')
const lookup = (record, keys)=> {
  for (const key of keys) {
    const k=canonical(key)
    if(Object.hasOwn(record,k))return String(record[k]??'').trim()
  }
  return ''
}
function csvRows(source, separator=',') {
  if(typeof source!=='string'||source.length>MAX_BYTES||!source.trim()||![';',',','\t'].includes(separator)) throw new GrowthStudioError('invalid_csv')
  const lines=[];let row=[],field='',quoted=false
  for(let i=0;i<source.length;i++){
    const chr=source[i]
    if(chr==='"'){
      if(quoted&&source[i+1]==='"'){field+='"';i++}
      else if(quoted)quoted=false
      else if(field==='')quoted=true
      else throw new GrowthStudioError('invalid_csv')
    } else if(!quoted&&chr===separator){row.push(field);field=''}
    else if(!quoted&&(chr==='\n'||chr==='\r')){
      if(chr==='\r'&&source[i+1]==='\n')i++
      row.push(field);field=''
      if(row.some(x=>x.trim()))lines.push(row)
      row=[]
      if(lines.length>MAX_ROWS+1)throw new GrowthStudioError('too_many_rows')
    } else if(chr==='\u0000'){throw new GrowthStudioError('invalid_csv')}
    else field+=chr
  }
  if(quoted)throw new GrowthStudioError('invalid_csv')
  row.push(field);if(row.some(x=>x.trim()))lines.push(row)
  if(lines.length<2)throw new GrowthStudioError('invalid_csv')
  if(lines.length-1>MAX_ROWS)throw new GrowthStudioError('too_many_rows')
  const widths=new Set(lines.map(x=>x.length))
  if(widths.size!==1||lines[0].length>35)throw new GrowthStudioError('invalid_csv')
  return lines
}
export function parseGrowthCsv(source,defaults={brand:'holistic_house',channel:'instagram',locale:'en'}) {
  if (!Object.hasOwn(GROWTH_BRANDS,defaults.brand)||!GROWTH_CHANNELS.includes(defaults.channel)||!GROWTH_LANGUAGES.includes(defaults.locale))throw new GrowthStudioError('invalid_csv')
  const header=(String(source).split(/\r?\n/,1)[0]||'')
  const candidate=[',',';','\t'].sort((a,b)=>(header.split(b).length-header.split(a).length))[0]
  const [keys,...items]=csvRows(source,candidate)
  const headers=keys.map(canonical)
  if(new Set(headers).size!==headers.length)throw new GrowthStudioError('invalid_csv')
  const available=new Set(Object.values(ALIASES).flat().map(canonical))
  if(!headers.some(h=>ALIASES.caption.some(k=>canonical(k)===h)))throw new GrowthStudioError('invalid_csv')
  if(!headers.some(h=>available.has(h)))throw new GrowthStudioError('invalid_csv')
  const accepted=[],errors=[]
  for(let i=0;i<items.length;i++){
    const record=Object.fromEntries(headers.map((key,index)=>[key,items[i][index]]))
    const caption=lookup(record,ALIASES.caption)
    const title=lookup(record,ALIASES.title)||caption.slice(0,95)
    const brand=lookup(record,ALIASES.brand)||defaults.brand
    const channel=lookup(record,ALIASES.channel)||defaults.channel
    const locale=lookup(record,ALIASES.locale)||defaults.locale
    const time=lookup(record,ALIASES.scheduledAt)
    // Keep ambiguous timestamp formats as errors; never guess a publishing timezone.
    let scheduledAt=''
    if(time){
      if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(time)){
        errors.push({row:i+2,reason:'timezone_required'});continue
      }
      const date=new Date(time)
      if(!Number.isFinite(date.getTime())){errors.push({row:i+2,reason:'invalid_date'});continue}
      scheduledAt=date.toISOString()
    }
    const fields={
      brand,channel,locale,title,caption,sourceUrl:lookup(record,ALIASES.sourceUrl),
      campaign:lookup(record,ALIASES.campaign),scheduledAt,
      mediaUrl:lookup(record,ALIASES.mediaUrl),mediaAlt:lookup(record,ALIASES.mediaAlt),
    }
    try{
      accepted.push(normalizePostFields(fields))
    }catch{errors.push({row:i+2,reason:'invalid_post'})}
  }
  return {items:accepted,errors,total:items.length}
}
export const growthCsvTemplate='title,caption,brand,channel,locale,sourceUrl,campaign,scheduledAt,mediaUrl,mediaAlt\n"Welcome to our free practices","Explore our public practice resources","holistic_house","instagram","en","/en/academy","intro_202610","","",""'
