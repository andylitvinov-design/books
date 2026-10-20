import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { RESEARCH_CATALOGUE, RESEARCH_CATALOGUE_TOTAL, searchResearchCatalogue } from '../lib/assessments/research-directory-2026.js'
import { calculatePsychometricGrade, assessmentValidity, auditAssessmentCatalog, compareAssessmentValidity, VALIDATION_IMPROVEMENT_PROTOCOL } from '../lib/assessments/psychometric-validity-2026.js'
import { officialQuestionnaireSource } from '../data/assessments/official-questionnaire-sources-2026.js'
import { buildExplorerEntries, rankExplorerEntries } from '../lib/assessments/test-explorer.js'

test('entire research master becomes discoverable metadata with no key duplicates, executable tests or protected score keys',()=>{
  assert.equal(RESEARCH_CATALOGUE_TOTAL,2978)
  assert.equal(new Set(RESEARCH_CATALOGUE.map(r=>r.key)).size,2978)
  assert.ok(RESEARCH_CATALOGUE.every(r=>r.access==='research_only'&&!r.commercialDigitalRightsCleared))
  assert.ok(RESEARCH_CATALOGUE.every(r=>r.psychometricStatus==='pending_exact_edition_review'))
  assert.ok(RESEARCH_CATALOGUE.every(r=>!('questions' in r)&&!('scoring' in r)&&!('norms' in r)))
  const page=searchResearchCatalogue({page:1,pageSize:12})
  assert.ok(page.total>2500)
  assert.equal(page.sourceCount,2978)
  assert.equal(page.results.length,12)
  assert.equal(new Set(page.results.map(r=>r.key)).size,12)
  const last=searchResearchCatalogue({page:100000})
  assert.ok(last.results.length>0&&last.results.length<=12)
  assert.equal(last.page,last.pages)
})
test('cycle168 contains five distinct research-only editions without activating observer coding or unknown-item forms',()=>{
  const keys=['pnep-dandachifitzgerald2024-nlcohort69','g3rs-baldwin2026-enca-observer-v1','batq-bolter1987-joseph2026-global19','sstms-joseph2026-global-formpending','cose-tr-karairmak2018-trtr27']
  for(const key of keys){
    const entry=RESEARCH_CATALOGUE.find(row=>row.key===key)
    assert.ok(entry,key+' must be present in the source directory')
    assert.equal(entry.access,'research_only')
    assert.equal(entry.rightsStatus,'permission_required')
    assert.equal(entry.commercialDigitalRightsCleared,false)
    assert.equal(entry.psychometricStatus,'pending_exact_edition_review')
  }
  assert.match(RESEARCH_CATALOGUE.find(row=>row.key===keys[1]).itemCount,/not a self-report/i)
  assert.match(RESEARCH_CATALOGUE.find(row=>row.key===keys[3]).itemCount,/pending/i)
  assert.match(RESEARCH_CATALOGUE.find(row=>row.key===keys[4]).itemCount,/27/)
})

test('lookup filters research scales and titles while keeping output within strict page sizes',()=>{
  const found=searchResearchCatalogue({q:'Stress Mindset',pageSize:24})
  assert.ok(found.total>=3)
  assert.ok(found.results.every(r=>/Stress Mindset/i.test(r.title)||/Stress Mindset/i.test(r.measuredDomains)))
  assert.equal(searchResearchCatalogue({q:'xxxxx-no-such-psychometric-scale'}).total,0)
  assert.equal(searchResearchCatalogue({pageSize:5000}).pageSize,24)
  assert.ok(searchResearchCatalogue({q:'CISS'}).total>0)
})
test('English Russian Spanish terms find the same actual research concepts without implying translated validation',()=>{
  for (const [en,ru,es] of [
    ['anxiety','тревога','ansiedad'],
    ['stress','стресс','estrés'],
    ['depression','депрессия','depresión'],
    ['attachment','привязанность','apego'],
    ['burnout','выгорание','agotamiento'],
  ]) {
    const baseline=searchResearchCatalogue({q:en,pageSize:24})
    assert.ok(baseline.total>0, en+' needs actual indexed source entries')
    for(const localized of [ru,es]){
      const translated=searchResearchCatalogue({q:localized,pageSize:24})
      assert.equal(translated.total,baseline.total,localized+' must match source language equivalent')
      assert.deepEqual(translated.results.map(x=>x.key),baseline.results.map(x=>x.key))
      assert.ok(translated.results.every(x=>x.access==='research_only'&&!x.commercialDigitalRightsCleared))
    }
  }
  const combo=searchResearchCatalogue({q:'тревога дети'})
  assert.equal(combo.total,searchResearchCatalogue({q:'anxiety child'}).total,
    'translated query words should retain AND semantics')
  assert.equal(searchResearchCatalogue({q:'неизвестнаяметодиканетакой'}).total,0,
    'unknown terms must not resolve to unrestricted listings')
})
test('a DOI or publisher link is not independent psychometric validation and gives no ranking boost',()=>{
  const phq={key:'phq-9',version:'v1',instrumentLocale:'en',testStyle:'professional',rightsStatus:'cleared'}
  const entry=assessmentValidity(phq,{locale:'en'})
  assert.equal(entry.status,'source_documented')
  assert.equal(entry.grade,null)
  assert.equal(entry.priority,0)
  const linkOnly=assessmentValidity({key:'unreviewed-example',version:'v1',instrumentLocale:'en',testStyle:'professional'},{
    locale:'en',sourceUrl:'https://example.org/journal-paper',
  })
  assert.equal(linkOnly.status,'source_documented')
  assert.equal(linkOnly.priority,0)
  assert.equal(linkOnly.languageVerified,false)
  assert.equal(linkOnly.itemScoringVerified,false)
})

