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
