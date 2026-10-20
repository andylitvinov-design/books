import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildExplorerEntries, filterExplorerEntries } from '../lib/assessments/test-explorer.js'
import { TEST_KINDS, HOBBY_TEST_KEYS, testKindFor, testKindCardLabel, testKindShortLabel, auditTestKey } from '../lib/assessments/test-kinds.js'

const answersFor = (def, extreme) => Object.fromEntries(def.questions.map(q => [
  q.id, extreme === 'min' ? (q.min ?? def.answerScale?.min) : (q.max ?? def.answerScale?.max),
]))

test('every catalogue record has exactly one stable display kind; research stays non-runnable', () => {
  assert.deepEqual(TEST_KINDS.map(x => x.key), ['professional', 'monitoring', 'hobby'])
  const kinds = new Set(TEST_KINDS.map(x => x.key))
  for (const locale of ['en', 'ru']) {
    const entries = buildExplorerEntries({ locale, audience: 'account' })
    assert.equal(new Set(entries.map(e => e.key)).size, entries.length)
    for (const entry of entries) {
      assert.ok(kinds.has(entry.testKind), entry.key)
      assert.equal(entry.testKind, testKindFor(entry), entry.key)
      assert.ok(entry.keyAudit && entry.keyAudit.status, entry.key)
      if (entry.testKind === 'professional' && entry.source === 'product') {
        if (entry.catalog.registrationRequired && !entry.startable) {
          const prepared = getAssessmentDefinition(entry.key, entry.catalog.version, entry.catalog.instrumentLocale)
          assert.equal(entry.catalog.sourceUrl, prepared.source.url)
          assert.ok(entry.catalog.sourceUrl.startsWith('https://'))
          assert.equal(entry.definition, null)
          assert.equal(entry.selectable, false)
        } else assert.ok(entry.definition?.source?.url?.startsWith('https://'), entry.key + ': professional requires a named source')
      }
      if (entry.source === 'research') {
        assert.equal(entry.selectable, false)
        assert.equal(entry.keyAudit.status, 'reference')
      }
    }
    for (const key of HOBBY_TEST_KEYS) assert.equal(entries.find(e => e.key === key)?.testKind, 'hobby', key)
    assert.equal(entries.find(e => e.key === 'hh-current-state')?.testKind, 'monitoring')
    assert.equal(entries.find(e => e.key === 'phq-4')?.testKind, 'professional')
    assert.equal(entries.find(e => e.key === 'mini-ipip-20')?.testKind, 'professional')
  }
})

test('all active scoring keys match immutable registered versions and yield full EN/RU result sections', () => {
  const registered = new Set(ASSESSMENT_DEFINITIONS.map(def => def.key + '/' + def.version + '/' + def.instrumentLocale))
  const runnable = MONITORING_CATALOG.filter(item => item.startable)
  assert.equal(new Set(runnable.map(item => item.key)).size, runnable.length)
  assert.ok(runnable.length >= 109)
  for (const item of runnable) {
    for (const locale of (item.instrumentLocale === 'dynamic' ? ['en','ru'] : [item.instrumentLocale])) {
      const def = getAssessmentDefinition(item.key, item.version, locale)
      assert.ok(registered.has(def.key + '/' + def.version + '/' + def.instrumentLocale))
      const audit = auditTestKey({ catalog: item, definition: def })
      assert.equal(audit.status, 'ready', item.key + '/' + locale + ': ' + audit.status)
      assert.ok(def.translationVersion && def.contentHash?.startsWith('sha256:'), item.key)
      for (const extreme of ['min', 'max']) {
        const scored = scoreAssessment(def, answersFor(def, extreme), syntheticTraumaContext(def))
        assert.ok(scored.dimensions.length > 0, item.key)
        for (const language of ['en', 'ru']) {
          const report = buildAssessmentResultReport(scored, language)
          assert.equal(report.sections.length, scored.dimensions.length, item.key + '/' + language)
          assert.ok(report.sections.every(s => s.meaning?.length > 40 && s.followUp?.length > 20 && (def.administration ? s.steps?.length === 0 : s.steps?.length >= 2)), item.key + '/' + language)
        }
      }
    }
  }
})

