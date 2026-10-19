import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parse } from 'postcss'
import {
  classifyDiscoveryIntent, DISCOVERY_AREAS, rankDiscoveryServices, rankEditorialDiscovery,
  normalizeDiscoveryInput, serviceMatchesDiscoveryFacets,
} from '../lib/practitioners/discovery-intent.js'

const mobileResultCss=(css)=>{
  const nodes=parse(css).nodes
  const start=nodes.findIndex(node=>node.type==='comment' && node.text.startsWith('Results: one full-width horizontal service row'))
  assert.notEqual(start,-1,'the Results CSS section must exist')
  const end=nodes.findIndex((node,index)=>index>start && node.type==='comment')
  const selectors=new Set(['.suggestionGrid,.editorialList','.suggestion','.suggestionActions a'])
  // Only the result section's direct 620px rules count, regardless of later hero media queries.
  return nodes.slice(start+1,end===-1?undefined:end)
    .filter(node=>node.type==='atrule' && node.name==='media' && node.params.replace(/\s/g,'')==='(max-width:620px)')
    .flatMap(node=>node.nodes||[])
    .filter(node=>node.type==='rule' && selectors.has(node.selector.trim().replace(/\s*,\s*/g,',')))
    .map(rule=>{
      const selector=rule.selector.trim().replace(/\s*,\s*/g,',')
      const declarations=rule.nodes.filter(node=>node.type==='decl')
        .map(node=>`${node.prop}:${node.value}${node.important?'!important':''}`).join(';')
      return `${selector}{${declarations}}`
    }).join('\n')
}

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

test('free-only price facet includes all eligible free areas without surfacing paid offers',()=>{
  const freeWuXing={...offering('free-wuxing','homeopathy_holistic','Free Wu Xing profile','Personal resource map'),pricingMode:'free'};
  const freeSomatic={...offering('free-somatic','body_somatic','Free somatic introduction','Body awareness'),pricingMode:'free'};
  const paid=offering('paid-reiki','energy_spiritual','Paid Reiki session','Individual session');
  const freeOnline=[freeWuXing,freeSomatic,paid].filter(service=>serviceMatchesDiscoveryFacets(service,{
    format:'online',city:'toronto',language:'en',price:'free',
  }));
  assert.deepEqual(freeOnline.map(service=>service.id),['free-wuxing','free-somatic']);
  const results=rankDiscoveryServices('',freeOnline,{limit:10,includeAllAreas:true});
  assert.deepEqual(results.map(row=>row.service.id).sort(),['free-somatic','free-wuxing']);
  assert.ok(rankDiscoveryServices('',freeOnline,{limit:10}).every(row=>row.service.areaKey!=='homeopathy_holistic'));
});

test('Free Services Only is an initially unchecked compact filter below the restored full-width search CTA',async()=>{
  const [ui,css]=await Promise.all([
    readFile(new URL('../components/services-smart-discovery.tsx',import.meta.url),'utf8'),
    readFile(new URL('../components/services-smart-discovery.module.css',import.meta.url),'utf8'),
  ]);
  for(const phrase of ['Free Services Only','Только бесплатные услуги','Solo servicios gratuitos'])
    assert.ok(ui.includes(phrase),phrase);
  assert.ok(ui.includes('const [budget,setBudget] = useState("")'),'free is off by default');
  assert.ok(ui.includes('checked={budget === "free"}'),'checkbox and Price select share one state');
  assert.ok(ui.includes('data-free-services-only'),'free checkbox has a stable interactive target');
  assert.ok(ui.includes('setBudget(event.target.checked ? "free" : "")'),'checkbox switches free facet on and off');
  assert.ok(ui.includes('value={budget} onChange={e=>{setBudget(e.target.value);setHasSelection(true)}}'),'changing Price also changes checkbox');
  assert.ok(ui.includes('disabled={(!query.trim() && budget!=="free") || aiStatus==="loading"}'),
    'the original search button becomes actionable even without text when free is selected');
  assert.ok(ui.includes('if (!text && budget !== "free") return;'),'empty free-only searches reach results');
  assert.ok(ui.includes('if (!text || !aiAvailable || !useExternalAi) return;'),'empty query never requests external AI');
  assert.ok(ui.includes('includeAllAreas:budget==="free"'),'free matching covers every service category');
  assert.ok(ui.includes('budget==="free"?10:suggestions.length?2:4'),'free editorial matches are not unnecessarily hidden');
  assert.ok(ui.includes('budget==="free"?t.freeResultTitle:t.resultTitle'));
  const formIndex=ui.indexOf('<form className={styles.form}');
  const endForm=ui.indexOf('</form>',formIndex);
  const checkbox=ui.indexOf('className={styles.freeOnlyToggle}');
  const facets=ui.indexOf('className={styles.quickFacets}');
  assert.ok(formIndex>=0 && endForm<formIndex+1000 && endForm<checkbox && checkbox<facets,
    'the small checkbox follows, not splits, the primary search form');
  assert.ok(css.includes('.freeOnlyToggle{display:inline-flex;'),'checkbox is an understated compact row');
  assert.ok(css.includes('.form{display:grid;gap:6px;padding:6px;border-radius:14px}'),
    'phone form restores a single full-width submit');
  assert.ok(css.includes('.submit{width:100%;min-width:0;min-height:44px'),
    'phone submit spans full search width');
  assert.ok(!ui.includes('freeSubmit') && !ui.includes('findFreeServices') && !ui.includes('Gift size={19}'),
    'extra Find free services button is gone');
  assert.ok(!css.includes('.freeSubmit'),'removed CTA styles cannot override the restored single-button layout');
});

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

