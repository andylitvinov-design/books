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
  assert.equal(primary.trim(), `Красивое высокогорное растение - Аконит.

Ядовитое. Еще оно называется Борец, Царь-трава, черный корень, черное зелье.

В греческой мифологии связан с Гераклом - отражает слюну Цербера, выскочившего из Царства Аида.
Воины натирали им наконечники стрел в охоте.

Аконит проявляет архетип Стража.${" "}
В гомеотерапии он используется при острых состояниях, боль, шок, испуг, паника, тревога. Полезен при ощущении бессилия и обреченности.

Помогает справиться со стрессами, сердцебиением, чувством уязвимости.

Помогает наработать чувство безопасности, уверенности в себе, состояние Безстрашного стража.`)
  assert.equal(supplementary.split('\n').filter((line) => line.startsWith('- ')).length, 15)
  const en = readFileSync(path.join(projectRoot, 'content/remedies/en/aconitum.md'), 'utf8')
  assert.match(en, /translation_provenance: translated-from-ru/)
  assert.match(en, /Promotional postscript omitted/)
  assert.doesNotMatch(en, /napellus/i)
})
