import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  classifyDiscoveryIntent, DISCOVERY_AREAS, rankDiscoveryServices, rankEditorialDiscovery,
  normalizeDiscoveryInput,
} from '../lib/practitioners/discovery-intent.js'

const offering=(id,areaKey,title,description)=>{
  return {
    id,areaKey,slug:id,practitionerSlug:'sample-master',practitionerName:'Sample Master',
    professionalTitle:'Practitioner',deliveryFormat:'online',pricingMode:'contact',
    currency:'',confirmedPrice:null,active:true,status:'published',
    languages:['en','ru'],durationMinutes:60,
    copy:{title,shortDescription:description,description},
  }
}
const published=[
  offering('reiki','energy_spiritual','Reiki Yggdrasil initiation','Reiki and meditation practice'),
  offering('confidence','personal_development','Personal growth session','Build confidence and clarify personal goals'),
  offering('constellation','relationships','Family constellation','Explore patterns in relationships'),
  offering('body','body_somatic','Somatic practice','Body awareness and grounding'),
  offering('wuxing','homeopathy_holistic','Wu Xing resource profile','Symbolic exploration of personal resources'),
  offering('biz','business_money','Business consultation','Explore business goals'),
]

test('free-form Russian language request for Reiki and energy ranks real published energy services',()=>{
  const intent=classifyDiscoveryIntent('Хочу попробовать Рейки и энергетические практики, развить внутреннюю опору')
  assert.ok(intent.some(x=>x.key==='energy_spiritual'))
  assert.ok(intent.some(x=>x.key==='personal_development'))
  const result=rankDiscoveryServices('Хочу попробовать Рейки, медитацию и энергопрактики',published,{limit:3})
  assert.equal(result[0].service.id,'reiki')
  assert.ok(result.every(x=>published.some(s=>s.id===x.service.id)))
})

test('English/Spanish requests find relationship, growth and body categories without clinical inference',()=>{
  assert.equal(classifyDiscoveryIntent('Explore family patterns in relationships')[0].key,'relationships')
  assert.ok(classifyDiscoveryIntent('Busco confianza y crecimiento personal').some(x=>x.key==='personal_development'))
  assert.equal(classifyDiscoveryIntent('respiración y cuerpo, somático')[0].key,'body_somatic')
  const results=rankDiscoveryServices('I want confidence and personal growth',published,{limit:3})
  assert.equal(results[0].service.id,'confidence')
})

test('category selector cannot manufacture masters, offers or prices, and respects existing ids',()=>{
  const r=rankDiscoveryServices('энергия',published,{category:'energy_spiritual',limit:4})
  assert.deepEqual(r.map(x=>x.service.id),['reiki'])
  assert.equal(rankDiscoveryServices('Рейки',[],{limit:3}).length,0)
  assert.deepEqual(rankDiscoveryServices('совершенно незнакомое слово',published,{limit:3}),[])
  assert.equal(rankDiscoveryServices('business',published,{category:'relationships',limit:5}).length,1)
  assert.ok(DISCOVERY_AREAS.some(a=>a.key==='energy_spiritual'))
  assert.ok(DISCOVERY_AREAS.some(a=>a.key==='personal_development'))
  assert.equal(new Set(DISCOVERY_AREAS.map(a=>a.key)).size,8)
  assert.equal(normalizeDiscoveryInput('У-Син, Ёлка'), 'у син елка')
})

test('editorial fallback points only to source-backed known routes, never a synthetic booking',()=>{
  const curated=[
    {id:'yggdrasil',title:'Рейки Иггдрасиль',href:'/ru/academy/reiki/yggdrasil/free-initiation',areaKey:'energy_spiritual',promise:'Обучение Reiki'},
    {id:'alchemy',title:'Алхимия души',href:'/ru/services/alchemy-of-soul',areaKey:'relationships',promise:'Личная консультация'},
  ]
  const r=rankEditorialDiscovery('Инициация Рейки',curated,{limit:2})
  assert.equal(r[0].id,'yggdrasil')
  assert.ok(r.every(x=>x.href.startsWith('/ru/')))
  assert.equal(rankEditorialDiscovery('что-то',curated,{category:'business_money'}).length,0)
})

test('Services: booking-style search and category selector appear above untouched personal Services hero in all three locales',async()=>{
  const [main,es,ui,css,api]=await Promise.all([
    readFile(new URL('../app/[locale]/services/page.tsx',import.meta.url),'utf8'),
    readFile(new URL('../app/es/services/page.tsx',import.meta.url),'utf8'),
    readFile(new URL('../components/services-smart-discovery.tsx',import.meta.url),'utf8'),
    readFile(new URL('../components/services-smart-discovery.module.css',import.meta.url),'utf8'),
    readFile(new URL('../app/api/marketplace/intent-match/route.ts',import.meta.url),'utf8'),
  ])
  for(const page of [main,es]){
    assert.ok(page.indexOf('<ServicesSmartDiscovery')>page.indexOf('<PublicSiteHeader'))
    assert.ok(page.indexOf('<ServicesSmartDiscovery')<page.indexOf('<ServicesConversionHero'))
    assert.match(page,/<ServicesTestsIntro/)
    assert.match(page,/<ServicesAboutEntry/)
    assert.match(page,/<PublicConsultationCta/)
  }
  assert.match(ui,/rankDiscoveryServices/)
  assert.match(ui,/rankEditorialDiscovery/)
  assert.match(ui,/onClick=\{\(\)=>chooseCategory\(area\.key\)\}/)
  assert.match(ui,/maxLength=\{350\}/)
  assert.match(ui,/aria-live="polite"/)
  assert.match(ui,/consent:true/)
  assert.match(ui,/!aiAvailable \|\| !useExternalAi/)
  assert.match(ui,/No.*medical|not a diagnosis/i)
  assert.match(css,/@media\(max-width:620px\)/)
  assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/)
  assert.match(api,/HH_MARKETPLACE_AI_ENABLED/)
  assert.match(api,/EXPLICIT_AI_CONSENT_REQUIRED/)
  assert.match(api,/candidates\.has\(id\)/)
  assert.match(api,/MAX_ATTEMPTS_PER_WINDOW/)
  assert.doesNotMatch(api,/console\.log|analytics|saveGuestResult|logVisitorText/)
  assert.doesNotMatch(main,/<ServiceCart/)
})

