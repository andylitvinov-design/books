import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { extractReportProgress } from '../lib/documents/report-progress.js'

const reportDocument=readFileSync(new URL('../components/prescription-document.jsx',import.meta.url),'utf8')

test('published narrative draws only two factual circles Было / Стало',()=>{
  assert.deepEqual(extractReportProgress(
    'Было: интерес 3/10.\nСтало: интерес 6/10.\nЦель на будущее: 7.3/10.'
  ),{before:3,after:6})
  assert.match(reportDocument,/key: 'before', label: locale === 'ru' \? 'Было'/)
  assert.match(reportDocument,/key: 'after', label: locale === 'ru' \? 'Стало'/)
  assert.doesNotMatch(reportDocument,/key: 'target'/)
})

test('existing session wording and English report formats are preserved',()=>{
  assert.deepEqual(extractReportProgress(
    'Было: оценка 2,5/10\nПосле сессии: оценка 5/10'
  ),{before:2.5,after:5})
  assert.deepEqual(extractReportProgress(
    'Before the session: interest 3/10\nAfter the session: interest 6/10'
  ),{before:3,after:6})
})

test('planned goals and partial scores never masquerade as measured before/after',()=>{
  assert.equal(extractReportProgress('Было: 3/10\nЦель: 7/10'),null)
  assert.equal(extractReportProgress('Стало: 6/10'),null)
  assert.equal(extractReportProgress('Было: 11/10\nСтало: 6/10'),null)
})
