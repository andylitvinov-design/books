import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { emailSetupStatus } from '../lib/crm/email.js'

test('owner integration diagnostics are a CRM section and do not expose provider values', () => {
  const component = new URL('../components/app/crm-integration-diagnostics.jsx', import.meta.url)
  assert.equal(existsSync(component), true)

  const manager = readFileSync(new URL('../components/app/crm-manager.jsx', import.meta.url), 'utf8')
  assert.match(manager, /CrmIntegrationDiagnostics/)
  assert.match(manager, /\['integrations',/)
  assert.match(manager, /integrationSetup/)
})

test('email setup status names missing requirements without serializing secrets', () => {
  const configured = {
    VERCEL_ENV: 'production',
    HH_CRM_EMAIL_ENABLED: 'true',
    HH_CRM_EMAIL_PRODUCTION_APPROVED: 'true',
    HH_CRM_RESEND_API_KEY: 're_internal_value_must_not_escape',
    HH_CRM_RESEND_WEBHOOK_SECRET: 'whsec_internal_value_must_not_escape',
    HH_CRM_FROM_EMAIL: 'hello@example.ca',
    HH_CRM_VERIFIED_DOMAIN: 'example.ca',
    HH_CRM_SENDER_VERIFIED: 'true',
    HH_CRM_SENDER_NAME: 'Holistic House',
    HH_CRM_REPLY_TO: 'hello@example.ca',
    HH_CRM_POSTAL_ADDRESS: 'Toronto, ON',
  }
  const status = emailSetupStatus(configured)
  assert.equal(status.enabled, true)
  assert.deepEqual(status.missingKeys, [])
  assert.equal(status.webhookUrl, 'https://holistichouse.vercel.app/api/app/crm/webhook')
  assert.doesNotMatch(JSON.stringify(status), /internal_value_must_not_escape/)

  const missing = emailSetupStatus({ VERCEL_ENV: 'production' })
  for (const key of ['HH_CRM_EMAIL_ENABLED', 'HH_CRM_EMAIL_PRODUCTION_APPROVED', 'HH_CRM_RESEND_API_KEY', 'HH_CRM_RESEND_WEBHOOK_SECRET']) {
    assert.ok(missing.missingKeys.includes(key), key)
  }
})
