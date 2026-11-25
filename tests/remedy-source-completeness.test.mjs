import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { missingRequiredSections } from '../scripts/remedy-source-completeness.mjs'

const projectRoot = process.cwd()

function body(filePath) {
  return readFileSync(filePath, 'utf8').replace(/^---\n[\s\S]*?\n---\n+/, '').trim()
}

test('detects source-card sections that are missing from canonical content', () => {
  const primary = 'ОСНОВА:\nМышьяк.\n\nЭФФЕКТ:\nСпокойствие.\n\nАРХЕТИП:\nКонтролёр.\n\nТЕНЬ:\nСтрах.\n\nРЕСУРС:\nДоверие.\n\nВНУТРЕННИЙ КОНФЛИКТ:\nПорядок и хаос.\n\nОБРАЗ:\nДом.'
  assert.deepEqual(missingRequiredSections(primary, 'ОСНОВА:\nМышьяк.\n\nЭФФЕКТ:\nСпокойствие.'), ['ОБРАЗ', 'АРХЕТИП', 'ТЕНЬ', 'РЕСУРС', 'ВНУТРЕННИЙ КОНФЛИКТ'])
})

test('Arsenicum Album preserves the complete message188 source card', () => {
  const arsenicum = body(path.join(projectRoot, 'content/remedies/ru/arsenicum-album.md'))
  for (const section of ['ОСНОВА', 'ЭФФЕКТ', 'ОБРАЗ', 'АРХЕТИП', 'ТЕНЬ', 'РЕСУРС', 'ВНУТРЕННИЙ КОНФЛИКТ']) {
    assert.match(arsenicum, new RegExp(section, 'u'), `Arsenicum Album must retain ${section} from message188`)
  }
})

test('Aconitum keeps the reviewed message31 primary paragraphs separate from source references', () => {
  const ru = body(path.join(projectRoot, 'content/remedies/ru/aconitum.md'))
  const [primary, supplementary] = ru.split('## Дополнительные материалы и наблюдения')
  const expectedPrimary = `Красивое высокогорное растение - Аконит.

Ядовитое. Еще оно называется Борец, Царь-трава, черный корень, черное зелье.

В греческой мифологии связан с Гераклом - отражает слюну Цербера, выскочившего из Царства Аида.
Воины натирали им наконечники стрел в охоте.

Аконит проявляет архетип Стража.${" "}
В гомеотерапии он используется при острых состояниях, боль, шок, испуг, паника, тревога. Полезен при ощущении бессилия и обреченности.

Помогает справиться со стрессами, сердцебиением, чувством уязвимости.

Помогает наработать чувство безопасности, уверенности в себе, состояние Безстрашного стража.`
  const reflectionAddition = "\n\n## ТРАНСФОРМАЦИЯ\n\nОбраз для самонаблюдения, а не обещание лечебного действия препарата.\n\nДо: Испуг и чувство уязвимости: перед опасностью кажется, что нет ни сил, ни опоры.\n\nПосле (желаемое состояние): Спокойная смелость и уверенность в себе: внутренний страж чувствует опору и готов встретить трудность."
  const assertReviewedPrimary = (value) => {
    assert.equal(value.split(reflectionAddition).length - 1, 1, 'exactly one reviewed reflective addition')
    assert.ok(value.endsWith(`${reflectionAddition}\n\n`), 'reflective addition stays separate at the end of the primary card')
    assert.equal(value.replace(reflectionAddition, '').trim(), expectedPrimary, 'all reviewed message31 paragraphs remain exact')
  }
  assertReviewedPrimary(primary)
  assert.throws(() => assertReviewedPrimary(primary.replace('Красивое', 'Изменённое')), 'reject changed original source text')
  assert.throws(() => assertReviewedPrimary(primary.replace(reflectionAddition, '')), 'reject missing reflective addition')
  assert.throws(() => assertReviewedPrimary(primary + reflectionAddition + '\n\n'), 'reject duplicate reflective addition')
  assert.equal(supplementary.split('\n').filter((line) => line.startsWith('- ')).length, 15)
  const en = readFileSync(path.join(projectRoot, 'content/remedies/en/aconitum.md'), 'utf8')
  assert.match(en, /translation_provenance: translated-from-ru/)
  assert.match(en, /Promotional postscript omitted/)
  assert.doesNotMatch(en, /napellus/i)
})