test('type checkboxes filter by OR, combine with other criteria and preserve manually selected tests', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'account' })
  const available = filterExplorerEntries(entries, { availability: 'available' })
  for (const kind of TEST_KINDS.map(x => x.key)) {
    const filtered = filterExplorerEntries(entries, { availability: 'available', kinds: [kind] })
    assert.ok(filtered.length > 0, kind)
    assert.ok(filtered.every(e => e.testKind === kind), kind)
  }
  const combined = filterExplorerEntries(entries, { availability: 'available', kinds: ['hobby','professional'] })
  assert.ok(combined.length > 0 && combined.length <= available.length)
  assert.ok(combined.every(e => ['hobby','professional'].includes(e.testKind)))
  const professionalShort = filterExplorerEntries(entries, { availability: 'available', kinds:['professional'], lengths:['short'] })
  assert.ok(professionalShort.every(e => e.testKind === 'professional' && e.testLength === 'short'))
  const preserved = filterExplorerEntries(entries, { availability: 'available', kinds:['hobby'], selectedKeys:['phq-4'] })
  assert.ok(preserved.some(e => e.key === 'phq-4'), 'selected test must remain visible even when its type is filtered out')
  assert.ok(filterExplorerEntries(entries,{ availability:'available', kinds:['unknown-kind'] }).length === available.length,
    'unknown type values must not hide all tests')
})

test('public and full explorer expose actual checkboxes and type icon labels', async () => {
  const [simple, full, intent] = await Promise.all([
    readFile(new URL('../components/app/simple-test-picker.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/app/test-explorer.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../lib/app/test-selection-intent.js', import.meta.url), 'utf8'),
  ])
  assert.match(simple, /data-test-kind-checkbox/)
  assert.match(full, /data-test-kind-checkbox/)
  assert.match(simple, /data-test-kind-badge/)
  assert.match(full, /data-test-kind-badge/)
  assert.match(intent, /kinds: TEST_KINDS\.map/)
  assert.match(intent, /'kinds'/)
})


// ASRS is a discrete source-pinned screening count, not a generic sum or course goal.
test('ASRS6 EN/RU versions are source-documented and supported by the key audit', () => {
  const catalog = MONITORING_CATALOG.find(item => item.key === 'asrs-6')
  assert.ok(catalog?.startable)
  for (const locale of ['en', 'ru']) {
    const definition = getAssessmentDefinition('asrs-6', 'v1', locale)
    assert.equal(testKindFor({ key: catalog.key, source: 'product', catalog, definition }), 'professional')
    assert.deepEqual(auditTestKey({ catalog, definition }), {
      status: 'ready', basis: 'source_documented', scorer: 'asrs-v1-6-classic:v1', reportReady: true,
    })
    const unsupported = { ...definition, scoringVersion: 'unsupported-test-version' }
    assert.equal(auditTestKey({ catalog, definition: unsupported }).status, 'key_review')
  }
})


test('test-kind checkboxes belong inside detailed selection, not the initial screen', async () => {
  const [simple, full] = await Promise.all([
    readFile(new URL('../components/app/simple-test-picker.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/app/test-explorer.jsx', import.meta.url), 'utf8'),
  ])
  const disclosure = simple.indexOf('<details className={styles.advanced} id="hh-more-test-filters">')
  const endDisclosure = simple.indexOf('</details>', disclosure)
  const typeChoices = simple.indexOf('<fieldset className={styles.kindFilters}')
  assert.ok(disclosure >= 0 && typeChoices > disclosure && typeChoices < endDisclosure)
  assert.equal((simple.match(/data-test-kind-filter/g) || []).length, 1)
  const quickStart = full.indexOf('<div className={styles.quickFilters}')
  const quickEnd = full.indexOf('<div className={styles.quickDiscoveryFooter}', quickStart)
  assert.ok(quickStart >= 0 && quickEnd > quickStart)
  assert.doesNotMatch(full.slice(quickStart, quickEnd), /KindCheckboxFilters|Только профессиональные|Professional only/)
  assert.match(full, /activeFilterGroup === 'format'[\s\S]*?<KindCheckboxFilters/)
})

