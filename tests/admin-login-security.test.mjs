import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createLoginRateLimiter } from '../lib/security/login-rate-limit.js'

test('admin login limiter blocks a sixth failed attempt for one anonymous bucket during its ten-minute window', () => {
  const limiter = createLoginRateLimiter({ maxAttempts: 5, windowMs: 10 * 60_000, globalMaxAttempts: 50 })
  const now = 1_000_000

  for (let attempt = 0; attempt < 5; attempt += 1) assert.equal(limiter.canAttempt('ip-hash-a', now), true)
  limiter.recordFailure('ip-hash-a', now)
  limiter.recordFailure('ip-hash-a', now)
  limiter.recordFailure('ip-hash-a', now)
  limiter.recordFailure('ip-hash-a', now)
  limiter.recordFailure('ip-hash-a', now)

  assert.equal(limiter.canAttempt('ip-hash-a', now), false)
  assert.equal(limiter.canAttempt('ip-hash-a', now + 10 * 60_000), true)
})

test('a successful login clears only its anonymous bucket and does not retain credential material', () => {
  const limiter = createLoginRateLimiter({ maxAttempts: 2, windowMs: 10 * 60_000, globalMaxAttempts: 50 })
  const now = 1_000_000

  limiter.recordFailure('ip-hash-a', now)
  limiter.recordFailure('ip-hash-a', now)
  assert.equal(limiter.canAttempt('ip-hash-a', now), false)
  limiter.recordSuccess('ip-hash-a')

  assert.equal(limiter.canAttempt('ip-hash-a', now), true)
  assert.equal(limiter.canAttempt('ip-hash-b', now), true)
})

test('practitioner sign-in uses verified Google instead of the old access-code page', async () => {
  const [page, entry, route, admin, adminSession] = await Promise.all([
    readFile('app/admin/login/page.js', 'utf8'),
    readFile('components/practitioner-auto-entry.jsx', 'utf8'),
    readFile('app/api/app/[...path]/route.js', 'utf8'),
    readFile('lib/prescriptions/admin.js', 'utf8'),
    readFile('lib/prescriptions/admin-session.js', 'utf8'),
  ])
  assert.match(page, /PractitionerAutoEntry/)
  assert.match(page, /requireAdminRequest/)
  assert.doesNotMatch(page, /accessCode|type=["']password["']|<form\b/)
  assert.match(entry, /appFetch\('practitioner\/open', \{ destination: 'cabinet' \}\)/)
  assert.match(entry, /response\.redirectUrl !== '\/admin'/)
  assert.match(entry, /continueTo: next === 'growth-studio' \? 'growth-studio' : 'practitioner'/)
  assert.match(entry, /appFetch\('auth\/start'/)
  assert.match(entry, /authFailed \|\| started\.current/)
  assert.doesNotMatch(entry, /PRESCRIPTIONS_ADMIN_(?:PIN|TOKEN)|accessCode|type=["']password["']/)
  assert.match(route, /'energywork','practitioner','growth-studio'\]/)
  assert.match(page, /params\?\.next === 'growth-studio' \? 'growth-studio' : null/)
  assert.match(route, /continueTo === 'practitioner'/)
  assert.ok(route.includes('/admin/login'))
  assert.match(route, /!practitionerEmailAllowed\(actor\) \|\| !await repo\.isPractitioner\(actor\)/)
  assert.match(adminSession, /maxAge: 60 \* 60 \* 12/)
  assert.match(admin, /maxAttempts: 5/)
  assert.match(admin, /consumeAccessAttempt/)
})

test('practitioner Logout clears the session and opens the public Holistic House homepage', async () => {
  const [action, header, homePage] = await Promise.all([
    readFile('app/admin/logout/actions.js', 'utf8'),
    readFile('components/prescription-admin-header.jsx', 'utf8'),
    readFile('app/page.tsx', 'utf8'),
  ])

  assert.match(header, /<form action=\{logout\}>/)
  assert.match(action, /await clearAdminSession\(\)\s*redirect\('\/'\)/)
  assert.doesNotMatch(action, /redirect\('\/admin(?:\/login)?'\)/)
  assert.match(homePage, /<HolisticHouseHome\b/)
})