test('Services: optional booking-style search lives in the dedicated directory for all locales',async()=>{
  const [main,es,directory,ui,css,api]=await Promise.all([
    readFile(new URL('../app/[locale]/services/page.tsx',import.meta.url),'utf8'),
    readFile(new URL('../app/es/services/page.tsx',import.meta.url),'utf8'),
    readFile(new URL('../components/services-directory-page.tsx',import.meta.url),'utf8'),
    readFile(new URL('../components/services-smart-discovery.tsx',import.meta.url),'utf8'),
    readFile(new URL('../components/services-smart-discovery.module.css',import.meta.url),'utf8'),
    readFile(new URL('../app/api/marketplace/intent-match/route.ts',import.meta.url),'utf8'),
  ])
  for(const page of [main,es]){
    assert.ok(page.indexOf('<ServicesStudioOffers')>page.indexOf('<ServicesConversionHero'))
    assert.ok(page.indexOf('<PersonalTestimonials')>page.indexOf('<ServicesStudioOffers'))
    assert.ok(page.indexOf('<PublicConsultationCta')>page.indexOf('<PersonalTestimonials'))
    assert.match(page,/<ServicesIntroMedia/)
    assert.match(page,/<ServicesMethodVideos/)
    assert.doesNotMatch(page,/<ServicesSmartDiscovery|<ServiceCart/)
  }
  assert.match(directory,/<ServicesSmartDiscovery/)
  assert.match(directory,/<MarketplaceServiceFinder/)
  assert.match(directory,/createPractitionerRepository/)
  assert.match(ui,/rankDiscoveryServices/)
  assert.match(ui,/rankEditorialDiscovery/)
  assert.match(ui,/onClick=\{\(\)=>chooseCategory\(area\.key\)\}/)
  assert.match(ui,/maxLength=\{350\}/)
  assert.match(ui,/aria-live="polite"/)
  assert.match(ui,/consent:true/)
  assert.match(ui,/!aiAvailable \|\| !useExternalAi/)
  assert.match(ui,/No.*medical|not a diagnosis/i)
  assert.match(css,/@media\(max-width:620px\)/)
  assert.match(css,/\.quickFacets\{display:flex;flex-wrap:nowrap;/)
  assert.match(api,/HH_MARKETPLACE_AI_ENABLED/)
  assert.match(api,/EXPLICIT_AI_CONSENT_REQUIRED/)
  assert.match(api,/candidates\.has\(id\)/)
  assert.match(api,/MAX_ATTEMPTS_PER_WINDOW/)
  assert.doesNotMatch(api,/console\.log|analytics|saveGuestResult|logVisitorText/)
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
  assert.ok(ui.includes('href={"/"+(locale==="es"?"en":locale)+"/app/consultations?service="+encodeURIComponent(service.id)}'))
  assert.ok(ui.includes('El formulario de solicitud se abre en inglés; se conserva el servicio elegido.'))
  const requestLink='<TrackedServiceLink serviceId={service.id} event="order" href={"/"+(locale==="es"?"en":locale)+"/app/consultations?service="+encodeURIComponent(service.id)} aria-label={locale==="es"?"Solicitar este servicio (formulario en inglés)":undefined}>{t.order}</TrackedServiceLink>'
  const detailsToggle='<button type="button" className={styles.suggestionDetailsToggle}'
  const assertActionOrder=source=>{
    const requestIndex=source.indexOf(requestLink)
    const detailsIndex=source.indexOf(detailsToggle)
    assert.ok(detailsIndex>0 && requestIndex>detailsIndex,'Details must precede the tracked Order action, as approved by the owner')
  }
  assertActionOrder(ui)
  assert.throws(()=>assertActionOrder('<div>'+requestLink+detailsToggle+'>{t.details}</button></div>'))
  assert.throws(()=>assertActionOrder(ui.replace(requestLink,'')))
  assert.throws(()=>assertActionOrder(ui.replace(detailsToggle,'')))
  assert.ok(matcher.includes('safePublicWhatsAppPath(pagePath)'))
  assert.ok(!ui.includes('<Link key={item.id} href={item.href}>'),"No plain editorial link tiles should remain")
  assert.ok(!ui.includes('context:submitted'),"Personal search text must not be passed to messenger URL")
  assert.match(css,/\.suggestion\{\s*display:grid;\s*grid-template-columns:minmax\(0,1fr\) auto;/)
  assert.ok(css.includes('.suggestionGrid,.editorialList{display:grid;grid-template-columns:minmax(0,1fr);gap:9px}'))
  assert.ok(css.includes('.suggestionTop{grid-column:1/-1;grid-row:1;'))
  assert.ok(css.includes('.suggestionActions{grid-column:2;grid-row:2/5;'))
  assert.ok(css.includes('.results:focus-visible{outline:2px solid'))
  const mobile=mobileResultCss(css)
  assert.ok(mobile.includes('.suggestionGrid,.editorialList{grid-template-columns:minmax(0,1fr);gap:8px}'))
  assert.ok(mobile.includes('.suggestion{grid-template-columns:minmax(0,1fr) 100px;'))
  assert.ok(mobile.includes('.suggestionActions a{width:100%;min-height:44px;'))
  assert.ok(css.includes('@media(max-width:350px){'))
  assert.ok(css.includes('.suggestionActions{grid-column:1;grid-row:5;'))
  assert.doesNotMatch(css,/\.suggestionGrid,\.editorialList\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
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


test('mobile result requirements cannot be supplied by hero rules or other breakpoints',()=>{
  const marker='/* Results: one full-width horizontal service row, never narrow catalogue tiles. */'
  const rules=[
    '.suggestionGrid,.editorialList{grid-template-columns:minmax(0,1fr);gap:8px}',
    '.suggestion{grid-template-columns:minmax(0,1fr) 100px;column-gap:10px}',
    '.suggestionActions a{width:100%;min-height:44px;padding:7px 6px}',
  ]
  const requirements=[
    rules[0],
    '.suggestion{grid-template-columns:minmax(0,1fr) 100px;',
    '.suggestionActions a{width:100%;min-height:44px;',
  ]
  const decoys=[
    ['hero selectors',`@media(max-width:620px){
      .hero .suggestionGrid,.hero .editorialList{grid-template-columns:minmax(0,1fr);gap:8px}
      .hero .suggestion{grid-template-columns:minmax(0,1fr) 100px;column-gap:10px}
      .hero .suggestionActions a{width:100%;min-height:44px;padding:7px 6px}
    }`],
    ['other breakpoints',`@media(max-width:350px){${rules.join('\n')}}
      @media(max-width:767px){${rules.join('\n')}}`],
    ['later hero section',`/* Services first screen: unrelated hero rules. */
      @media(max-width:620px){${rules.join('\n')}}`],
  ]
  const complete=`${marker}\n@media (max-width: 620px){${rules.join('\n')}}`
  for(const requirement of requirements) assert.ok(mobileResultCss(complete).includes(requirement))
  for(const [index,requirement] of requirements.entries()){
    const remaining=rules.filter((_,ruleIndex)=>ruleIndex!==index).join('\n')
    for(const [name,decoy] of decoys){
      const mobile=mobileResultCss(`${marker}\n@media(max-width:620px){${remaining}}\n${decoy}`)
      assert.ok(!mobile.includes(requirement),`${name} must not satisfy missing requirement: ${requirement}`)
      for(const other of requirements.filter((_,otherIndex)=>otherIndex!==index)) assert.ok(mobile.includes(other))
    }
  }
})


test('Services first fold on mobile uses concise search copy, five action chips and safe 16px input',async()=>{
  const [ui,css]=await Promise.all([
    readFile(new URL('../components/services-smart-discovery.tsx',import.meta.url),'utf8'),
    readFile(new URL('../components/services-smart-discovery.module.css',import.meta.url),'utf8'),
  ])
  for(const marker of ['Find the right support','Подберите помощь под свой запрос','Encuentra el apoyo que buscas']) assert.ok(ui.includes(marker))
  assert.equal((ui.match(/quickExamples:\[/g)||[]).length,3)
  const samples=[...ui.matchAll(/exampleList:\[(.*?)\],/g)].map(match=>JSON.parse("["+match[1]+"]"))
  const chips=[...ui.matchAll(/quickExamples:\[(.*?)\],/g)].map(match=>JSON.parse("["+match[1]+"]"))
  const expectedAreas=['body_somatic','emotional_psychological','relationships','business_money','personal_development']
  assert.equal(samples.length,3)
  assert.deepEqual(chips,[["Body & Energy","Stress & Anxiety","Relationships","Business & Money","Goals, Meaning & Growth"],["Тело и энергия","Стресс и тревога","Отношения","Бизнес и деньги","Цели, смыслы и развитие"],["Cuerpo y energía","Estrés y ansiedad","Relaciones","Negocios y dinero","Metas, sentido y desarrollo"]])
  for(const [localeIndex,examples] of samples.entries()){
    assert.equal(examples.length,5,'each locale has exactly five searchable themes')
    assert.equal(chips[localeIndex].length,examples.length)
    for(const [themeIndex,query] of examples.entries()){
      const matchingAreas=classifyDiscoveryIntent(query).map(item=>item.key)
      assert.ok(matchingAreas.includes(expectedAreas[themeIndex]),`theme ${themeIndex+1} not matched: ${query}`)
    }
  }
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
  assert.match(mobile,/\.examples button:last-child\{grid-column:1\/-1;min-height:42px\}/)
  assert.match(mobile,/\.submit\{[^}]*min-height:44px/)
  assert.ok(mobile.includes('.exampleLong,.privacyFull{display:none}'))
})

test('compact discovery facets filter online, Toronto in-person, free and language',()=>{
  const base={ deliveryFormat:'online', locationLabel:'', languages:['en'],
    pricingMode:'fixed',confirmedPrice:100,currency:'EUR' };
  const defaults={format:'online',city:'toronto',language:'en',price:''};
  assert.equal(serviceMatchesDiscoveryFacets(base,defaults),true);
  assert.equal(serviceMatchesDiscoveryFacets({...base,deliveryFormat:'in_person',locationLabel:'Toronto, ON'},defaults),false);
  assert.equal(serviceMatchesDiscoveryFacets({...base,languages:['ru']},defaults),false);
  const toronto={...defaults,format:'in_person'};
  assert.equal(serviceMatchesDiscoveryFacets({...base,deliveryFormat:'in_person',locationLabel:'Toronto, ON'},toronto),true);
  assert.equal(serviceMatchesDiscoveryFacets({...base,deliveryFormat:'hybrid',locationLabel:'Toronto'},toronto),true);
  assert.equal(serviceMatchesDiscoveryFacets({...base,deliveryFormat:'in_person',locationLabel:'Ottawa'},toronto),false);
  assert.equal(serviceMatchesDiscoveryFacets({...base,deliveryFormat:'in_person',locationLabel:''},toronto),false);
  assert.equal(serviceMatchesDiscoveryFacets({...base,deliveryFormat:'in_person',locationLabel:'Ottawa'}, {...toronto,city:''}),true);
  assert.equal(serviceMatchesDiscoveryFacets({...base,pricingMode:'free',confirmedPrice:null,currency:'CAD'}, {...defaults,price:'free'}),true);
  assert.equal(serviceMatchesDiscoveryFacets({...base,confirmedPrice:0,currency:'CAD'}, {...defaults,price:'free'}),true);
  assert.equal(serviceMatchesDiscoveryFacets(base,{...defaults,price:'free'}),false);
  assert.equal(serviceMatchesDiscoveryFacets(base,{...defaults,price:'50'}),false);
  assert.equal(serviceMatchesDiscoveryFacets({...base,confirmedPrice:50},{...defaults,price:'50'}),true);
  assert.equal(serviceMatchesDiscoveryFacets({...base,confirmedPrice:10,currency:'CAD'}, {...defaults,price:'50'}),false);
});

test('mobile service filters stay on one row; format and page language have visible defaults',async()=>{
  const [ui,css]=await Promise.all([
    readFile(new URL('../components/services-smart-discovery.tsx',import.meta.url),'utf8'),
    readFile(new URL('../components/services-smart-discovery.module.css',import.meta.url),'utf8'),
  ]);
  assert.match(ui,/\[format,setFormat\] = useState\("online"\)/);
  assert.match(ui,/\[city,setCity\] = useState\("toronto"\)/);
  assert.match(ui,/\[language,setLanguage\] = useState<Locale \| "">\(locale\)/);
  assert.match(ui,/<option value="free">\{t\.free\}<\/option>/);
  assert.match(ui,/format==="in_person"&&<label>/);
  assert.match(ui,/<option value="toronto">Toronto<\/option>/);
  assert.match(css,/\.quickFacets\{display:flex;flex-wrap:nowrap;/);
  assert.match(css,/\.quickFacets\{gap:5px;margin:10px 0 7px\}/);
  assert.doesNotMatch(css,/\.quickFacets\{grid-template-columns:repeat\(2,/);
});