test('Service discovery scrolls to submitted and category results on mobile and desktop',async()=>{
  const [ui,css]=await Promise.all([
    readFile(new URL('../components/services-smart-discovery.tsx',import.meta.url),'utf8'),
    readFile(new URL('../components/services-smart-discovery.module.css',import.meta.url),'utf8'),
  ])
  assert.match(ui,/searchInputRef\.current\?\.blur\(\)/)
  assert.match(ui,/useEffect\(\(\) => \{[\s\S]*?target\.scrollIntoView\(/)
  assert.match(ui,/prefers-reduced-motion/)
  assert.match(ui,/window\.requestAnimationFrame/)
  assert.match(ui,/ref=\{resultsRef\} tabIndex=\{-1\}/)
  assert.match(ui,/aria-labelledby="hh-service-discovery-results-title"/)
  assert.equal((ui.match(/setScrollRequest\(\(count\) => count \+ 1\)/g)||[]).length,2)
  assert.match(css,/\.results\{[^}]*scroll-margin-top:110px\}/)
  assert.match(css,/@media\(max-width:767px\)\{\.results\{scroll-margin-top:16px\}\}/)
})

test('Explore by area is compact on mobile without removing category selection or result scrolling',async()=>{
  const [ui,css]=await Promise.all([
    readFile(new URL('../components/services-smart-discovery.tsx',import.meta.url),'utf8'),
    readFile(new URL('../components/services-smart-discovery.module.css',import.meta.url),'utf8'),
  ])
  assert.ok(css.includes('.category,.categoryActive{display:flex;'))
  assert.ok(css.includes('.category,.categoryActive{min-height:56px;padding:8px;gap:7px}'))
  assert.ok(css.includes('.categoryGrid{grid-template-columns:repeat(2,minmax(0,1fr))}'))
  assert.ok(ui.includes('className={styles.categoryCount}'))
  assert.ok(!ui.includes('className={styles.categoryDescription}'))
  assert.ok(ui.includes('onClick={()=>chooseCategory(area.key)}'))
  assert.ok(ui.includes('ref={resultsRef}'))
})


test('service match results show full-width horizontal service and editorial rows, with accessible mobile actions',async()=>{
  const [ui,css]=await Promise.all([
    readFile(new URL('../components/services-smart-discovery.tsx',import.meta.url),'utf8'),
    readFile(new URL('../components/services-smart-discovery.module.css',import.meta.url),'utf8'),
  ])
  assert.ok(ui.includes('resultTitle:"Your options"'))
  assert.ok(ui.includes('resultTitle:"Ваши варианты"'))
  assert.ok(ui.includes('resultTitle:"Tus opciones"'))
  assert.ok(ui.includes('className={styles.suggestionActions}'))
  assert.ok(ui.includes('className={styles.editorialList}'))
  assert.ok(css.includes('/* Results: one full-width horizontal service row'))
  assert.ok(css.includes('.suggestionGrid,.editorialList{display:grid;grid-template-columns:minmax(0,1fr);gap:9px}'))
  assert.match(css,/\.suggestion\{\s*display:grid;\s*grid-template-columns:minmax\(0,1fr\) auto;/)
  assert.ok(css.includes('.suggestionTop{grid-column:1/-1;grid-row:1;'))
  assert.ok(css.includes('.suggestionActions{grid-column:2;grid-row:2/5;'))
  assert.ok(css.includes('.editorialList a{box-sizing:border-box;display:flex;'))
  assert.ok(css.includes('.results:focus-visible{outline:2px solid'))
  const mobile=css.slice(css.lastIndexOf('@media(max-width:620px){'))
  assert.ok(mobile.includes('.suggestionGrid,.editorialList{grid-template-columns:minmax(0,1fr);gap:8px}'))
  assert.ok(mobile.includes('.suggestion{grid-template-columns:minmax(0,1fr) 100px;'))
  assert.ok(mobile.includes('.suggestionActions a{width:100%;min-height:44px;'))
  assert.ok(css.includes('@media(max-width:350px){'))
  assert.ok(css.includes('.suggestionActions{grid-column:1;grid-row:5;'))
  assert.doesNotMatch(css,/\.suggestionGrid,\.editorialList\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  const requestLink=ui.indexOf('<Link href={"/"+locale+"/app/consultations?service="+encodeURIComponent(service.id)}>{t.request}</Link>')
  const detailLink=ui.indexOf('<Link href={"/"+locale+"/services/"+service.practitionerSlug+"/"+service.slug}>{t.details}')
  assert.ok(requestLink>0 && detailLink>requestLink)
})
