// Owner-only, fail-closed Russian output adapter for Telegram AI Council.
// Reuses the existing public-translate provider (translate.googleapis.com),
// not a paid model/API. No questions, client records, keys or chat metadata
// are sent to the translator; only already-generated, anonymized AI text.
const FOREIGN_SCRIPTS = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u
const CYRILLIC = /\p{Script=Cyrillic}/gu
const LATIN = /[A-Za-z]/g
const TRANSLATION_ERROR = 'Не удалось перевести ответ на русский язык'
const TRANSLATION_URL = 'https://translate.googleapis.com/translate_a/single'

export function needsOwnerRussianTranslation(value) {
  const text = String(value || '').trim()
  if (!text) return false
  if (FOREIGN_SCRIPTS.test(text)) return true
  const cyrillic = (text.match(CYRILLIC) || []).length
  const latin = (text.match(LATIN) || []).length
  // Keep code names/model IDs as-is. Translate substantive English prose.
  return latin >= 35 && cyrillic < Math.max(8, latin * 0.7)
}

function russianVerified(value) {
  const text = String(value || '').trim()
  if (!text || FOREIGN_SCRIPTS.test(text)) return false
  const cyrillic = (text.match(CYRILLIC) || []).length
  const latin = (text.match(LATIN) || []).length
  return cyrillic >= 8 && cyrillic >= latin * 0.6
}

// Translation is bounded by the current model text cap and never retries on
// ambiguous timeout. A failed translation is NOT sent to the owner verbatim.
export async function ensureOwnerRussianText(value, fetcher = fetch) {
  const text = String(value || '').trim().slice(0, 6000)
  if (!text) throw Error('RUSSIAN_TEXT_EMPTY')
  if (!needsOwnerRussianTranslation(text)) return text
  const chars = Array.from(text)
  const chunks = []
  for (let i = 0; i < chars.length; i += 2600) chunks.push(chars.slice(i, i + 2600).join(''))
  const output = []
  for (const chunk of chunks) {
    const url = new URL(TRANSLATION_URL)
    url.searchParams.set('client', 'gtx')
    url.searchParams.set('sl', 'auto')
    url.searchParams.set('tl', 'ru')
    url.searchParams.set('dt', 't')
    url.searchParams.set('q', chunk)
    const response = await fetcher(url.toString(), {
      method: 'GET', cache: 'no-store', redirect: 'error',
      signal: AbortSignal.timeout(8500),
      headers: {accept: 'application/json'}
    })
    if (!response.ok) throw Error('RUSSIAN_TRANSLATION_UNAVAILABLE')
    const data = await response.json().catch(() => null)
    const translated = Array.isArray(data?.[0])
      ? data[0].map(item => Array.isArray(item) ? String(item[0] || '') : '').join('')
      : ''
    if (!russianVerified(translated)) throw Error('RUSSIAN_TRANSLATION_UNVERIFIED')
    output.push(translated)
  }
  const translated = output.join('').trim()
  if (!russianVerified(translated)) throw Error('RUSSIAN_TRANSLATION_UNVERIFIED')
  return translated
}

