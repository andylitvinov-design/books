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


test('service match results use full-width orderable cards with accessible details and real contact handoff',async()=>{
  const [ui,css,en,es,matcher]=await Promise.all([
    readFile(new URL('../components/services-smart-discovery.tsx',import.meta.url),'utf8'),
    readFile(new URL('../components/services-smart-discovery.module.css',import.meta.url),'utf8'),
    readFile(new URL('../app/[locale]/services/page.tsx',import.meta.url),'utf8'),
    readFile(new URL('../app/es/services/page.tsx',import.meta.url),'utf8'),
    readFile(new URL('../lib/whatsapp-enquiry.js',import.meta.url),'utf8'),
  ])
  for(const key of ['resultTitle:"Your options"','resultTitle:"Ваши варианты"','resultTitle:"Tus opciones"']) assert.ok(ui.includes(key))
  for(const key of [
    'className={styles.suggestionActions}', 'className={styles.suggestionDetailsToggle}',
    'className={styles.suggestionDetailPanel}', 'className={styles.editorialList}',
    'className={styles.editorialCard}', 'className={styles.editorialOrderButton}',
    'className={styles.editorialDetailsButton}', 'className={styles.editorialDetailsPanel}',
    'className={styles.editorialOrderPanel}', 'className={styles.editorialWhatsapp}',
    'className={styles.editorialTelegram}', 'className={styles.editorialFreeStart}',
    'aria-expanded={expanded}', 'aria-expanded={ordering}', 'aria-controls={"hh-order-"+item.id}',
    'data-discovery-editorial-offer={item.id}', 'hidden={!ordering}', 'hidden={!expanded}',
  ]) assert.ok(ui.includes(key),key)
  assert.ok(ui.includes('whatsappEnquiryUrl({locale, service:item.title, request, option:item.label, pagePath:item.href})'))
  assert.ok(ui.includes('telegramEnquiryUrlFromWhatsApp(whatsappUrl)'))
  assert.ok(ui.includes('event="service_request_start"'))
  assert.ok(ui.includes('data-contact-channel":"whatsapp"'))
  assert.ok(ui.includes('data-contact-channel":"telegram"'))
  assert.ok(ui.includes('item.free?<Link className={styles.editorialFreeStart}'))
  assert.ok(ui.includes('className={styles.editorialChannels}'))
  assert.ok(ui.includes('id={"hh-listing-details-"+service.id}'))
  assert.ok(ui.includes('service.copy.description || service.copy.shortDescription'))
  assert.ok(ui.includes('href={"/"+locale+"/app/consultations?service="+encodeURIComponent(service.id)}'))
  assert.ok(matcher.includes('safePublicWhatsAppPath(pagePath)'))
  assert.ok(!ui.includes('<Link key={item.id} href={item.href}>'),"No plain editorial link tiles should remain")
  assert.ok(!ui.includes('context:submitted'),"Personal search text must not be passed to messenger URL")
  assert.match(css,/\.suggestion\{\s*display:grid;\s*grid-template-columns:minmax\(0,1fr\) auto;/)
  assert.match(css,/\.editorialCard\{\s*box-sizing:border-box;display:grid;grid-template-columns:minmax\(0,1fr\) 158px;/)
  assert.ok(css.includes('.editorialDetailsPanel[hidden],.editorialOrderPanel[hidden]'))
  assert.ok(css.includes('.editorialChannels{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'))
  assert.ok(css.includes('.editorialCard{grid-template-columns:minmax(0,1fr) 111px;'))
  assert.ok(css.includes('.editorialCard :is(button,a):focus-visible'))
  assert.ok(en.includes('href:\`/\${locale}/services/systemic-constellations\`'))
  assert.ok(en.includes('free:offer.id === "situation" || offer.id === "dao"'))
  assert.ok(es.includes('details:detail,href,areaKey:areas[id]'))
  assert.ok(en.includes('€50 / 30 min · €100 / 60 min'))
})

test('a relationship query such as Love shows relevant orderable services first, without unrelated free cards',()=>{
  const editorial=[
    {id:'situation',title:'Free Situation Review',promise:'Written review',href:'/en/services/free-situation-review',areaKey:'emotional_psychological'},
    {id:'alchemy',title:'Alchemy of the Soul',promise:'Personal session',href:'/en/services/alchemy-of-soul',areaKey:'relationships'},
    {id:'constellations',title:'Systemic constellations',promise:'Family patterns',href:'/en/services/systemic-constellations',areaKey:'relationships'},
    {id:'dao',title:'Wu Xing',promise:'Symbolic resources',href:'/en/services/dao-health-profile',areaKey:'homeopathy_holistic'},
  ]
  const results=rankEditorialDiscovery('Love',editorial,{limit:4})
  assert.deepEqual(results.map(x=>x.id),['alchemy','constellations'])
  assert.deepEqual(rankEditorialDiscovery('amor',editorial,{limit:4}).map(x=>x.id),['alchemy','constellations'])
})


test('Services first fold on mobile uses concise search copy, four action chips and safe 16px input',async()=>{
  const [ui,css]=await Promise.all([
    readFile(new URL('../components/services-smart-discovery.tsx',import.meta.url),'utf8'),
    readFile(new URL('../components/services-smart-discovery.module.css',import.meta.url),'utf8'),
  ])
  for(const marker of ['Find the right support','Подберите помощь под свой запрос','Encuentra el apoyo que buscas']) assert.ok(ui.includes(marker))
  assert.equal((ui.match(/quickExamples:\[/g)||[]).length,3)
  assert.equal((ui.match(/mobilePrivacy:/g)||[]).length,3)
  assert.match(ui,/className=\{styles\.exampleShort\}/)
  assert.match(ui,/className=\{styles\.privacyCompact\}/)
  assert.match(ui,/aria-label=\{text\}/)
  assert.match(ui,/onClick=\{\(\)=>runExample\(text\)\}/)
  assert.match(ui,/maxLength=\{350\}/)
  assert.match(ui,/ref=\{resultsRef\} tabIndex=\{-1\}/)
  const mobile=css.slice(css.indexOf('/* Services first screen:'))
  assert.ok(mobile.includes('@media(max-width:620px)'))
  assert.match(mobile,/\.textarea\{[^}]*font-size:16px/)
  assert.match(mobile,/\.examples\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(mobile,/\.submit\{[^}]*min-height:44px/)
  assert.ok(mobile.includes('.exampleLong,.privacyFull{display:none}'))
})
