import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { availableSavedReports, latestReceivedReport } from '../lib/profile/report-summary.js'

test('latest report means latest received in this account, not latest consultation date', () => {
  const reports = [
    { id: 'old', occurredOn: '2026-10-18', savedAt: '2026-10-18T14:00:00Z' },
    { id: 'new', occurredOn: '2026-10-02', savedAt: '2026-10-19T10:00:00Z' },
    { id: 'revoked', occurredOn: '2026-10-19', savedAt: '2026-10-19T12:00:00Z', available: false },
  ]
  assert.equal(latestReceivedReport(reports).id, 'new')
  assert.deepEqual(availableSavedReports(reports).map(r => r.id), ['old', 'new'])
  assert.equal(reports[0].id, 'old', 'original order must remain unchanged')
  assert.equal(latestReceivedReport([]), null)
  assert.equal(latestReceivedReport(null), null)
  assert.equal(latestReceivedReport([{ id: 'revoked', available: false }]), null)
})

test('missing receipt date falls back to report date without claiming a receipt date', () => {
  assert.equal(latestReceivedReport([
    { id: 'older', occurredOn: '2026-09-30' },
    { id: 'newer', occurredOn: '2026-10-01' },
  ]).id, 'newer')
})

test('Profile starts with a compact private latest report, keeps its full archive and then Development programme', async () => {
  const profile = await readFile('components/app/profile-domains.jsx', 'utf8')
  const start = profile.indexOf('id="personal-reports"')
  const program = profile.indexOf('<DevelopmentProgram key={accountId}')
  const categories = profile.indexOf('className="hh-domain-more"')
  assert.ok(start >= 0 && program > start && categories > program, 'Reports → Development programme → report areas')
  assert.match(profile, /latestReceivedReport\(savedReports\)/)
  assert.match(profile, /latestSavedReport\.savedAt/)
  assert.match(profile, /latestSavedReport\.id/)
  assert.match(profile, /setArchiveOpen\(true\)/, 'deep link expands reports')
  assert.match(profile, /aria-expanded=\{archiveOpen\}/)
  assert.match(profile, /archiveOpen && reportsContent/, 'full archive mounts only on disclosure')
  assert.match(profile, /data-profile-report-archive/)
  assert.doesNotMatch(profile, /localStorage|sessionStorage/)
})
