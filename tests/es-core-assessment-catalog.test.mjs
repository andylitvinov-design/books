import test from 'node:test'
import assert from 'node:assert/strict'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { assessmentExplanation } from '../lib/assessments/assessment-methodology.js'

const CORE_EN_TITLES = [
  "Bach Flower Emotional Profile",
  "Current State Check",
  "Personality Baseline",
  "Weekly Psychic Health",
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
  assert.match(byTitle.get('Weekly Psychic Health')?.description?.es || '', /No es una evaluación clínica validada/i)
})

test('Spanish explorer resolves translated summary rather than EN fallback', () => {
  for (const entry of MONITORING_CATALOG.filter(item => item.description?.es)) {
    const explained = assessmentExplanation({ key: entry.key, catalog: entry, locale: 'es' })
    assert.equal(explained.summary, entry.description.es, entry.key)
    assert.ok(explained.originAndEvidence, `Missing methodology provenance: ${entry.key}`)
  }
  const weekly = MONITORING_CATALOG.find(item => item.title?.en === 'Weekly Psychic Health')
  assert.match(assessmentExplanation({ key: weekly.key, catalog: weekly, locale: 'es' }).summary, /Registro semanal original/i)
  assert.equal(assessmentExplanation({ key: weekly.key, catalog: weekly, locale: 'en' }).summary, weekly.description.en)
  assert.equal(assessmentExplanation({ key: weekly.key, catalog: weekly, locale: 'ru' }).summary, weekly.description.ru)
})
