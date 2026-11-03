import test from 'node:test'
import assert from 'node:assert/strict'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { assessmentExplanation } from '../lib/assessments/assessment-methodology.js'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'
import { readFileSync } from 'node:fs'

const CORE_EN_TITLES = [
  "Bach Flower Emotional Profile",
  "Current State Check",
  "Personality Baseline",
  "Weekly Wellbeing Check-in",
  "Mood & Anxiety — 1 Minute",
  "Mental Load",
  "Mood Deep Dive",
  "Anxiety Deep Dive",
  "Resources & Inner Support",
  "Monthly Life Profile",
  "Social Support Profile",
  "Daily Functioning"
]

test('Spanish public Test Explorer has native metadata for the 12 core assessments', () => {
  const byTitle = new Map(MONITORING_CATALOG.map(entry => [entry.title?.en, entry]))
  for (const title of CORE_EN_TITLES) {
    const entry = byTitle.get(title)
    assert.ok(entry, `Missing core assessment: ${title}`)
    assert.ok(entry.title?.es?.trim(), `Missing ES title: ${title}`)
    assert.ok(entry.description?.es?.trim(), `Missing ES summary: ${title}`)
    assert.notEqual(entry.description.es, entry.description.en, title)
  }
})

test('Spanish descriptions distinguish original EN questionnaires and unvalidated adaptations', () => {
  const byTitle = new Map(MONITORING_CATALOG.map(entry => [entry.title?.en, entry]))
  for (const name of ['Personality Baseline', 'Mood & Anxiety — 1 Minute', 'Mental Load', 'Mood Deep Dive', 'Social Support Profile']) {
    assert.match(byTitle.get(name)?.description?.es || '', /inglés/i, name)
  }
  assert.match(byTitle.get('Anxiety Deep Dive')?.description?.es || '', /sin validación psicométrica independiente/i)
  assert.match(byTitle.get('Weekly Wellbeing Check-in')?.description?.es || '', /No es una evaluación clínica validada/i)
})

test('Spanish explorer resolves translated summary rather than EN fallback', () => {
  for (const entry of MONITORING_CATALOG.filter(item => item.description?.es)) {
    const explained = assessmentExplanation({ key: entry.key, catalog: entry, locale: 'es' })
    assert.equal(explained.summary, entry.description.es, entry.key)
    assert.ok(explained.originAndEvidence, `Missing methodology provenance: ${entry.key}`)
  }
  const weekly = MONITORING_CATALOG.find(item => item.title?.en === 'Weekly Wellbeing Check-in')
  assert.match(assessmentExplanation({ key: weekly.key, catalog: weekly, locale: 'es' }).summary, /Registro semanal original/i)
  assert.equal(assessmentExplanation({ key: weekly.key, catalog: weekly, locale: 'en' }).summary, weekly.description.en)
  assert.equal(assessmentExplanation({ key: weekly.key, catalog: weekly, locale: 'ru' }).summary, weekly.description.ru)
})

test('actual TestExplorer passes Spanish locale to discovery without falling back to English', () => {
  const source = readFileSync(new URL('../components/app/test-explorer.jsx', import.meta.url), 'utf8')
  assert.match(source, /buildExplorerEntries\(\{\s*locale,\s*audience\s*\}\)/)
  assert.doesNotMatch(source, /locale:\s*locale\s*===\s*['\"]es['\"]\s*\?\s*['\"]en['\"]/, 'Spanish UI must not silently become English')
  const spanish = buildExplorerEntries({ locale: 'es', audience: 'guest' })
  const english = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  const russian = buildExplorerEntries({ locale: 'ru', audience: 'guest' })
  const week = spanish.find(entry => entry.title === 'Bienestar de la semana')
  assert.ok(week, 'Expected Spanish weekly test title')
  assert.match(week.description, /Registro semanal original/)
  assert.ok(week.definition, 'Spanish public UI must preserve the available verified-language source definition')
  assert.equal(week.definition.instrumentLocale, 'en', 'The Spanish display must not fabricate Spanish test questions')
  assert.equal(english.find(entry => entry.key === week.key)?.title, 'Weekly Wellbeing Check-in')
  assert.equal(russian.find(entry => entry.key === week.key)?.title, 'Самочувствие за неделю')
  assert.equal(english.find(entry => entry.key === week.key)?.description, week.catalog.description.en)
  assert.equal(russian.find(entry => entry.key === week.key)?.description, week.catalog.description.ru)
})
