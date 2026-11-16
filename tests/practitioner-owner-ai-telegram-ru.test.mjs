import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
 needsOwnerRussianTranslation, ensureOwnerRussianText,
 normalizeOwnerCouncilRussian, normalizeOwnerLegacyRussian, russianOwnerCouncilReport
} from '../lib/practitioners/owner-ai-telegram-ru.mjs'

const chinese = '具体建议（3–5项）。请检查代理的可追溯日志、执行状态和用户通知，确保每条任务有明确负责人和验收标准。'
const russian = 'Рекомендую проверить журнал действий каждого агента, состояния выполнения и уведомления пользователя.'
const response = (text = russian) => ({ok: true, json: async () => [[[text, null, null]]]})
const calls = []
const translatingFetch = async (url, opts) => {
  const u = new URL(url)
  assert.equal(u.origin, 'https://translate.googleapis.com')
  assert.equal(u.searchParams.get('sl'), 'auto')
  assert.equal(u.searchParams.get('tl'), 'ru')
  assert.equal(opts.method, 'GET')
  calls.push(url)
  return response(russian)
}

test('Chinese, Korean, English prose requires translation; Russian with code names does not', () => {
  assert.equal(needsOwnerRussianTranslation(chinese), true)
  assert.equal(needsOwnerRussianTranslation('다중 에이전트 테스트 보고서를 요약하세요'), true)
  assert.equal(needsOwnerRussianTranslation('Implement an explicit state machine with audit trails and reproducible checks.'), true)
  assert.equal(needsOwnerRussianTranslation('Проверьте GitHub PR, LangChain и OpenClaw, сохраните логи.'), false)
})

test('translation outputs Russian using existing provider, fails closed for Chinese output', async () => {
  assert.equal(await ensureOwnerRussianText(chinese, translatingFetch), russian)
  assert.equal(calls.length, 1)
  assert.equal(await ensureOwnerRussianText(russian, () => {throw Error('unexpected')}), russian)
  await assert.rejects(() => ensureOwnerRussianText(chinese, async () => response(chinese)),
    /RUSSIAN_TRANSLATION_UNVERIFIED/)
})

test('Council translates reviews and synthesis fields, never sends untranslated Chinese', async () => {
  const run = {status: 'complete', count: 4,
    reviews: {ux: {status: 'ok', text: chinese, model: 'qwen/qwen3:free'},
      product: {status: 'ok', text: russian, model: 'dots/dots:free'}},
    synthesis: {status: 'ok', model: 'google/gemma:free', parsed: {
      answer: chinese, shared: [{point: chinese, from: ['ux', 'product']}],
      differences: [], actions: [{step: chinese, why: chinese, check: chinese}], unknowns: [chinese]
    }}}
  const result = await normalizeOwnerCouncilRussian(run, translatingFetch)
  assert.equal(result.reviews.ux.text, russian)
  assert.equal(result.synthesis.parsed.answer, russian)
  assert.equal(result.synthesis.parsed.actions[0].check, russian)
  assert.equal(result.status, 'partial') // Only two synthetic reviewers in fixture.
})

test('translator outage prevents leaking foreign response into Telegram', async () => {
  const fail = async () => ({ok: false, status: 429})
  const run = {status: 'complete', count: 1,
    reviews: {ux: {status: 'ok', text: chinese}},
    synthesis: {status: 'ok', model: 'google/gemma:free', parsed: {
      answer: chinese, actions: [], shared: [], differences: [], unknowns: []}}}
  const result = await normalizeOwnerCouncilRussian(run, fail)
  assert.equal(result.reviews.ux.text, '')
  assert.equal(result.reviews.ux.status, 'error')
  assert.match(result.reviews.ux.reason, /перевести/)
  assert.equal(result.synthesis.status, 'error')
  const legacy = await normalizeOwnerLegacyRussian({free:{status:'ok',text:chinese}}, fail)
  assert.equal(legacy.free.text, '')
})

test('full Markdown document uses Russian labels with exact model identities', () => {
  const markdown = '# AI Council · 4 independent reviews + separate 5th synthesis\n\nQuestion: Как исправить?\nResult: DEGRADED\n\n[NO VERIFIED REPLY: HTTP 429]\n\n## 5th model · google/gemma-4-31b-it:free\n[NO VERIFIED SYNTHESIS: HTTP 429]\nThese are model opinions, not proven user journeys, code changes, therapy, diagnoses or client facts.'
  const updated = russianOwnerCouncilReport({short:russian, markdown})
  assert.match(updated.markdown, /# Совет ИИ/)
  assert.match(updated.markdown, /Нет подтверждённого итога: HTTP 429/)
  assert.match(updated.markdown, /google\/gemma-4-31b-it:free/)
  assert.doesNotMatch(updated.markdown, /NO VERIFIED|These are model opinions/)
})

test('question acknowledgement precedes model inference and every delivery normalizes Russian', () => {
  const service = readFileSync(new URL('../lib/practitioners/owner-ai-telegram-service.js', import.meta.url), 'utf8')
  const ack = service.indexOf('⏳ Запрос принят.')
  const model = service.indexOf('runOwnerCouncilFive(event.question,aiEnv,fetcher)')
  assert.ok(ack > 0 && ack < model)
  assert.match(service, /normalizeOwnerCouncilRussian/)
  assert.match(service, /normalizeOwnerLegacyRussian/)
  assert.match(service, /russianOwnerCouncilReport/)
})
