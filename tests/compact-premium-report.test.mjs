import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { extractReportProgress, resolveReportProgress } from '../lib/documents/report-progress.js'
import { createRequire } from 'node:module'
import { reportPdfFilename } from '../lib/documents/report-filename.js'
import { getOwnerReportTextTemplate } from '../lib/consultations/owner-report-template.js'
import { remedyDescriptionBlocks } from '../lib/documents/report-appendices.js'
import { getRemedy } from '../data/remedies.js'
import { buildPrescriptionPdf, buildPaymentPdf } from '../lib/prescriptions/pdf.js'

const { parse } = createRequire(import.meta.url)('next/dist/compiled/babel/parser')
function reportProgressBinding(source) {
  const tree = parse(source, { sourceType: 'module', plugins: ['jsx'] })
  const imported = tree.program.body.find(node => node.type === 'ImportDeclaration' && node.source.value === '@/lib/documents/report-progress')
  assert.ok(imported?.specifiers.some(node => node.imported?.name === 'resolveReportProgress' && node.local.name === 'resolveReportProgress'), 'use the shared structured-first resolver')
  const component = tree.program.body.find(node => node.type === 'ExportNamedDeclaration' && node.declaration?.id?.name === 'PrescriptionDocument')?.declaration
  assert.ok(component?.body?.body, 'the actual document component must exist')
  const bindings = component.body.body.flatMap(node => node.type === 'VariableDeclaration' ? node.declarations : []).filter(node => node.id.name === 'progress')
  assert.equal(bindings.length, 1, 'one actual document progress binding')
  const expression = bindings[0].init
  assert.equal(expression?.type, 'CallExpression')
  assert.equal(expression.callee.name, 'resolveReportProgress')
  assert.deepEqual(expression.arguments.map(node => node.type === 'Identifier' ? node.name : null), ['document'], 'preserve structured scores, clear state and legacy narrative together')
  return new Function('document', 'resolveReportProgress', `return (${source.slice(expression.start, expression.end)})`)
}

test('only explicit start/end self-ratings create two measured values', () => {
  for (const locale of ['en', 'ru']) {
    assert.deepEqual(extractReportProgress(getOwnerReportTextTemplate(locale).analysis),
      { before: 3, after: 6 })
  }
  assert.equal(extractReportProgress('Interest in goal: 3/10. Next week: 6/10.'), null)
  assert.equal(extractReportProgress('After the session: engagement 6/10.'), null)
  assert.equal(extractReportProgress('Before the session: engagement 11/10.\nAfter the session: 6/10'), null)
  assert.deepEqual(extractReportProgress('Before the session: 3/10\nAfter the session: 5/10'),
    { before: 3, after: 5 })
})

test('compact PDF draws only start/end and preserves the complete authored analysis', () => {
  const template = getOwnerReportTextTemplate('en')
  const document = {
    patientName: 'SYNTHETIC PDF TEST',
    dateIssued: '2026-10-13',
    recommendationType: 'homeopathy',
    analysis: template.analysis,
    additionalNotes: template.additionalNotes,
    items: [{ displayName: 'Synthetic remedy', itemType: 'homeopathy' }],
  }
  const pdf = buildPrescriptionPdf(document, 'en', 'https://example.test')
  const source = pdf.toString('latin1')
  assert.match(source, /164 788 Tm/, 'restored premium practitioner masthead anchors editorial cover')
  assert.match(source, /\(SELF-RATED PROGRESS\)/)
  assert.match(source, /\(START\)/)
  assert.match(source, /\(END\)/)
  assert.ok(!source.includes('TARGET \\(PLAN\\)'), 'the third planned score is not displayed')
  for (const value of ['3/10', '6/10', '7.3/10', 'SYNTHETIC PDF TEST']) {
    assert.ok(source.includes(value), 'Missing supplied report value: ' + value)
  }
  assert.ok(source.includes('Before the session'), 'Original analysis is not replaced by the mini-chart')
  assert.ok(source.includes('You can keep a personal observation journal'))
  assert.doesNotMatch(source, /Tm \(\+380 93 478 88 27\)/)
  assert.match(source, /\/Signature Do Q/)
  assert.ok((source.match(/\/Type \/Page \/Parent/g) ?? []).length <= 2, 'short core report remains compact')
  const invoice = buildPaymentPdf({
    patientName: 'SYNTHETIC PDF TEST', dateIssued: '2026-10-13', service: 'Test',
    amount: 10000, currency: 'EUR', paymentStatus: 'unpaid',
  }, 'en').toString('latin1')
  assert.match(invoice, /190 766 Tm/)
  assert.doesNotMatch(invoice, /SELF-RATED PROGRESS/)
})

