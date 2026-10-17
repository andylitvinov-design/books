import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const source=file=>readFile(new URL(file,import.meta.url),'utf8')

test('My Practice phone analytics keeps all channels and uses readable rows rather than a scrolled table', async ()=>{
  const [view,css]=await Promise.all([
    source('../components/app/practice-service-statistics.jsx'),
    source('../components/app/practice-dashboard.css'),
  ])
  assert.match(view,/hh-practice-analytics-mobile-list/)
  assert.match(view,/items\.slice\(0,showAllServices\?items\.length:4\)/)
  assert.match(view,/aria-expanded=\{showAllServices\}/)
  for(const field of ['impressions','orders','whatsapp','telegram']){
    assert.match(view,new RegExp('number\\(metrics\\.'+field+'\\)'))
  }
  for(const locale of ['Show all services','Показать все услуги','Yesterday','Вчера']){
    assert.ok(view.includes(locale),locale)
  }
  assert.match(css,/@media\(max-width:600px\)/)
  assert.match(css,/hh-practice-analytics-scroll\{display:none\}/)
  assert.match(css,/hh-practice-analytics-mobile\{display:block\}/)
  assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/)
})

test('Desktop My Practice retains the complete six-column table',async ()=>{
  const [view,css]=await Promise.all([
    source('../components/app/practice-service-statistics.jsx'),
    source('../components/app/practice-dashboard.css'),
  ])
  assert.match(view,/<th scope="col">\{t\.total\}<\/th>/)
  assert.match(view,/hh-practice-analytics-scroll/)
  assert.match(css,/hh-practice-analytics-mobile,\s*\n\.hh-app \.hh-practice-analytics-week-short/)
})
