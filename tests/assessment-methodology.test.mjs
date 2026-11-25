import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { MIND_BODY_MONITOR_REGISTRY } from '../data/assessments/mind-body-monitor-registry.js'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { assessmentExplanation, assessmentMethodology } from '../lib/assessments/assessment-methodology.js'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'

const active = MONITORING_CATALOG.filter(item => item.startable && item.rightsStatus === 'cleared')
const registry = new Map(MIND_BODY_MONITOR_REGISTRY.map(item => [item.key, item]))
const defFor = (item, locale) => getAssessmentDefinition(item.key,item.version,item.instrumentLocale === 'dynamic' ? locale : item.instrumentLocale)
const allAnswers = d => Object.fromEntries(d.questions.map(q=>[q.id,q.min??d.answerScale?.min??0]))

test('every active test has a bilingual short purpose/origin/evidence paragraph without changing scoring hashes',()=>{
  // New source-cleared scales are additive; coverage must not freeze at the
  // previous 145-source snapshot or silently omit the five new 2026 forms.
  assert.ok(active.length>=150)
  for(const locale of ['en','ru']){
    for(const item of active){
      const def=defFor(item,item.instrumentLocale==='dynamic'?locale:'en')
      const before=def.contentHash
      const about=assessmentExplanation({key:item.key,catalog:item,definition:def,research:registry.get(item.key),locale})
      assert.ok(about.summary?.length>12,item.key+':'+locale+' description')
      assert.ok(about.originAndEvidence?.length>65,item.key+':'+locale+' evidence')
      assert.ok(about.paragraph.includes(about.summary))
      assert.ok(about.paragraph.includes(about.originAndEvidence))
      assert.ok(['screen','research','traits','original','bach','typology'].includes(about.status),item.key+':'+about.status)
      assert.equal(def.contentHash,before,'Metadata must not rewrite immutable scored instrument content')
      if(item.key.startsWith('hh-'))assert.ok(['original','bach','typology'].includes(about.status),item.key)
      if(item.testStyle==='professional'){
        assert.ok(['screen','research','traits'].includes(about.status),item.key)
        assert.doesNotMatch(about.originAndEvidence,/original holistic house educational reflection/i)
      }
      const scored=scoreAssessment(def,allAnswers(def), syntheticTraumaContext(def))
      const report=buildAssessmentResultReport(scored,locale)
      assert.ok(report.methodology?.length>65,item.key+':'+locale+' report')
      assert.equal(report.methodology,assessmentMethodology({key:item.key,catalog:item,locale}).text)
    }
  }
})

test('MHC-SF explanation preserves accepted source, language and non-diagnostic limits',()=>{
  const catalog=active.find(x=>x.key==='mhc-sf')
  const definition=defFor(catalog,'en')
  for(const locale of ['en','ru']){
    const about=assessmentMethodology({key:'mhc-sf',catalog,definition,locale})
    assert.equal(about.status,'research')
    assert.equal(about.sourceUrl,definition.source.url)
    assert.match(about.text,/Corey L\. M\. Keyes/)
    assert.match(about.text,/2011/)
    assert.match(about.text,locale==='ru'?/не является валидированным переводом/:/not a validated questionnaire translation/)
    assert.match(about.text,locale==='ru'?/не исключает психическое расстройство/:/does not rule out mental illness/)
  }
})

test('all 168 research-only references have concise bilingual field, verified rights and no public start',()=>{
  assert.equal(MIND_BODY_MONITOR_REGISTRY.length,168)
  const unique=new Set(MIND_BODY_MONITOR_REGISTRY.map(x=>x.key))
  assert.equal(unique.size,168)
  for(const locale of ['en','ru']){
    const entries=buildExplorerEntries({locale,audience:'guest'})
    for(const row of MIND_BODY_MONITOR_REGISTRY){
      const view=entries.find(e=>e.key===row.key)
      assert.ok(view,row.key)
      assert.ok(view.methodology?.length>65,row.key+' origin')
      if(view.source==='research'){
        assert.equal(view.selectable,false)
        const about=assessmentExplanation({key:row.key,research:row,locale})
        assert.equal(view.methodology,about.originAndEvidence)
        if(row.rightsStatus==='licensed_only'||row.rightsStatus==='clinician_only')
          assert.equal(about.status,'research')
      }
      if(row.rightsStatus==='clinician_only'&&view.catalog===null)assert.equal(view.definition,null)
    }
  }
})

test('MMPI remains professional licensed, while IPIP and original typology have explicitly different evidence levels',()=>{
  const mmpi=assessmentMethodology({key:'mmpi-3',research:registry.get('mmpi-3'),locale:'ru'})
  assert.match(mmpi.text,/квалификация|квалификации/)
  assert.match(mmpi.text,/здесь вопросы не публикуются/)
  const en=active.find(x=>x.key==='ipip-big-five-50')
  const ipip=assessmentMethodology({key:en.key,catalog:en,definition:defFor(en,'en'),locale:'en'})
  assert.equal(ipip.status,'traits')
  assert.match(ipip.text,/International Personality Item Pool/)
  const soc=active.find(x=>x.key==='hh-socionics-32')
  const socAbout=assessmentMethodology({key:soc.key,catalog:soc,locale:'ru'})
  assert.equal(socAbout.status,'typology')
  assert.match(socAbout.text,/научная обоснованность|валидированный/i)
  const bach=active.find(x=>x.key==='hh-bach-flower-profile')
  const b=assessmentMethodology({key:bach.key,catalog:bach,locale:'ru'})
  assert.equal(b.status,'bach')
  assert.match(b.text,/не является валидированным/i)
})

test('purpose/origin/evidence explanations render in public explorer, prelogin selector, account tests, Insights and PDF',async()=>{
  const paths=[
    'lib/assessments/test-explorer.js',
    'components/app/test-explorer.jsx',
    'components/app/simple-test-picker.jsx',
    'components/app/app-workspace.jsx',
    'components/app/account-test-battery.jsx',
    'components/app/compact-assessment-report.jsx',
    'lib/profile/client-report-pdf.js',
  ]
  const [logic,explorer,picker,workspace,savedBattery,report,pdf]=await Promise.all(paths.map(x=>readFile(x,'utf8')))
  assert.match(logic,/assessmentExplanation/)
  assert.match(explorer,/entry\.methodology/)
  assert.match(picker,/entry\.methodology/)
  assert.match(workspace,/assessmentMethodology/)
  assert.match(savedBattery,/assessmentMethodology/)
  assert.match(savedBattery,/row\.methodology/)
  assert.match(report,/report\.methodology/)
  assert.match(pdf,/test\.interpretation\?\.methodology/)
  for(const file of [explorer,picker,workspace,report])assert.doesNotMatch(file,/consultancyScore\s*=|diagnosis\s*=\s*true/i)
})