test('remedy appendix headings are legible and all narrative copy is retained', () => {
  const blocks = remedyDescriptionBlocks('❓ ОСНОВА\n\n\nИсходный авторский текст.\n\n## ЭТАП РАЗВИТИЯ\nВторая строка.')
  assert.deepEqual(blocks.filter(block => block.kind === 'subheading').map(block => block.text),
    ['ОСНОВА', 'ЭТАП РАЗВИТИЯ'])
  assert.ok(blocks.some(block => block.text === 'Исходный авторский текст.'))
  assert.ok(blocks.some(block => block.text === 'Вторая строка.'))
  assert.equal(blocks.filter(block => block.kind === 'space').length, 2)
  const approved = remedyDescriptionBlocks(getRemedy('ru', 'veratrum-album').description)
  const headings = approved.filter(block => block.kind === 'subheading').map(block => block.text)
  for (const name of ['ОСНОВА', 'ПОКАЗАНИЯ', 'АРХЕТИПЫ', 'ОБРАЗЫ', 'ЭФФЕКТ']) {
    assert.ok(headings.includes(name), 'Missing approved source heading: ' + name)
  }
  assert.ok(approved.some(block => block.text.startsWith('• Арлекин')), 'Decorative list markers become proper bullets')
})

test('download names are meaningful and never contain patient identity', () => {
  const report = { patientName: 'Sensitive Personal Name', dateIssued: '2026-10-13' }
  assert.equal(reportPdfFilename(report), 'HolisticHouse_Report_2026-10-13.pdf')
  assert.equal(reportPdfFilename(report, { preview: true }), 'HolisticHouse_Report_2026-10-13_Preview.pdf')
  assert.equal(reportPdfFilename({ dateIssued: '../../secret' }), 'HolisticHouse_Report_undated.pdf')
})

test('mobile HTML shares explicit progress data and print-safe visual hierarchy', () => {
  const document = readFileSync('components/prescription-document.jsx', 'utf8')
  const css = readFileSync('components/consultation-report.css', 'utf8')
  const preview = readFileSync('components/consultation-draft-preview.jsx', 'utf8')
  const progress = reportProgressBinding(document)
  const legacy = { analysis: 'Before: 2/10\nAfter session: 3/10' }
  for (const [record, expected] of [
    [legacy, { before: 2, after: 3 }],
    [{ ...legacy, progressBefore: '0', progressAfter: '8.5' }, { before: 0, after: 8.5 }],
    [{ ...legacy, progressBefore: '9', progressAfter: '1' }, { before: 9, after: 1 }],
    [{ ...legacy, progressBefore: '', progressAfter: '' }, null],
    [{ ...legacy, progressBefore: 2, progressAfter: undefined }, null],
    [{ ...legacy, progressBefore: '-1', progressAfter: '3' }, null],
    [{ ...legacy, progressBefore: '3', progressAfter: '10.1' }, null],
    [{ analysis: 'Only a future target: 7/10' }, null],
  ]) {
    const original = JSON.stringify(record)
    assert.deepEqual(progress(record, resolveReportProgress), expected)
    assert.equal(JSON.stringify(record), original, 'reading progress cannot rewrite supplied observations')
  }
  assert.match(document, /canonical-progress-grid/)
  assert.match(document, /<DocumentSignature date=\{document\.dateIssued\} locale=\{locale\} compact/)
  assert.match(css, /\.canonical-progress-grid/)
  assert.match(css, /break-inside: avoid/)
  assert.match(preview, /new File\(\[blob\], filename/)
  assert.match(preview, /download=\{previewFilename\}/)
})

test('HTML progress binding rejects narrative-only, wrong-record and fabricated-score regressions', () => {
  const source = readFileSync('components/prescription-document.jsx', 'utf8')
  for (const replacement of [
    'extractReportProgress(document.analysis)',
    'resolveReportProgress(document.analysis)',
    'resolveReportProgress(otherDocument)',
    'resolveReportProgress({ ...document, progressAfter: 10 })',
    'resolveReportProgress(document) || { before: 0, after: 10 }',
  ]) {
    const changed = source.replace('resolveReportProgress(document)', replacement)
    assert.notEqual(changed, source)
    assert.throws(() => reportProgressBinding(changed), assert.AssertionError)
  }
})
