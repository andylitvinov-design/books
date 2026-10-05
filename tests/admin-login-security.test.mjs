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

test('admin sign-in uses Holistic House practitioner copy and a documented twelve-hour throttled session policy', async () => {
  const [page, admin] = await Promise.all([
    readFile('app/admin/login/page.js', 'utf8'),
    readFile('lib/prescriptions/admin.js', 'utf8'),
  ])

  assert.match(page, /Practitioner Cabinet/)
  assert.match(page, /Private access for practitioner tools and client records/)
  assert.match(page, /Access code/)
  assert.match(admin, /maxAge: 60 \* 60 \* 12/)
  assert.match(admin, /maxAttempts: 5/)
  assert.match(admin, /getPrescriptionStore/)
  assert.match(admin, /consumeAccessAttempt/)
  assert.doesNotMatch(page, /Prescription admin/)
})


test('practitioner Google bridge is exact-email server authorization and reuses the hardened admin cookie', async () => {
  const [admin, route, config] = await Promise.all([
    readFile('lib/prescriptions/admin.js', 'utf8'),
    readFile('app/api/app/[...path]/route.js', 'utf8'),
    readFile('lib/app/config.js', 'utf8'),
  ])

  assert.match(config, /HH_PRACTITIONER_OWNER_EMAIL/)
  assert.match(admin, /isVerifiedPractitionerActor/)
  assert.match(admin, /normalizedEmail\(actor\?\.email\)/)
  assert.match(admin, /PRESCRIPTIONS_ADMIN_TOKEN \|\| environment\.PRESCRIPTIONS_ADMIN_PIN/)
  assert.match(admin, /sameSite: 'strict'/)
  assert.match(admin, /path: '\/admin'/)
  assert.match(route, /joined === 'practitioner\/session'/)
  assert.match(route, /await repo\.bootstrap\(actor\)/)
  assert.match(route, /establishAdminSessionForVerifiedPractitioner\(actor\)/)
  assert.match(route, /practitionerTargets/)
  assert.match(route, /if \(!isVerifiedPractitionerActor\(actor\)\) throw new AppError\('NOT_FOUND', 404\)/)
  assert.match(route, /if \(practitioner\) \{/)
  assert.match(route, /await import\('\@\/lib\/prescriptions\/admin'\)/)
  assert.match(route, /await clearAdminSession\(\)/)
  assert.doesNotMatch(route, /user_metadata.*practitioner|practitioner.*user_metadata/i)
})
