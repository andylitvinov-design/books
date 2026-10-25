import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parse, descendants, sourceModule, jsx, nodes, text, ts} from './helpers/current-source-render.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('owner daily report CTA reports pending state on mobile instead of silently ignoring a tap',()=>{
  const button=read('app/admin/telegram-setup/send-daily-council-button.jsx')
  assert.match(button,/^'use client'/)
  assert.match(button,/import \{useFormStatus\} from 'react-dom'/)
  assert.match(button,/const \{pending\}=useFormStatus\(\)/)
  assert.match(button,/disabled=\{disabled\|\|pending\}/)
  assert.match(button,/aria-busy=\{pending\}/)
  assert.match(button,/aria-live="polite"/)
  assert.match(button,/Sending report…/)
  assert.match(button,/Отправляем отчёт…/)
  assert.match(button,/Do not submit again/)
})

test('accepted today cannot trigger another report but keeps the real model statuses visible',()=>{
  const page=read('app/admin/telegram-setup/page.js')
  const setup=read('lib/practitioners/telegram-owner-setup.js')
  assert.match(page,/getTorontoCompletedPeriod\(\)\.today/)
  assert.match(page,/state\.council\?\.date===todayToronto/)
  assert.match(page,/state\.council\?\.status==='accepted'/)
  assert.match(page,/!acceptedToday&&!activeSendingToday/)
  assert.match(page,/acceptedToday\s*\?\s*<div className=\{styles\.sentNotice\}/)
  assert.match(page,/state\.council\.gemini/)
  assert.match(page,/state\.council\.mistral/)
  assert.match(page,/https:\/\/t\.me\/Andydotbot/)
  assert.match(setup,/active_claim:council\.active_claim===true/)
  assert.match(setup,/claimed_at>now\(\)-interval '15 minutes'/)
  assert.match(setup,/chatgpt:council\.model_outcomes\?\.chatgpt/)
})

test('redirect after Council submission anchors to result beside original CTA, not top of long screen',()=>{
  const actions=read('app/admin/telegram-setup/actions.js')
  const page=read('app/admin/telegram-setup/page.js')
  assert.match(actions,/status\.startsWith\('council_'\)\?'#daily-council-report'/)
  assert.match(actions,/'council_sent','council_partial','council_duplicate'/)
  assert.match(page,/id="daily-council-report"/)
  assert.match(page,/dailyResult&&<p className=\{styles\.result\} role="status">/)
  assert.match(page,/displayResult&&!dailyResult/)
  assert.match(page,/action=\{sendDailyCouncilReportAction\}/)
})

test('no new bot, paid provider, manual public endpoint or Cron replacement is introduced',()=>{
  const route=read('app/api/internal/council-archive-telegram/route.js')
  const page=read('app/admin/telegram-setup/page.js')
  const config=JSON.parse(read('vercel.json'))
  assert.match(route,/cronAuthorized\(request,process\.env\)/)
  assert.match(page,/requireAdminRequest\(\)/)
  assertNoSecretReferences(page)
  assert.deepEqual(config.crons.filter(x=>x.path.includes('council-archive-telegram')),
    [{path:'/api/internal/council-archive-telegram',schedule:'0 21 * * *'}])
  const css=read('app/admin/telegram-setup/telegram-setup.module.css')
  assert.match(css,/\.sendPanel\{scroll-margin-top:/)
  assert.match(css,/\.botLink\{[^}]*min-height:44px/)
})

const secretField = /^(?:chat_?id|api_?key|.*(?:API_KEY|BOT_TOKEN)|chat_ciphertext|mistral_key_ciphertext)$/i
function assertNoSecretReferences(source) {
  for (const node of descendants(parse(source, 'telegram-setup-page.jsx'))) {
    const propertyString = ts.isStringLiteral(node) && (
      ts.isElementAccessExpression(node.parent) || node.parent.name === node)
    if (ts.isIdentifier(node) || propertyString) {
      assert.doesNotMatch(node.text, secretField, 'Secret identifier in setup page: ' + node.text)
    }
  }
}
function actualFunction(path, name, bindings) {
  const file = parse(read(path), path)
  const functions = file.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name)
  assert.equal(functions.length, 1, 'Exactly one actual ' + name)
  return sourceModule(functions[0].getText(file), path, {}, bindings)[name]
}
const secret = 'SYNTHETIC_SECRET_MUST_NOT_LEAVE_SERVER'
const sensitiveFields = { chat_id: secret, chatId: secret, apiKey: secret,
  OPENROUTER_API_KEY: secret, chat_ciphertext: secret, mistral_key_ciphertext: secret }
