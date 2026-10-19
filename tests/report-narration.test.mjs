import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  splitApprovedAnalysis, validNarrationRequest,
  NARRATION_PART_CHARS, NARRATION_MAX_PARTS,
} from '../lib/clients/report-narration-model.js'

const source = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')

test('narration reads the entire approved analysis without producing new clinical claims', () => {
  assert.deepEqual(splitApprovedAnalysis('  My original analysis.  '), ['My original analysis.'])
  const long = 'I noticed a change. The client can review their progress. '.repeat(80)
  const parts = splitApprovedAnalysis(long)
  assert.ok(parts.length > 1)
  assert.ok(parts.length <= NARRATION_MAX_PARTS)
  assert.ok(parts.every(part => part.length > 0 && part.length <= NARRATION_PART_CHARS))
  assert.equal(parts.join(' ').replace(/\s+/g, ' ').trim(), long.trim().replace(/\s+/g, ' '))
  assert.deepEqual(splitApprovedAnalysis(null), [])
  assert.deepEqual(splitApprovedAnalysis(' '), [])
  assert.deepEqual(splitApprovedAnalysis('x'.repeat(20001)), [])
})

test('browser may request only a verified report identity and segment number', () => {
  const base = {scope:'guest-session',selector:'private-selector',locale:'ru',part:0}
  assert.equal(validNarrationRequest(base), true)
  assert.equal(validNarrationRequest({...base, text:'inject replacement prescription'}), false)
  assert.equal(validNarrationRequest({...base, part:-1}), false)
  assert.equal(validNarrationRequest({...base, part:8}), false)
  assert.equal(validNarrationRequest({...base, locale:'es'}), false)
  assert.equal(validNarrationRequest({...base, scope:'public'}), false)
  assert.equal(validNarrationRequest({...base, extra:true}), false)
})

test('synthesis stays server-only, uses verified private voices and cannot silently fall back', () => {
  const service = source('lib/clients/report-narration-service.js')
  assert.match(service, /import 'server-only'/)
  assert.match(service, /HH_REPORT_NARRATION_ENABLED/)
  assert.match(service, /HEYGEN_API_KEY/)
  assert.match(service, /333115d9f7ff4042846baa63a26b6f76/)
  assert.match(service, /f447c75e0b7c40f4ae992bd6cfbce23c/)
  assert.match(service, /allowedAudioHost/)
  assert.match(service, /recognizedAudio/)
  assert.match(service, /redirect: 'error'/)
  assert.doesNotMatch(service, /voice_id\s*:\s*['"]public/)
})

test('TTS API authenticates every route and never trusts narration supplied by the client', () => {
  const route = source('app/api/report-narration/route.js')
  for(const check of ['requireSameOrigin(request, config)', 'authorizeSessionGuest',
    'authorizeCabinetRequest', 'authorizePrescriptionRequest', 'readSavedSession',
    'readSavedDocument', 'getPublishedSessionReport', 'getClientPrescription',
    'splitApprovedAnalysis', 'consumeAccessAttempt', 'NARRATION_LIMIT'])
    assert.ok(route.includes(check), check)
  assert.match(route, /body\.part >= parts\.length/)
  assert.match(route, /synthesizeApprovedReportPart\(parts\[body\.part\], body\.locale\)/)
  assert.doesNotMatch(route, /body\.text/)
  assert.match(route, /PRIVATE_HEADERS/)
  assert.doesNotMatch(route, /export async function GET/)
})

test('Play is opt-in on client readers, invisible in PDF and never auto-generates on page load', () => {
  const document = source('components/prescription-document.jsx')
  const player = source('components/report-narration-player.jsx')
  const css = source('components/report-narration-player.module.css')
  const csp = source('middleware.ts')
  assert.match(document, /narration && narrationEnabled\(\)/)
  assert.match(document, /ReportNarrationPlayer locale=\{locale\} access=\{narration\}/)
  assert.match(player, /onClick=\{toggle\}/)
  assert.match(player, /fetch\('\/api\/report-narration'/)
  assert.match(player, /URL\.revokeObjectURL/)
  assert.match(player, /onEnded=\{ended\}/)
  assert.match(player, /AI-cloned voice/)
  assert.doesNotMatch(player, /speechSynthesis/)
  assert.doesNotMatch(player, /useEffect\(.*playSegment/)
  assert.match(css, /@media print/)
  assert.match(csp, /reportNarrationReader/)
  assert.match(csp, /media-src 'self'/)
})

test('all six authorized client report contexts pass their own scope', () => {
  const entries = [
    ['app/[locale]/client/session/[shareSelector]/page.js', "scope:'guest-session'"],
    ['app/[locale]/client/[selector]/sessions/[sessionId]/page.js', "scope:'cabinet-session'"],
    ['app/[locale]/app/sessions/[id]/page.jsx', "scope:'saved-session'"],
    ['app/[locale]/prescriptions/[selector]/page.js', "scope:'legacy-document'"],
    ['app/[locale]/client/[selector]/documents/[id]/page.js', "scope:'cabinet-document'"],
    ['app/[locale]/app/document-view/[id]/page.jsx', "scope:'saved-document'"],
  ]
  for (const [file, marker] of entries) {
    assert.ok(source(file).includes(marker), file)
  }
  assert.doesNotMatch(source('app/admin/documents/[id]/page.js'), /scope:'legacy-document'/)
})
