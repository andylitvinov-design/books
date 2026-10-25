import {safePublicPagePath,safePublicSource} from './public-page-traffic.mjs'

// Pure aggregation; no arbitrary referrers, UTM codes or private payloads.
const int=value=>Number.isSafeInteger(Number(value)) && Number(value)>=0 ? Number(value) : 0
const num=value=>new Intl.NumberFormat('ru-RU').format(int(value))
const SOURCES={
 'direct':'прямые','google-organic':'Google поиск','google-paid':'Google реклама',
 'bing-organic':'Bing','facebook-organic':'Facebook','facebook-paid':'Facebook реклама',
 'instagram-organic':'Instagram','instagram-paid':'Instagram реклама',
 'youtube':'YouTube','telegram':'Telegram','whatsapp':'WhatsApp',
 'partner':'партнёры','referral':'другие сайты','unknown':'не определён'
}
const zero=()=>({landings:0,views:0,clicks:0})
const validDay=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)

export function summarizePublicPageTraffic(rows,dates) {
  if(!dates || !validDay(dates.yesterday)||!validDay(dates.weekStart))
    throw Error('INVALID_PERIOD')
  const maps={yesterday:new Map(),week:new Map()}
  const totals={yesterday:zero(),week:zero()}
  for(const row of Array.isArray(rows)?rows:[]) {
    const path=safePublicPagePath(row.pagePath)
    const source=safePublicSource(row.source)
    if(!path||!source||!validDay(row.day))continue
    const amount={landings:int(row.landings),views:int(row.views),clicks:int(row.clicks)}
    for(const key of ['yesterday','week']) {
      if(key==='yesterday' ? row.day!==dates.yesterday :
        row.day<dates.weekStart || row.day>dates.yesterday)continue
      let item=maps[key].get(path)
      if(!item){item={path,...zero(),sources:new Map()};maps[key].set(path,item)}
      let sub=item.sources.get(source)
      if(!sub){sub=zero();item.sources.set(source,sub)}
      for(const name of ['landings','views','clicks']){
        item[name]+=amount[name]
        sub[name]+=amount[name]
        totals[key][name]+=amount[name]
      }
    }
  }
  const periods={}
  for(const name of ['yesterday','week']){
    periods[name]=[...maps[name].values()].sort((a,b)=>
      b.clicks-a.clicks || b.landings-a.landings || b.views-a.views ||
      a.path.localeCompare(b.path))
  }
  return {totals,periods,hasRows:periods.week.length>0}
}

function sourceLine(item) {
  const key=item.clicks>0?'clicks':'landings'
  const sources=[...item.sources].filter(([,v])=>v[key]>0)
    .sort((a,b)=>b[1][key]-a[1][key]||a[0].localeCompare(b[0])).slice(0,2)
  return sources.map(([source,values])=>
    (SOURCES[source]||'не определён')+' '+num(values[key])).join(', ')||'не определены'
}

export function publicPageDigestLines(rows,dates) {
  const traffic=summarizePublicPageTraffic(rows,dates)
  if(!traffic.hasRows) return [
    '🧭 Посадочные страницы и источники: пока нет данных по добровольным посещениям.',
    'ℹ История до включения нового счётчика не восстановлена; прежние клики могли включать владельца.'
  ]
  const {yesterday,week}=traffic.totals
  const lines=[
    '🧭 Публичные страницы (только с согласием, без владельца):',
    'Вчера: входы '+num(yesterday.landings)+' · просмотры '+num(yesterday.views)+' · клики '+num(yesterday.clicks),
    'За 7 дней: входы '+num(week.landings)+' · просмотры '+num(week.views)+' · клики '+num(week.clicks)
  ]
  for(const [name,title] of [['yesterday','Вчера'],['week','За неделю']]) {
    const list=traffic.periods[name]
    lines.push('🏆 '+title+' · топ страниц по кликам:')
    if(!list.length) { lines.push('Пока нет учтённых событий.'); continue }
    for(const item of list.slice(0,3)) {
      lines.push('• '+item.path+' — '+num(item.clicks)+' кликов, '+num(item.landings)+
        ' входов; '+(item.clicks?'источники кликов: ':'источники входов: ')+sourceLine(item))
    }
  }
  lines.push('ℹ Просмотры/клики ≠ уникальные люди, заявки или оплаты; часть трафика не учтена без согласия.')
  return lines
}
