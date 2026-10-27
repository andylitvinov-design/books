import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  REMOTE_SUPPORT_DRAFT_KEY,
  readRemoteSupportDraft,
  formatRemoteSupportDraft,
} from '../lib/practitioners/remote-energy-support.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const example = {
  version: 1,
  serviceId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  practitioner: 'Andy',
  goal: 'Inner balance and calm',
  method: 'Reiki',
  format: 'asynchronous',
  duration: 30,
  date: '2026-10-21',
  time: '15:30',
  timezone: 'America/Toronto',
  savedAt: 10000,
}
const storage = (value) => ({getItem: (key) => key === REMOTE_SUPPORT_DRAFT_KEY ? JSON.stringify(value) : null})

test('only the matching unexpired practitioner-service booking draft is accepted', () => {
  assert.deepEqual(readRemoteSupportDraft(storage(example), example.serviceId, 10000), example)
  assert.equal(readRemoteSupportDraft(storage(example), 'different-service', 10000), null)
  assert.equal(readRemoteSupportDraft(storage(example), example.serviceId, 10000 + 25 * 3600000), null)
  assert.equal(readRemoteSupportDraft(storage({...example, format:'invalid'}), example.serviceId, 10000), null)
  assert.equal(readRemoteSupportDraft(storage({...example, duration:45}), example.serviceId, 10000), null)
  assert.equal(readRemoteSupportDraft(storage({...example, date:'not-a-date'}), example.serviceId, 10000), null)
  assert.equal(readRemoteSupportDraft(storage({...example, time:'15:30\nfoo'}), example.serviceId, 10000), null)
  assert.equal(readRemoteSupportDraft({ getItem(){ throw Error('blocked') } }, example.serviceId), null)
})

test('booking summary is explicit about non-confirmed time and price', () => {
  const summary = formatRemoteSupportDraft(example)
  assert.match(summary, /not confirmed/)
  assert.match(summary, /America\/Toronto/)
  assert.match(summary, /2026-10-21 15:30/)
  assert.match(summary, /before any payment/)
  assert.ok(summary.split('\n').length >= 7)
})

test('Practitioners is compact, and energy support is a separate EN/RU/ES booking route', () => {
  const page = read('app/[locale]/masters/page.tsx')
  const pageCss = read('app/[locale]/masters/masters-page.module.css')
  const finder = read('components/master-network-explorer.tsx')
  const finderCss = read('components/master-network-explorer.module.css')
  const supportRoute = read('app/[locale]/services/remote-energy-support/page.tsx')
  const publicOffers = read('lib/practitioners/public-remote-support-masters.ts')
  const inlineRoute = read('app/api/public/remote-energy-support-masters/route.ts')
  const wizard = read('components/remote-energy-support-booking.tsx')
  const cabinet = read('components/app/app-workspace.jsx')
  assert.match(page, /<MarketplaceMasterFinder practitioners=/)
  // The current Masters page delegates its service CTA to the shared finder.
  assert.match(finder, /service\.slug === "remote-energy-support"/)
  assert.match(pageCss, /@media \(max-width: 700px\)/)
  assert.match(finder, /MASTER_TOPICS/)
  assert.match(finder, /More filters/)
  assert.match(finder, /<div className=\{styles.masterExtra\}>/)
  assert.match(finder, /className=\{styles.masterExtraToggle\}/)
  assert.match(finderCss, /\.compactMaster/)
  // Both the standalone route and same-page selector use one moderated catalogue.
  assert.match(supportRoute, /listRemoteEnergySupportMasters\(locale\)/)
  assert.match(publicOffers, /areaKey === "energy_spiritual"/)
  assert.match(publicOffers, /service\.slug === "remote-energy-support"/)
  assert.match(publicOffers, /service\.status === "published"/)
  assert.match(inlineRoute, /listRemoteEnergySupportMasters\(locale\)/)
  assert.match(inlineRoute, /PRACTITIONERS_UNAVAILABLE/)
  assert.match(supportRoute, /locales?/i)
  assert.match(wizard, /America\/Toronto/)
  assert.match(wizard, /window\.sessionStorage\.setItem/)
  assert.match(wizard, /Continue to request/)
  assert.match(wizard, /not a confirmed appointment/)
  assert.match(wizard, /not medical treatment/)
  assert.match(wizard, /masters\.length === 0/)
  assert.match(cabinet, /readRemoteSupportDraft\(window\.sessionStorage, service\.id\)/)
  assert.match(cabinet, /formatRemoteSupportDraft\(draft\)/)
  assert.match(cabinet, /await appFetch\('requests', body\)/)
  assert.doesNotMatch(wizard, /checkout|stripe|createPaymentIntent/i)
})