test('all runnable instruments receive evidence audit; unvalidated originals are never promoted to clinical grade',()=>{
  for(const locale of ['en','ru']){
    const audit=auditAssessmentCatalog(MONITORING_CATALOG,{locale})
    assert.equal(audit.total,MONITORING_CATALOG.length)
    assert.equal(audit.rows.length,audit.total)
    for(const row of audit.rows){assert.ok(row.key&&row.level&&Array.isArray(row.gaps))}
    assert.equal(audit.graded,0,'A published source is not a reviewed validity grade')
  }
  const custom=MONITORING_CATALOG.find(r=>r.key==='hh-current-state')
  assert.equal(assessmentValidity(custom,{locale:'en'}).status,'development')
  assert.equal(assessmentValidity(custom,{locale:'en'}).grade,null)
  const original=MONITORING_CATALOG.find(r=>r.key==='mini-ipip-20')
  assert.equal(assessmentValidity(original,{locale:'ru'}).respondentLocale,'en')
})
test('grade requires study-linked exact edition, language, population, independent review and every rated domain',()=>{
  assert.equal(calculatePsychometricGrade({}),null)
  const review={exactEdition:true,respondentLanguageVerified:true,populationDocumented:true,independentReview:true,primarySourceUrl:'https://example.org/study',ratings:{
    contentValidity:2,structuralValidity:2,internalConsistency:2,constructValidity:2,reliability:2,crossCulturalValidity:2,responsiveness:2,scoringAndInterpretation:2
  }}
  assert.deepEqual(calculatePsychometricGrade(review),{score:100,grade:'A',coverage:1})
  assert.equal(calculatePsychometricGrade({...review,respondentLanguageVerified:false}),null)
  assert.equal(calculatePsychometricGrade({...review,ratings:{...review.ratings,constructValidity:null}}),null)
  assert.ok(compareAssessmentValidity({validity:{priority:5}},{validity:{priority:2}})<0)
  assert.equal(VALIDATION_IMPROVEMENT_PROTOCOL.length,8)
})
test('owner-hosted questionnaire source is a hyperlink, not a legal grant or public runnable test',()=>{
  const maia=officialQuestionnaireSource({key:'maia-2-37',rightsStatus:'permission_required'})
  assert.equal(maia.directPdf,true)
  assert.equal(maia.linkOnly,true)
  assert.equal(maia.commercialDigitalRightsCleared,false)
  assert.equal(officialQuestionnaireSource({key:'mmpi-3',rightsStatus:'licensed_only'}),null)
  assert.equal(officialQuestionnaireSource({key:'pcl-5',rightsStatus:'managed_safety_only'}),null)
  assert.equal(officialQuestionnaireSource({key:'unreviewed-file',rightsStatus:'permission_required'}),null)
})
test('research explorer does not unlock new questionnaire items; site displays cautious validity labels',async()=>{
  const entries=buildExplorerEntries({locale:'en',audience:'guest'})
  assert.ok(entries.length>200)
  const research=entries.filter(r=>r.source==='research')
  assert.ok(research.length>0)
  assert.ok(research.every(r=>!r.selectable&&!r.startable&&!r.definition))
  assert.ok(entries.every(r=>r.validity&&r.validity.key))
  const ranked=rankExplorerEntries(entries,{focus:['stress']})
  assert.equal(new Set(ranked.map(e=>e.key)).size,entries.length)
  const [explorer,reference,route]=await Promise.all([
    readFile(new URL('../components/app/test-explorer.jsx',import.meta.url),'utf8'),
    readFile(new URL('../components/app/research-directory.jsx',import.meta.url),'utf8'),
    readFile(new URL('../app/api/assessments/research-directory/route.js',import.meta.url),'utf8'),
  ])
  assert.match(explorer,/data-psychometric-evidence/)
  assert.match(explorer,/data-official-original-source/)
  assert.match(explorer,/ResearchDirectory locale=\{locale\} search=\{query\}/)
  assert.match(explorer,/RESEARCH_COUNT_COPY/)
  assert.match(explorer,/coreMatching/)
  assert.match(explorer,/coreEmpty/)
  assert.match(reference,/data-research-directory/)
  assert.match(route,/searchResearchCatalogue/)
  assert.doesNotMatch(reference,/download=\{.*item\.key|startable\s*:\s*true/i)
})
