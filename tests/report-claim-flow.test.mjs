import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('direct report flow keeps bearer out of OAuth and exposes only one report', async () => {
  const [share, view, reportApi, appApi, page, worker, middleware] = await Promise.all([
    readFile('lib/clients/assessment-share.js', 'utf8'),
    readFile('components/app/shared-report-view.jsx', 'utf8'),
    readFile('app/api/report/[id]/route.js', 'utf8'),
    readFile('app/api/app/[...path]/route.js', 'utf8'),
    readFile('app/[locale]/report/[assessmentId]/page.jsx', 'utf8'),
    readFile('public/sw.js', 'utf8'),
    readFile('middleware.ts', 'utf8'),
  ])

  assert.match(share, /#\$\{secret\}/)
  assert.match(share, /clientId' in view|clientId/) // helper has private source data but projection below is explicit
  assert.match(view, /window\.location\.hash/)
  assert.match(view, /history\.replaceState/)
  assert.match(view, /Save this report to my Cabinet/)
  assert.doesNotMatch(view, /body: JSON\.stringify\(\{ locale, secret/)
  assert.match(reportApi, /httpOnly: true/)
  assert.match(reportApi, /Referrer-Policy': 'no-referrer'/)
  assert.match(appApi, /readPendingReportClaim/)
  assert.match(appApi, /report\/claim/)
  assert.match(appApi, /body: JSON\.stringify\(\{ locale \}\)|redirectTo:/)
  assert.match(page, /robots: \{ index: false, follow: false \}/)
  assert.match(worker, /\/api\/report\//)
  assert.match(middleware, /api\\\/report/)
})

test('claimed reports are attached without linking the legacy Client identity', async () => {
  const [repository, migration] = await Promise.all([
    readFile('lib/app/repository.js', 'utf8'),
    readFile('supabase/migrations/20261002233000_hh_app_claimed_reports.sql', 'utf8'),
  ])
  assert.match(repository, /claimSharedReport/)
  assert.match(repository, /sourceAssessmentId/)
  assert.doesNotMatch(repository.slice(repository.indexOf('async claimSharedReport'), repository.indexOf('async importGuestResult')), /clientId|fullName|email/)
  assert.match(migration, /source_assessment_id uuid not null unique/)
  assert.doesNotMatch(migration, /client_id/)
})