test('author questionnaire cards do not repeat long evidence wording', async () => {
  const [methodology, simple, full] = await Promise.all([
    readFile(new URL('../lib/assessments/assessment-methodology.js', import.meta.url), 'utf8'),
    readFile(new URL('../components/app/simple-test-picker.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/app/test-explorer.jsx', import.meta.url), 'utf8'),
  ])
  assert.doesNotMatch(methodology, /Авторский образовательный опросник Holistic House \(2026\)/)
  assert.match(methodology, /Авторская шкала для самонаблюдения[^']+Независимая психометрическая валидизация этой версии не подтверждена/)
  for (const file of [simple, full]) assert.match(file, /entry\.methodologyStatus !== 'original'/)
})

test('public client and explorer guard against mobile horizontal overflow', async () => {
  const [globalCss, simpleCss, fullCss] = await Promise.all([
    readFile(new URL('../app/globals.css', import.meta.url), 'utf8'),
    readFile(new URL('../components/app/simple-test-picker.module.css', import.meta.url), 'utf8'),
    readFile(new URL('../components/app/test-explorer.module.css', import.meta.url), 'utf8'),
  ])
  assert.match(globalCss, /\.client-entry-shell\s*\{[^}]*overflow-x:\s*clip/s)
  assert.match(simpleCss, /\.shell\s*\{[^}]*overflow-x:\s*clip/s)
  assert.match(fullCss, /\.explorer\s*\{[^}]*overflow-x:\s*clip/s)
  assert.match(fullCss, /\.explorer \.scaleRail, \.explorer \.quickFilterChips, \.explorer \.quickFilterExtras/)
})


test('type badges distinguish documented sources, HH-authored check-ins and exploratory tests without validation claims', () => {
  const professional = { key: 'phq-4', testKind: 'professional' }
  const authored = { key: 'hh-current-state', testKind: 'monitoring' }
  const monitoring = { key: 'other-state-check', testKind: 'monitoring' }
  const hobby = { key: 'hh-bach-flower-profile', testKind: 'hobby' }
  for (const [language, labels] of Object.entries({
    en: ['Source-backed method', 'Holistic House check-in', 'State questionnaire', 'Self-discovery'],
    ru: ['Методика с источником', 'Авторский опросник', 'Опросник состояния', 'Самопознание'],
    es: ['Método con fuente', 'Cuestionario de Holistic House', 'Cuestionario de estado', 'Autoconocimiento'],
  })) {
    assert.deepEqual([professional, authored, monitoring, hobby].map((entry) => testKindCardLabel(entry, language)), labels)
  }
  assert.equal(testKindCardLabel({testKind: 'unknown', key: 'unknown'}, 'en'), null)
  assert.equal(testKindCardLabel(null, 'ru'), null)
  assert.equal(testKindCardLabel(professional, 'xx'), 'Source-backed method')
  const available = buildExplorerEntries({ locale: 'en' }).filter((item) => item.selectable)
  assert.ok(available.length > 30)
  for (const entry of available) {
    assert.ok(testKindCardLabel(entry, 'en'), entry.key)
    assert.ok(testKindCardLabel(entry, 'ru'), entry.key)
  }
})

test('four public shortcuts sync with the real kind facet and small card badges', async () => {
  const [simple, full, css] = await Promise.all([
    readFile(new URL('../components/app/simple-test-picker.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/app/test-explorer.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/app/simple-test-picker.module.css', import.meta.url), 'utf8'),
  ])
  const tabBlock = simple.slice(simple.indexOf('const BROWSE_TABS'), simple.indexOf('// Always display the explicit assessment type'))
  assert.deepEqual([...tabBlock.matchAll(/\{ key: '(all|monitoring|professional|hobby)'/g)].map((match) => match[1]),
    ['all', 'monitoring', 'professional', 'hobby'])
  assert.doesNotMatch(tabBlock, /Best fit|Personality|Relationships|Stress/)
  assert.match(simple, /onSelectTestKind\?\.\(tab\.key === 'all' \? null : tab\.key\)/)
  assert.match(full, /onSelectTestKind=\{\(kind\) => setKinds\(kind \? \[kind\] : \[\]\)\}/)
  assert.match(simple, /aria-pressed=\{browseTab === tab\.key\}/)
  assert.match(simple, /testKindShortLabel\(entry, locale\)/)
  assert.match(full, /testKindShortLabel\(entry, locale\)/)
  assert.match(css, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\) 36px/)
  const translations = {
    en: ['Check-in', 'Source', 'Hobby'],
    ru: ['Чек-ин', 'Источник', 'Хобби'],
    es: ['Chequeo', 'Fuente', 'Hobby'],
  }
  for (const [locale, labels] of Object.entries(translations)) {
    assert.deepEqual(['monitoring','professional','hobby'].map((testKind) =>
      testKindShortLabel({ testKind }, locale)), labels)
  }
  assert.equal(testKindShortLabel({ testKind: 'unknown' }, 'en'), null)
  const entries = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  for (const kind of ['monitoring','professional','hobby']) {
    const filtered = filterExplorerEntries(entries, { availability: 'available', kinds: [kind] })
    assert.ok(filtered.length > 0, kind)
    assert.ok(filtered.every((entry) => entry.testKind === kind), kind)
  }
})

test('published-source filter names disclose provenance without claiming a validated diagnosis', () => {
  const sourced = TEST_KINDS.find(kind => kind.key === 'professional')
  assert.ok(sourced)
  for (const locale of ['en','ru','es']) {
    assert.ok(sourced.label[locale])
    assert.doesNotMatch(sourced.label[locale], /clinically validated|diagnostic|сертифиц|diagnóstico/i)
    assert.ok(testKindShortLabel({ testKind: 'professional' }, locale))
  }
  assert.equal(sourced.label.ru, 'Методики с источником')
  assert.equal(testKindShortLabel({ testKind: 'professional' }, 'ru'), 'Источник')
})
