import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {getProgramOverview,PUBLIC_PROGRAMS,PROGRAM_LOCALES} from '../lib/public-coaching-programs.mjs'
import {isUnifiedMobileDockPath,unifiedMobileDockActive} from '../lib/unified-mobile-dock.mjs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('four localized public program routes have exact complete outlines and separate Daybooks',()=>{
 for(const locale of PROGRAM_LOCALES){
  for(const [i,id] of PUBLIC_PROGRAMS.entries()){
   const p=getProgramOverview(locale,id)
   assert.equal(p.rows.length,[3,8,4,5][i])
   assert.ok(p.rows.every(row=>row.length===2&&row.every(Boolean)))
   assert.equal(p.startHref,['/'+locale+'/app/daybook?program=clarity','/'+locale+'/app/daybook?start=vector','/'+locale+'/app/daybook/business','/'+(locale==='ru'?'ru':'en')+'/academy/principles-of-energywork/daybook'][i])
   assert.equal(isUnifiedMobileDockPath('/'+locale+'/programs/'+id),true)
   assert.equal(unifiedMobileDockActive('/'+locale+'/programs/'+id),'ai')
  }
 }
 assert.deepEqual(PUBLIC_PROGRAMS,['clarity','goal','business','reiki'])
 assert.deepEqual(getProgramOverview('ru','reiki').rows.map(row=>row[0]),['Sun Flight','Tantra Reiki','Kundalini Reiki','Reiki Yggdrasil','Personal Initiation'])
 assert.match(getProgramOverview('es','reiki').intro,/inglés o ruso/)
 assert.equal(getProgramOverview('fr','goal'),null)
 assert.equal(getProgramOverview('ru','other'),null)
 assert.equal(isUnifiedMobileDockPath('/ru/programs/other'),false)
 assert.deepEqual(getProgramOverview('ru','goal').rows.map(row=>row[0]),[
  'Найти свою цель','Зажечь свою мечту','Построить путь к цели','Открыть свою силу','Снять внутренние препятствия','Открыть новые возможности','Ускорить движение к цели','Итоги и новые перспективы'
 ])
 assert.match(getProgramOverview('ru','clarity').intro,/Бесплатное знакомство/)
})
test('home program controls open public detail pages, composer and real Daybook entry are retained',()=>{
 const home=read('components/home-dialogue-entry.tsx')
 assert.ok(home.includes('router.push("/"+locale+"/programs/"+art.id)'))
 assert.match(home,/stageHomeAliHandoff\(window\.sessionStorage/)
 const ui=read('components/public-program-overview.jsx')
 assert.match(ui,/p\.rows\.map/)
 assert.match(ui,/<ProgramStartLink locale=\{p\.locale\} program=\{p\.id\} className=\{styles\.cta\}>/)
 assert.equal((ui.match(/<ProgramStartLink /g)||[]).length,1)
 assert.match(ui,/<ReikiDaybookStart locale=\{p\.locale\} className=\{styles\.cta\}/)
 assert.equal((ui.match(/<ReikiDaybookStart /g)||[]).length,1)
 assert.match(ui,/data-program-session=\{index\+1\}/)
 assert.doesNotMatch(ui,/UnifiedMobileDock|dangerouslySetInnerHTML/)
 const page=read('app/[locale]/programs/[program]/page.jsx')
 assert.match(page,/if\(!p\)notFound\(\)/)
})
