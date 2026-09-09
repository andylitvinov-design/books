import assert from 'node:assert/strict'
import test from 'node:test'
import { parsePrescriptionText } from '../lib/prescriptions/text-import.js'
import { getPrescriptionRemedyOptions } from '../lib/prescriptions/service.js'

const remedies = getPrescriptionRemedyOptions()
test('parses explicit Russian text without filling in missing treatment information', () => {
  const parsed = parsePrescriptionText('Клиент: Тест\nДата: 08.09.2026\nАурум 30C, по 3 гранулы, 2 раза в день, 7 дней\nAlumina\nОбщие инструкции: Тестовая инструкция', remedies)
  assert.equal(parsed.items.length, 2)
  assert.equal(parsed.items[0].remedySlug, 'aurum-metallicum')
  assert.equal(parsed.items[0].potency, '30C')
  assert.equal(parsed.items[0].dosage, 'по 3 гранулы')
  assert.equal(parsed.items[0].frequency, '2 раза в день')
  assert.equal(parsed.items[0].duration, '7 дней')
  assert.equal(parsed.items[1].dosage, '')
  assert.equal(parsed.patientName, 'Тест')
  assert.equal(parsed.dateIssued, '2026-09-08')
})
test('parses Excel columns including empty cells and reordered headers', () => {
  const parsed = parsePrescriptionText('Препарат\tДоза\tПотенция\tЧастота\tКурс\tЗаметки\nAurum metallicum\tTest dose\t30C\t\tTest course\tTest note', remedies)
  assert.equal(parsed.items[0].dosage, 'Test dose')
  assert.equal(parsed.items[0].potency, '30C')
  assert.equal(parsed.items[0].frequency, '')
  assert.equal(parsed.items[0].duration, 'Test course')
})
test('accepts labelled fields, continuation lines, and English prose', () => {
  const parsed = parsePrescriptionText('Aurum: potency: 30C; dosage: Test dose; frequency: Test frequency; duration: Test course; notes: Test note\nПримечание: Additional note\nAlumina 6X, 2 pellets twice a day for 3 days', remedies)
  assert.equal(parsed.items[0].potency, '30C')
  assert.equal(parsed.items[0].dosage, 'Test dose')
  assert.equal(parsed.items[0].instructions, 'Test note; Additional note')
  assert.equal(parsed.items[1].frequency, 'twice a day')
  assert.equal(parsed.items[1].duration, 'for 3 days')
})
test('unknown and ambiguous remedies are reported, not guessed', () => {
  const parsed = parsePrescriptionText('Unknown remedy 30C\nДата: 31.02.2026\nAurum metallicum take as discussed', remedies)
  assert.equal(parsed.items.length, 1)
  assert.equal(parsed.warnings.length, 3)
  assert.match(parsed.items[0].instructions, /take as discussed/)
  assert.equal(parsePrescriptionText('same 30C', [{ slug: 'a', label: 'same' }, { slug: 'b', label: 'same' }]).items.length, 0)
})
test('uses longest canonical name and handles pipe tables and numbering', () => {
  const parsed = parsePrescriptionText('1. Aurum metallicum | 30C | dose | frequency | duration | note', remedies)
  assert.equal(parsed.items[0].remedySlug, 'aurum-metallicum')
  assert.equal(parsed.items[0].instructions, 'note')
})
