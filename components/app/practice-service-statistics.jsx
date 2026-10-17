'use client'

import {useMemo,useState} from 'react'

const zero={impressions:0,orders:0,whatsapp:0,telegram:0}
const COPY={
  en:{
    title:'Service statistics',sub:'What visitors saw and clicked',
    yesterday:'Yesterday',week:'Last 7 days',
    impressions:'Service views',orders:'Order clicks',messengers:'Messenger clicks',
    service:'Service',whatsapp:'WhatsApp',telegram:'Telegram',
    total:'Total',empty:'No activity recorded for this period yet.',
    disclaimer:'Messenger clicks open WhatsApp or Telegram; they do not confirm a message, booking or payment.',
    periodNote:'Completed days · Toronto time. Counts start when tracking is published.',
  },
  ru:{
    title:'Статистика услуг',sub:'Что посетители увидели и куда переходили',
    yesterday:'Вчера',week:'За 7 дней',
    impressions:'Показы услуг',orders:'Нажатия «Заказать»',messengers:'Переходы в мессенджеры',
    service:'Услуга',whatsapp:'WhatsApp',telegram:'Telegram',
    total:'Всего',empty:'За этот период ещё нет зарегистрированных действий.',
    disclaimer:'Переход в мессенджер — это нажатие ссылки, а не подтверждённое сообщение, запись или оплата.',
    periodNote:'Завершённые дни · время Торонто. Учёт начинается с публикации функции.',
  },
}
const number=value=>new Intl.NumberFormat('en-CA').format(Number(value)||0)
const dateLabel=(day,ru)=>{
  if(!day)return '—'
  const date=new Date(day+'T12:00:00Z')
  return new Intl.DateTimeFormat(ru?'ru-RU':'en-CA',{month:'short',day:'numeric',timeZone:'UTC'}).format(date)
}
export default function PracticeServiceStatistics({analytics,locale}){
  const ru=locale==='ru',t=COPY[ru?'ru':'en']
  const [period,setPeriod]=useState('yesterday')
  const items=analytics?.services||[]
  const totals=useMemo(()=>items.reduce((result,item)=>{
    const metrics=item[period]||zero
    for(const key of Object.keys(zero))result[key]+=Number(metrics[key])||0
    return result
  },{...zero}),[items,period])
  const messages=totals.whatsapp+totals.telegram
  const from=period==='week'?analytics?.weekStart:analytics?.yesterday
  const to=analytics?.yesterday
  const range=period==='week'?dateLabel(from,ru)+' – '+dateLabel(to,ru):dateLabel(to,ru)
  return <section className="hh-practice-analytics" aria-labelledby="hh-practice-analytics-heading">
    <div className="hh-practice-analytics-head">
      <div><p className="hh-practice-analytics-kicker">{t.sub}</p><h2 id="hh-practice-analytics-heading">{t.title}</h2></div>
      <div className="hh-practice-analytics-period" role="group" aria-label={t.title}>
        <button type="button" aria-pressed={period==='yesterday'} onClick={()=>setPeriod('yesterday')}>{t.yesterday}</button>
        <button type="button" aria-pressed={period==='week'} onClick={()=>setPeriod('week')}>{t.week}</button>
      </div>
    </div>
    <p className="hh-practice-analytics-date">{range} · {t.periodNote}</p>
    <div className="hh-practice-analytics-summary">
      <div><strong>{number(totals.impressions)}</strong><span>{t.impressions}</span></div>
      <div><strong>{number(totals.orders)}</strong><span>{t.orders}</span></div>
      <div><strong>{number(messages)}</strong><span>{t.messengers}</span></div>
    </div>
    <p className="hh-practice-analytics-channels">{t.whatsapp}: <strong>{number(totals.whatsapp)}</strong><span aria-hidden="true"> · </span>{t.telegram}: <strong>{number(totals.telegram)}</strong></p>
    <div className="hh-practice-analytics-scroll">
      <table>
        <thead><tr><th scope="col">{t.service}</th><th scope="col">{t.impressions}</th><th scope="col">{t.orders}</th><th scope="col">{t.whatsapp}</th><th scope="col">{t.telegram}</th><th scope="col">{t.total}</th></tr></thead>
        <tbody>{items.map(item=>{
          const metrics=item[period]||zero
          return <tr key={item.id}><th scope="row">{item.title}</th><td>{number(metrics.impressions)}</td><td>{number(metrics.orders)}</td><td>{number(metrics.whatsapp)}</td><td>{number(metrics.telegram)}</td><td><strong>{number((metrics.whatsapp||0)+(metrics.telegram||0))}</strong></td></tr>
        })}</tbody>
      </table>
    </div>
    {(!items.length||(!totals.impressions&&!totals.orders&&!messages))&&<p className="hh-practice-analytics-empty">{t.empty}</p>}
    <p className="hh-practice-analytics-note">{t.disclaimer}</p>
  </section>
}
