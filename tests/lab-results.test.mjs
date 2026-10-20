import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  LAB_REPORT_VERSION, LAB_MAX_MARKERS, parseLabNumber, normalizeLabMarker,
  normalizeLabReport, labRangeStatus, labFocus, buildLabReview, parseLabText,
} from '../lib/labs/analysis.mjs'

const row = (overrides = {}) => ({
  name: 'Ferritin', value: 8, unit: 'ng/mL', lower: 15, upper: 150, ...overrides,
})
const report = (overrides={}) => ({
  version:LAB_REPORT_VERSION, confirmed:true, labName:'Demo Lab',
  measuredOn:'2026-10-19', sourceFormat:'manual', markers:[row()], ...overrides,
})

test('number parser handles decimal comma and rejects inequalities / embedded units', () => {
  assert.equal(parseLabNumber(' 2,45 '), 2.45)
  assert.equal(parseLabNumber('−1,25'), -1.25)
  assert.equal(parseLabNumber('<7'), null)
  assert.equal(parseLabNumber('7 mg/dL'), null)
  assert.equal(parseLabNumber('1e99'), null)
  assert.equal(parseLabNumber(''), null)
})

test('lab-provided thresholds only; no universal norm inference', () => {
  assert.equal(labRangeStatus(row()), 'low')
  assert.equal(labRangeStatus(row({value:155})), 'high')
  assert.equal(labRangeStatus(row({value:150})), 'within')
  assert.equal(labRangeStatus(row({value:15})), 'within')
  assert.equal(labRangeStatus(row({lower:null})), 'unrated')
  assert.equal(labRangeStatus(row({upper:null})), 'unrated')
  assert.equal(labRangeStatus(row({lower:null,upper:null})), 'unrated')
  assert.equal(labRangeStatus(row({lower:150,upper:15})), 'invalid')
})

test('marker does not accept invented, contradictory or nonnumeric values', () => {
  assert.equal(normalizeLabMarker(row({value:'<8'})), null)
  assert.equal(normalizeLabMarker(row({unit:'<script>'})), null)
  assert.equal(normalizeLabMarker(row({name:'F'})), null)
  assert.equal(normalizeLabMarker(row({value:Infinity})), null)
  assert.equal(normalizeLabMarker(row({critical:'true'})), null)
  assert.equal(normalizeLabMarker(row({lower:150})), null)
  assert.equal(normalizeLabMarker(row({upper:15})), null)
  assert.equal(normalizeLabMarker(row({lower:'',upper:'',value:'2,1'}))?.value,2.1)
})

test('common laboratory classifications never prescribe or diagnose', () => {
  assert.equal(labFocus('Гемоглобин'), 'iron')
  assert.equal(labFocus('HbA1c'), 'metabolic')
  assert.equal(labFocus('LDL cholesterol'), 'lipids')
  assert.equal(labFocus('TSH'), 'thyroid')
  assert.equal(labFocus('Vitamin B12'), 'nutrients')
  assert.equal(labFocus('Creatinine'), 'organs')
  const review=buildLabReview([row(),row({name:'Glucose',value:90,lower:70,upper:110}),row({name:'Vitamin B12',lower:null}),row({name:'TSH', value:55,lower:0.4,upper:4.0,critical:true})],'ru')
  assert.equal(review.abnormal.length,2)
  assert.equal(review.uncertain.length,1)
  assert.equal(review.critical.length,1)
  assert.equal(review.urgency,'lab-flag')
  assert.equal(review.steps.length,7)
  assert.ok(review.focus.some(value=>value.id==='iron'))
  assert.ok(review.focus.some(value=>value.id==='thyroid'))
  const text=JSON.stringify(review.steps)
  assert.doesNotMatch(text,/1000c|remedy|дозировк|препарат|лечени[ея]|cure|prescribe/i)
})

