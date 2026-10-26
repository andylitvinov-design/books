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
      b.views-a.views || b.landings-a.landings || b.clicks-a.clicks ||
      a.path.localeCompare(b.path))
  }
  return {totals,periods,hasRows:periods.week.length>0}
}


function landingSources(items,limit=5) {
  const counts=new Map()
  for(const item of items) for(const [source,values] of item.sources) {
    if(values.landings>0) counts.set(source,(counts.get(source)||0)+values.landings)
  }
  return [...counts.entries()]
    .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
    .slice(0,limit)
    .map(([source,count])=>(SOURCES[source]||'не определён')+' '+num(count))
    .join(' · ')||'нет измеренных входов'
}

// A page's source breakdown counts actual entrances, not arbitrary click
// referrers or visits to internal pages. Never present views as unique people.
function shortPage(path) {
  return path.length>62 ? path.slice(0,59)+'…' : path
}

export function publicPageDigestLines(rows,dates) {
  const traffic=summarizePublicPageTraffic(rows,dates)
  if(!traffic.hasRows) return [
    '🏆 Вчера · топ страниц по просмотрам: нет измеренных данных.',
    '🏆 За 7 дней · топ страниц по просмотрам: нет измеренных данных.',
    '🧭 Посадочные страницы и источники: пока нет данных по добровольным посещениям.',
    'ℹ История до включения нового счётчика не восстановлена; прежние клики могли включать владельца.'
  ]
  const {yesterday,week}=traffic.totals
  const lines=[
    '🌐 Публичные страницы · только добровольное согласие, владелец исключён:',
    'Вчера: просмотры '+num(yesterday.views)+' · входы '+num(yesterday.landings)+' · клики '+num(yesterday.clicks),
    'За 7 дней: просмотры '+num(week.views)+' · входы '+num(week.landings)+' · клики '+num(week.clicks),
    '🧭 Источники входов вчера: '+landingSources(traffic.periods.yesterday),
    '🧭 Источники входов за 7 дней: '+landingSources(traffic.periods.week)
  ]
  // Bound each ranked section independently to keep both periods in one
  // Telegram message (4096-character provider limit) with the service digest.
  for(const [name,title] of [['yesterday','Вчера'],['week','За 7 дней']]) {
    const pages=traffic.periods[name].filter(item=>item.views>0)
    lines.push('🏆 '+title+' · топ-10 страниц по просмотрам:')
    if(!pages.length){lines.push('Нет измеренных просмотров.');continue}
    let used=0
    let shown=0
    for(const item of pages.slice(0,10)) {
      const landing=item.landings ? ' · '+landingSources([item],2) : ''
      const line='• '+shortPage(item.path)+' — '+num(item.views)+
        ' просм., '+num(item.landings)+' вход.'+landing
      if(used+line.length>980)break
      lines.push(line)
      used+=line.length+1
      shown++
    }
    if(pages.length>shown)lines.push('… ещё '+num(pages.length-shown)+' страниц; часть списка сокращена для Telegram.')
  }
  lines.push('ℹ Просмотры не равны уникальным людям. Без согласия посещения не учитываются; заявки и оплаты считаются отдельно.')
  return lines
}
