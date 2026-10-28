import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { assertCabinetGuestSignin } from '../scripts/helpers/cabinet-guest-signin-verifier.mjs'

const authored = readFileSync(new URL('../components/app/cabinet-guest-overview.jsx', import.meta.url), 'utf8')
const name = authored.match(/en:\s*\{[\s\S]*?signin:\s*'([^']+)'/)[1]
const marker = authored.match(/data-cabinet-guest-overview="([^"]+)"/)[1]
const origin = 'http://localhost:3100'
function fixture(changes = {}) {
 const state = { path: '/en/app/portrait', marker, name, guestCount: 1, count: 1, guestVisible: true, visible: true, enabled: true, ...changes }
 const button = { count: state.count, visible: state.visible, enabled: state.enabled }
 const guest = { count: state.guestCount, visible: state.guestVisible, getByRole(role, options) {
  assert.equal(role, 'button'); assert.equal(options.exact, true)
  return options.name === state.name ? button : { count: 0, visible: false, enabled: false }
 } }
 const page = { url: origin + state.path, locator(selector) {
  assert.equal(selector, '[data-cabinet-guest-overview="true"]')
  return state.marker === 'true' ? guest : { ...guest, count: 0 }
 } }
 const expect = target => ({
  async toHaveURL(value, options) { assert.equal(options?.timeout, 30000); assert.equal(target.url, value) },
  async toHaveCount(value, options) { assert.equal(options?.timeout, 30000); assert.equal(target.count, value) },
  async toBeVisible(options) { assert.equal(options?.timeout, 30000); assert.equal(target.visible, true) },
  async toBeEnabled(options) { assert.equal(options?.timeout, 30000); assert.equal(target.enabled, true) },
 })
 return {page, expect, button}
}
test('actual authored EN guest CTA is explicit, ready and scoped; helper does not click', async () => {
 assert.equal(name, 'Open my Cabinet with Google')
 assert.match(authored, /!unavailable && <button[^>]+disabled=\{busy\} onClick=\{onSignin\}/)
 assert.match(authored, /busy \? t.signingIn : t.signin/)
 const f = fixture(); assert.equal(await assertCabinetGuestSignin(f.page, f.expect, {origin}), f.button)
})
for (const [label, changes] of Object.entries({
 'wrong guest marker': {marker: 'false'}, 'missing guest': {guestCount: 0}, 'duplicate guest': {guestCount: 2},
 'loading or hidden guest': {guestVisible: false}, 'old CTA': {name: 'Continue with Google'},
 'other provider CTA': {name: 'Open my Cabinet with Apple'}, 'missing CTA': {count: 0},
 'duplicate CTA': {count: 2}, 'hidden CTA': {visible: false}, 'busy CTA': {enabled: false},
 'connecting label': {name: 'Connecting to Google…'}, 'wrong route': {path: '/en/app/tests'},
})) test('rejects '+label, async () => {
 const f = fixture(changes)
 await assert.rejects(assertCabinetGuestSignin(f.page, f.expect, {origin}))
})

