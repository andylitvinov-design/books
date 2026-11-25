import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8')

test('mobile practice v2 keeps first service, share link and moderation honest', async () => {
  const [view, css, serviceCards] = await Promise.all([
    read('components/app/practice-workspace.jsx'),
    read('components/app/practice-dashboard.css'),
    read('components/app/my-services-dashboard.jsx'),
  ])
  assert.match(view, /Set up your practice/)
  assert.match(view, /readySteps<3/)
  assert.match(view, /Complete your profile/)
  assert.match(view, /Add your first service/)
  assert.match(view, /Share your public page/)
  assert.match(view, /navigator\.share/)
  assert.match(view, /navigator\.clipboard/)
  assert.match(view, /profileLive/)
  assert.match(view, /<MyServicesDashboard /)
  assert.match(serviceCards, /className=\{styles.serviceCard\}/)
  assert.match(serviceCards, /data-status=\{item.status\}/)
  assert.match(serviceCards, /aria-expanded=\{finderOpen\}/)
  assert.match(view, /changes_requested/)
  assert.match(view, /hh-practice-fee-notice/)
  assert.match(view, /Marketplace checkout and payouts are not yet enabled/)
  assert.match(css, /Practice v2 2026-10-16/)
  assert.match(css, /prefers-reduced-motion/)
})

test('practitioner leads stay item-scoped; owner CRM mounts only on demand', async () => {
  const [view, workspace, crm, route] = await Promise.all([
    read('components/app/practice-workspace.jsx'),
    read('components/app/app-workspace.jsx'),
    read('components/app/crm-manager.jsx'),
    read('app/api/app/crm/route.js'),
  ])
  assert.match(view, /isOwner\?openOwner\('clients'\):choosePanel\('clients'\)/)
  assert.match(view, /Business contacts & subscribers/)
  assert.match(view, /function ClientLeads/)
  assert.match(view, /safeLeadContact/)
  assert.match(view, /Private tests and health records are not shared/)
  assert.match(view, /isOwner&&accountId/)
  assert.match(view, /CrmManager key=\{accountId\}/)
  assert.doesNotMatch(workspace, /data\.practitioner && <CrmManager/)
  assert.match(crm, /if \(!accountId\) return null/)
  assert.match(crm, /sessionRef\.current !== session/)
  assert.match(crm, /only business contacts|Business contacts only/)
  assert.match(route, /if \(!practitionerEmailAllowed\(actor\)\)/)
  assert.match(route, /if \(!crmEnabled\(\)\)/)
})