const plain = value => JSON.parse(JSON.stringify(value))
function assertSafeDto(value, expectedKeys) {
  assert.deepEqual(Object.keys(value).sort(), [...expectedKeys].sort())
  const visit = object => {
    for (const [key, value] of Object.entries(object)) {
      assert.doesNotMatch(key, secretField)
      if (value && typeof value === 'object') visit(value)
    }
  }
  visit(value)
  assert.ok(!JSON.stringify(value).includes(secret), 'Synthetic secret leaked through DTO')
}

test('actual owner status/readiness DTOs project only status fields, never synthetic secrets', async () => {
  const telegramStatus = actualFunction('lib/practitioners/telegram-owner-setup.js', 'ownerTelegramSetupStatus', {
    record: async () => ({ status: 'chat_identity_unverified', test_status: 'not_sent', test_accepted: false, ...sensitiveFields }),
    latestCouncilReceipt: async () => ({ day: '2026-10-25', status: 'accepted', active_claim: false,
      model_outcomes: { gemini: 'ok', mistral: 'unavailable', chatgpt: 'ok', ...sensitiveFields }, ...sensitiveFields }),
  })
  const status = plain(await telegramStatus({}, { HH_PRACTICE_TG_BOT_TOKEN: secret, HH_PRACTICE_TG_ENABLED: 'true' }))
  assertSafeDto(status, ['council','token_saved','telegram_enabled','pairing','test','test_accepted'])
  assertSafeDto(status.council, ['date','status','gemini','mistral','chatgpt','active_claim'])
  assert.equal(status.pairing, 'chat_identity_unverified')
  assert.equal(status.token_saved, true)
  assert.equal(status.council.gemini, 'ok')
  const probes = []
  const readiness = actualFunction('lib/practitioners/owner-ai-provider-settings.js', 'ownerAiProviderReadiness', {
    savedRow: async () => ({ gemini_free_confirmed_at: 'synthetic-date', mistral_free_confirmed_at: 'synthetic-date', ...sensitiveFields }),
    MISTRAL_CONTEXT: {}, MISTRAL_KEY: /^[\x21-\x7e]{24,512}$/,
    openSealed: ciphertext => { assert.equal(ciphertext, secret); return { apiKey: secret } },
    inspectGeminiModelAccess: async env => {
      assert.equal(env.HH_COUNCIL_GEMINI_API_KEY, secret); probes.push('gemini')
      return { modelReady: true, reason: 'ready', ...sensitiveFields }
    },
    inspectMistralStudioKey: async key => {
      assert.equal(key, secret); probes.push('mistral')
      return { status: 'ready', model: 'synthetic-model', ...sensitiveFields }
    },
  })
  const provider = plain(await readiness({}, { HH_COUNCIL_GEMINI_API_KEY: secret,
    HH_COUNCIL_OPENROUTER_API_KEY: secret }, () => assert.fail('Network forbidden')))
  assertSafeDto(provider, ['geminiKeyPresent','geminiFreeConfirmed','geminiModelProbeStatus',
    'mistralStudioKeyPresent','mistralFreeConfirmed','mistralStudioProbeStatus',
    'mistralStudioProbeModel','mistralOpenRouterKeyPresent'])
  assert.deepEqual(probes.sort(), ['gemini','mistral'])
  assert.equal(provider.mistralStudioProbeModel, 'synthetic-model')
  assert.equal(provider.geminiModelProbeStatus, 'ready')
  for (const field of Object.keys(sensitiveFields)) {
    assert.throws(() => assertSafeDto({ ...status, [field]: secret }, Object.keys(status)))
  }
})