export async function normalizeOwnerCouncilRussian(run, fetcher = fetch) {
  const reviews = {...(run.reviews || {})}
  await Promise.all(Object.entries(reviews).map(async ([slot, reply]) => {
    if (reply?.status !== 'ok' || typeof reply.text !== 'string') return
    try {
      const translated = await ensureOwnerRussianText(reply.text.slice(0, 3200), fetcher)
      if (translated.length < 60) throw Error('RUSSIAN_TRANSLATION_TOO_SHORT')
      reviews[slot] = {...reply, text: translated}
    } catch {
      reviews[slot] = {...reply, status: 'error', reason: TRANSLATION_ERROR, text: ''}
    }
  }))
  let synthesis = run.synthesis || {}
  if (synthesis.status === 'ok' && synthesis.parsed) {
    const p = synthesis.parsed
    try {
      const translate = value => ensureOwnerRussianText(value, fetcher)
      const [answer, shared, differences, actions, unknowns] = await Promise.all([
        translate(p.answer),
        Promise.all((p.shared || []).map(async row => ({...row, point: await translate(row.point)}))),
        Promise.all((p.differences || []).map(async row => ({...row, point: await translate(row.point)}))),
        Promise.all((p.actions || []).map(async row => {
          const [step, why, check] = await Promise.all([
            translate(row.step), translate(row.why), translate(row.check)
          ])
          return {...row, step, why, check}
        })),
        Promise.all((p.unknowns || []).map(translate))
      ])
      synthesis = {...synthesis, parsed: {...p, answer, shared, differences, actions, unknowns}}
    } catch {
      synthesis = {status: 'error', model: synthesis.model, reason: TRANSLATION_ERROR}
    }
  }
  const count = Object.values(reviews).filter(reply => reply?.status === 'ok').length
  return {...run, reviews, synthesis, count,
    status: run.status === 'unavailable' ? 'unavailable' :
      count === 4 && synthesis.status === 'ok' ? 'complete' : 'partial'}
}

export async function normalizeOwnerLegacyRussian(reviews, fetcher = fetch) {
  const localized = {...(reviews || {})}
  await Promise.all(Object.entries(localized).map(async ([slot, reply]) => {
    if (reply?.status !== 'ok' || typeof reply.text !== 'string') return
    try {
      localized[slot] = {...reply, text: await ensureOwnerRussianText(reply.text.slice(0, 2300), fetcher)}
    } catch {
      localized[slot] = {...reply, status: 'error', reason: TRANSLATION_ERROR, text: ''}
    }
  }))
  return localized
}

// Static English document labels are presentation, not model content. Keep
// model identifiers, technical error codes and exact source attribution.
export function russianOwnerCouncilReport(report, question = '') {
  const russianNames = text => [
    ['UX / Qwen3.8 27B', 'Интерфейс / Qwen3.8 27B'],
    ['Strategy / Dots3 Note', 'Стратегия / Dots3 Note'],
    ['Engineering / North Mini Code', 'Разработка / North Mini Code'],
    ['Independent critic / Xing4', 'Независимый критик / Xing4'],
    ['Deep synthesis / Google Gemma 4 31B', 'Итоговый аналитик / Google Gemma 4 31B'],
    ['Deep synthesis / Google Gemma 4 26B', 'Итоговый аналитик / Google Gemma 4 26B']
  ].reduce((value, [en, ru]) => value.replaceAll(en, ru), String(text || ''))
  const markdown = russianNames(String(report.markdown || '')
    .replace(/^# AI Council · 4 independent reviews \+ separate 5th synthesis/m,
      '# Совет ИИ · четыре независимых заключения и пятый итоговый анализ')
    .replace(/^Question: /m, 'Вопрос: ')
    .replace(/^Result: 4\+1 complete/m, 'Результат: полный анализ 4+1')
    .replace(/^Result: DEGRADED/m, 'Результат: неполный анализ')
    .replace(/^## 5th model · /m, '## Пятая модель · ')
    .replaceAll('[NO VERIFIED REPLY: ', '[Нет подтверждённого ответа: ')
    .replaceAll('[NO VERIFIED SYNTHESIS: ', '[Нет подтверждённого итога: ')
    .replace(/These are model opinions, not proven user journeys, code changes, therapy, diagnoses or client facts\./g,
      'Это мнения моделей, а не подтверждённые действия, изменения кода, лечение, диагнозы или сведения о клиентах.'))
  return {...report, short: russianNames(report.short), markdown:
    needsOwnerRussianTranslation(question)
      ? markdown.replace(/(^Вопрос: )[\s\S]*?(\n\nРезультат: )/m,
          '$1Вопрос пользователя получен; исходный текст не повторяется.$2')
      : markdown}
}