test('recognize international lab CSV with digit-comma-digit row contents', () => {
  const example='Name,Result,Unit,Low,High\nFerritin,8,ng/mL,15,150\nGlucose,92,mg/dL,70,100'
  const parsed=parseLabText(example)
  assert.equal(parsed.markers.length,2)
  assert.equal(parsed.markers[0].name,'Ferritin')
  assert.equal(parsed.markers[0].lower,15)
  assert.equal(parsed.markers[0].upper,150)
  assert.equal(parsed.markers[1].value,92)
})

test('recognize semicolon-delimited comma-decimal and Cyrillic headers', () => {
  const parsed=parseLabText('Показатель;Результат;Единица;Нижняя;Верхняя\nФерритин;8,4;нг/мл;15;150\nГемоглобин;125;г/л;120;160')
  assert.equal(parsed.markers.length,2)
  assert.equal(parsed.markers[0].value,8.4)
  assert.equal(labRangeStatus(parsed.markers[0]),'low')
  assert.equal(labRangeStatus(parsed.markers[1]),'within')
})

test('recognize quoted CSV fields and laboratory reference interval column', () => {
  const parsed=parseLabText('Test,Result,Unit,Reference Range\n"Vitamin B12",225,pg/mL,190–900')
  assert.equal(parsed.markers.length,1)
  assert.equal(parsed.markers[0].upper,900)
})

test('manual text without lab range remains unclassified rather than normal', () => {
  const parsed=parseLabText('Name;Result;Unit;Low;High\nFerritin;8;ng/mL;;')
  assert.equal(parsed.markers.length,1)
  assert.equal(labRangeStatus(parsed.markers[0]),'unrated')
})

test('strict report validation and explicit confirmation', () => {
  assert.ok(normalizeLabReport(report()))
  assert.equal(normalizeLabReport(report({confirmed:false})),null)
  assert.equal(normalizeLabReport(report({measuredOn:'2026-02-30'})),null)
  assert.equal(normalizeLabReport(report({measuredOn:'2050-01-01'})),null)
  assert.equal(normalizeLabReport(report({sourceFormat:'pdf'})),null)
  assert.equal(normalizeLabReport(report({markers:[]})),null)
  assert.equal(normalizeLabReport(report({markers:Array.from({length:LAB_MAX_MARKERS+1},()=>row())})),null)
  assert.equal(normalizeLabReport(report({labName:'<script>'})),null)
  assert.equal(normalizeLabReport(report({markers:[row({value:'NaN'})]})),null)
  assert.equal(normalizeLabReport({...report(),confirmed:true}).markers[0].lower,15)
})

test('private API must require owner account and guarded export, never public file upload', () => {
  const source=readFileSync(new URL('../app/api/app/[...path]/route.js',import.meta.url),'utf8')
  const storage=readFileSync(new URL('../lib/app/lab-reports.js',import.meta.url),'utf8')
  const ui=readFileSync(new URL('../components/app/lab-results.jsx',import.meta.url),'utf8')
  assert.match(source,/joined === 'labs'/)
  assert.match(source,/request\.headers\.get\('x-hh-account-id'\) !== actor\.id/)
  assert.match(source,/readBody\(request, 40000\)/)
  assert.match(source,/exported\.labReports/)
  assert.match(storage,/account_id=\$1/)
  assert.match(storage,/openSealed\(/)
  assert.match(storage,/seal\(/)
  assert.match(storage,/LAB_REPORT_LIMIT/)
  assert.match(ui,/\.csv,\.tsv,\.txt,\.pdf/)
  assert.doesNotMatch(storage,/(upload|pdf|fileBase64|blobData)\s*:/i)
})

test('private schema forces row-level security and zero anonymous grants', () => {
  const sql=readFileSync(new URL('../supabase/migrations/20261020170611_hh_client_lab_reports_private_20261020.sql',import.meta.url),'utf8')
  assert.match(sql,/alter table app_private\.lab_reports force row level security/i)
  assert.match(sql,/revoke all on app_private\.lab_reports from public, anon, authenticated/i)
  assert.match(sql,/account_id=\(select auth\.uid\(\)\)/i)
  assert.match(sql,/on delete cascade/i)
  assert.doesNotMatch(sql,/grant (?:all|select|insert|delete) on app_private\.lab_reports to (?:public|anon|authenticated)/i)
})
