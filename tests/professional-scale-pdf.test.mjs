import test from 'node:test'
import assert from 'node:assert/strict'
import { getProfessionalScaleResource, PROFESSIONAL_SCALE_RESOURCES } from '../data/assessments/professional-scale-resources-2026.js'
import { makeProfessionalScaleGuidePdf } from '../lib/assessments/professional-scale-guide-pdf.js'
import { buildExplorerEntries, filterExplorerEntries } from '../lib/assessments/test-explorer.js'
import { MIND_BODY_MONITOR_REGISTRY } from '../data/assessments/mind-body-monitor-registry.js'

test('research-only professional assessment catalog expands without granting online access', () => {
  for (const key of ['maia-2-37', 'bfne-12', 'fscrs-22', 'ras-7', 'cfq-7', 'mlq-10', 'sdi-2-14', 'gq-6', 'uwes-9', 'ffmq-15', 'fss-9']) {
    const row = MIND_BODY_MONITOR_REGISTRY.find((item) => item.key === key)
    assert.ok(row, key)
    assert.equal(row.enabled, false)
    assert.notEqual(row.rightsStatus, 'ready_public')
  }
})

test('professional PDF allowlist never generates original questionnaires for arbitrary keys', () => {
  assert.equal(getProfessionalScaleResource('totally-unknown-assessment'), null)
  assert.equal(getProfessionalScaleResource('__proto__'), null)
  assert.ok(Object.keys(PROFESSIONAL_SCALE_RESOURCES).length >= 25)
  const resource = getProfessionalScaleResource('mmpi-3')
  assert.equal(resource.downloadType, 'educational_scale_guide_only')
  assert.ok(resource.scales.includes('Validity and response style'))
})

test('PDF guide is a valid self-contained PDF without questionnaire questions', () => {
  const resource = getProfessionalScaleResource('maia-2-37')
  const pdf = makeProfessionalScaleGuidePdf(resource)
  assert.equal(pdf.subarray(0, 8).toString('ascii'), '%PDF-1.4')
  assert.ok(pdf.length > 1500)
  const text = pdf.toString('ascii')
  assert.match(text, /NOT a questionnaire/)
  assert.match(text, /Noticing/)
  assert.match(text, /Trusting/)
  assert.match(text, /xref\n0 /)
  assert.match(text, /%%EOF/)
  assert.doesNotMatch(text, /When I am tense I notice/)
})

test('gated guide entries are visible in PDF filter but cannot enter the test battery', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  const guide = entries.find((item) => item.key === 'bfne-12')
  assert.ok(guide)
  assert.equal(guide.selectable, false)
  assert.equal(guide.startable, false)
  assert.ok(guide.pdfResource)
  const pdfEntries = filterExplorerEntries(entries, { availability: 'pdf' })
  assert.ok(pdfEntries.length >= 25)
  assert.ok(pdfEntries.every((entry) => entry.pdfResource && !entry.selectable))
  assert.ok(pdfEntries.some((item) => item.key === 'bfne-12'))
  const available = filterExplorerEntries(entries, { availability: 'available' })
  assert.ok(available.every((entry) => entry.selectable))
  assert.ok(!available.some((item) => item.key === 'bfne-12'))
})

 test('Accepted canonical RAS reference remains unique and disabled while retaining its educational PDF', () => {
  assert.equal(MIND_BODY_MONITOR_REGISTRY.length, 168)
  assert.equal(new Set(MIND_BODY_MONITOR_REGISTRY.map(row => row.key)).size, 168)
  assert.deepEqual(MIND_BODY_MONITOR_REGISTRY.filter(row => row.key === 'ras-7'), [{
    key: 'ras-7', category: 'relationship_satisfaction', area: 'relationships', priority: 'A',
    instrument: 'Relationship Assessment Scale', acronym: 'RAS', items: 7, duration: '2 min',
    rightsStatus: 'rights_review', access: 'research', enabled: false,
    rightsNote: 'Only research metadata; verify permission before public self-administration.',
  }])
  assert.equal(getProfessionalScaleResource('ras-7').downloadType, 'educational_scale_guide_only')
  for (const audience of ['guest', 'account']) {
    const entries = buildExplorerEntries({ locale: 'en', audience })
    assert.equal(entries.length, 295)
    assert.equal(new Set(entries.map(row => row.key)).size, 295)
    const ras = entries.filter(row => row.key === 'ras-7')
    assert.equal(ras.length, 1)
    assert.equal(ras[0].selectable, false)
    assert.equal(ras[0].startable, false)
  }
})