async function setupPageFixture({ authorized = true, ru = false, accepted = false } = {}) {
  const calls = []
  const forbidden = () => assert.fail('No action, network, provider or database operation is allowed')
  const status = { token_saved: true, telegram_enabled: true, pairing: 'chat_identity_unverified',
    test: 'not_sent', test_accepted: false, ...sensitiveFields,
    council: { date: '2026-10-25', status: accepted ? 'accepted' : 'sending',
      active_claim: !accepted, gemini: 'ok', mistral: 'unavailable', chatgpt: 'ok', ...sensitiveFields } }
  const provider = { geminiKeyPresent: true, geminiFreeConfirmed: true, geminiModelProbeStatus: 'ready',
    mistralStudioKeyPresent: true, mistralFreeConfirmed: true, mistralStudioProbeStatus: 'ready',
    mistralStudioProbeModel: 'synthetic-model', mistralOpenRouterKeyPresent: true, ...sensitiveFields }
  const modules = {
    'react/jsx-runtime': jsx,
    'next/link': { default: props => ({ type: 'a', props }) },
    'next/headers': { cookies: async () => { calls.push('cookies'); return { get: () => ({ value: ru ? 'ru' : 'en' }) } } },
    'next/navigation': { redirect: path => { assert.equal(path, '/admin/login'); throw Error('SYNTHETIC_REDIRECT') } },
    '@/components/prescription-admin-header': { PrescriptionAdminHeader: () => null },
    '@/lib/prescriptions/admin': { requireAdminRequest: async () => { calls.push('auth'); return authorized } },
    '@/lib/ui-locale': { uiLocaleCookie: 'synthetic-locale' },
    '@/lib/practitioners/daily-digest.mjs': { getTorontoCompletedPeriod: () => ({ today: '2026-10-25' }) },
    '@/lib/app/config': { getAppConfig: () => { calls.push('config'); return {} } },
    '@/lib/practitioners/telegram-owner-setup': { ownerTelegramSetupStatus: async () => { calls.push('status'); return status } },
    '@/lib/practitioners/council-free-models.mjs': { modelSettings: () => { calls.push('models'); return {} } },
    '@/lib/practitioners/owner-ai-provider-settings': { ownerAiProviderReadiness: async () => { calls.push('readiness'); return provider } },
    './actions': { sendDailyCouncilReportAction: forbidden, saveOwnerFreeProviderAction: forbidden,
      disableOwnerFreeProviderAction: forbidden, checkTelegramConnectionAction: forbidden, connectAndTestTelegramAction: forbidden },
    './telegram-setup.module.css': { default: {} },
    './send-daily-council-button': { SendDailyCouncilButton: () => null },
  }
  const page = sourceModule(read('app/admin/telegram-setup/page.js'), 'telegram-setup-page.jsx', modules,
    { process: { env: { OPENROUTER_API_KEY: secret, HH_COUNCIL_OPENROUTER_API_KEY: secret } } }).default
  if (!authorized) {
    await assert.rejects(page({ searchParams: Promise.resolve({}) }), /SYNTHETIC_REDIRECT/)
    assert.deepEqual(calls, ['auth'], 'No status or provider work before authentication')
    return
  }
  const tree = await page({ searchParams: Promise.resolve({}) })
  assert.equal(calls[0], 'auth')
  assert.ok(calls.includes('status') && calls.includes('readiness'))
  assert.ok(!JSON.stringify(tree).includes(secret), 'Synthetic secret leaked into rendered tree/props')
  const password = nodes(tree).filter(node => node.type === 'input' && node.props.name === 'mistral_key')
  assert.equal(password.length, 1)
  assert.equal(password[0].props.type, 'password')
  assert.equal(password[0].props.value, undefined, 'Stored API key must never prefill the input')
  assert.equal(password[0].props.defaultValue, undefined)
  assert.match(text(tree), ru ? /Личный чат не подтверждён/ : /Private chat could not be verified/)
  if (accepted) assert.match(text(tree), /ChatGPT: ok · Gemini: ok · Mistral: unavailable/)
}

test('authenticated setup page renders safe statuses in both languages without secret DTO props', async () => {
  for (const ru of [false, true]) for (const accepted of [false, true]) await setupPageFixture({ ru, accepted })
  await setupPageFixture({ authorized: false })
})

test('page privacy AST guard rejects real secret property references, not the unverified status enum', () => {
  const page = read('app/admin/telegram-setup/page.js')
  assertNoSecretReferences(page)
  for (const expression of ['state.chat_id','state["chat_id"]','provider.apiKey',
    'process.env.OPENROUTER_API_KEY','process.env.HH_COUNCIL_OPENROUTER_API_KEY']) {
    assert.throws(() => assertNoSecretReferences(page.replace('return <main', 'return <main data-leak={' + expression + '}')),
      /Secret identifier/)
  }
})