const verifier = readFileSync(process.env.HH_GUEST_SIGNIN_VERIFIER_SOURCE || new URL('../scripts/verify-app-r1.mjs', import.meta.url), 'utf8')
test('all four portrait callers retain their own route, clicks and subsequent guards', () => {
 const call = 'assertCabinetGuestSignin(page,expect,{origin})'
 assert.equal(verifier.split(call).length - 1, 3)
 assert.equal(verifier.split('assertCabinetGuestSignin(otherPage,expect,{origin})').length - 1, 1)
 assert.match(verifier, /const response=await page.goto\(origin\+'\/en\/app'\)[^\n]+\n coreStageEvidence\.mark\('cabinet-signin'\)\n await \(await assertCabinetGuestSignin\(page,expect,\{origin\}\)\)\.click\(\);await expect\(page.getByRole\('heading',\{name:'Create my private space'\}/)
 assert.match(verifier, /const other=await browser.newContext\(\)[\s\S]*?const otherPage=await other.newPage\(\)\s+await otherPage.goto\(origin\+'\/en\/app'\)\s+await \(await assertCabinetGuestSignin\(otherPage,expect,\{origin\}\)\)\.click\(\)/)
 const logout = verifier.split('\n').find(line => line.includes("name:'Sign out on all devices'"))
 assert.ok(logout.includes('await '+call+';await expect(page).toHaveURL'))
 assert.ok(logout.includes("assert.equal((await api('bootstrap')).status,401)"))
 assert.match(verifier, /await launchPublicGuestWithoutAccountWrite\(page,context,newPublicTest.definition\)\s+\/\/ Sign in explicitly[^\n]+\n await page.goto\(origin\+'\/en\/app'\)\s+await \(await assertCabinetGuestSignin\(page,expect,\{origin\}\)\)\.click\(\)\s+await assertCabinetPortrait/)
 assert.equal(verifier.includes('Continue with Google'), false)
})

function assertAuthoredGuestContract(source) {
 assert.match(source, /signin: 'Open my Cabinet with Google'/)
 assert.match(source, /data-cabinet-guest-overview="true"/)
 assert.match(source, /!unavailable && <button[^>]+disabled=\{busy\} onClick=\{onSignin\}/)
 assert.match(source, /busy \? t.signingIn : t.signin/)
}
function assertReadinessContract(source) {
 for (const statement of [
  "await expect(page).toHaveURL(origin + '/en/app/portrait', { timeout: 30000 })",
  'await expect(guest).toHaveCount(1, { timeout: 30000 })',
  'await expect(guest).toBeVisible({ timeout: 30000 })',
  'await expect(signin).toHaveCount(1, { timeout: 30000 })',
  'await expect(signin).toBeVisible({ timeout: 30000 })',
  'await expect(signin).toBeEnabled({ timeout: 30000 })',
 ]) assert.ok(source.includes(statement), statement)
}
const helperSource = readFileSync(new URL('../scripts/helpers/cabinet-guest-signin-verifier.mjs', import.meta.url), 'utf8')
test('real source guest and readiness contracts', () => {
 assertAuthoredGuestContract(authored); assertReadinessContract(helperSource)
})
for (const [label, from, to] of [
 ['wrong label', "signin: 'Open my Cabinet with Google'", "signin: 'Open with Apple'"],
 ['missing label', "signin: 'Open my Cabinet with Google'", 'signin: undefined'],
 ['wrong marker', 'data-cabinet-guest-overview="true"', 'data-cabinet-guest-overview="false"'],
 ['missing marker', 'data-cabinet-guest-overview="true"', ''],
 ['wrong handler', 'onClick={onSignin}', 'onClick={otherHandler}'],
 ['missing handler', 'onClick={onSignin}', ''],
 ['missing busy guard', 'disabled={busy}', ''],
 ['wrong busy guard', 'disabled={busy}', 'disabled={false}'],
 ['unavailable guard removed', '!unavailable && <button', '<button'],
 ['connecting readiness removed', 'busy ? t.signingIn : t.signin', 't.signin'],
]) test('actual guest-source mutation rejects '+label, () => {
 assert.ok(authored.includes(from)); const mutated = authored.replace(from,to)
 assert.notEqual(mutated,authored); assert.throws(() => assertAuthoredGuestContract(mutated))
})
for (const [label, from, to] of [
 ['enabled check removed', 'await expect(signin).toBeEnabled({ timeout: 30000 })', ''],
 ['visible check removed', 'await expect(guest).toBeVisible({ timeout: 30000 })', ''],
 ['short timeout', 'timeout: 30000', 'timeout: 5000'],
]) test('actual helper-source mutation rejects '+label, () => {
 assertReadinessContract(helperSource)
 assert.throws(() => assertReadinessContract(helperSource.replace(from,to)))
})
test('actual caller-source mutations reject removed actor call and accidental logout click', () => {
 const actor='await (await assertCabinetGuestSignin(otherPage,expect,{origin})).click()'
 const logout='await assertCabinetGuestSignin(page,expect,{origin});await expect(page).toHaveURL'
 function assertCalls(source) { assert.ok(source.includes(actor)); assert.ok(source.includes(logout)) }
 assertCalls(verifier)
 assert.throws(() => assertCalls(verifier.replace(actor,'')))
 assert.throws(() => assertCalls(verifier.replace(logout,'await (await assertCabinetGuestSignin(page,expect,{origin})).click();await expect(page).toHaveURL')))
})
