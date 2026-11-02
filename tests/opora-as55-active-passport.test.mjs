import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')

test('the canonical OPORA passport has one active fifteen-screen AS-5.5 model, not historical seven screens',()=>{
  const doc=read('docs/myspace/HOLISTIC_HOUSE_OPORA_ANTISTRESS_7_SKILLS_COURSE_PASSPORT_AS5_2026-10-17.md')
  assert.match(doc,/рабочий паспорт AS-5\.5/)
  assert.match(doc,/hh-antistress-skills-v7-20261018/)
  assert.match(doc,/## 3\. Активный контракт AS-5\.5: 14 дней × 15 экранов/)
  const active=doc.split('## 3. Активный контракт AS-5.5: ')[1].split('## 4. Пользовательский результат')[0]
  assert.equal((active.match(/^\| \d{1,2} \|/gm)||[]).length,15)
  assert.doesNotMatch(active,/Вся последовательность помещается в \*\*семь интерактивных экранов\*\*/)
  assert.match(active,/14.*15/)
  assert.match(active,/получилось|Получилось/)
  assert.match(active,/конкретн/)
  assert.match(active,/нет ответа «Пропустить»|нет.*«Пропустить»/)
  assert.match(active,/Только server-confirmed save/)
  assert.match(doc,/39139177668/)
  assert.match(doc,/ecc444cfaaf313672184e26f7f97054de6ea1b68/)
  assert.match(doc,/\[ \] Реальный \*\*авторизованный проход на iPhone\*\*/)
})

test('pre-save and saved V7 receipts distinguish actual exercise selection from attempted action',()=>{
  const player=read('components/app/opora-v6-slide-player.jsx')
  assert.match(player,/function oporaLearningReceipt\(/)
  assert.match(player,/выбранное упражнение|Выбранное упражнение/)
  assert.match(player,/Отчёт о попытке/)
  assert.match(player,/Пока не получилось/)
  assert.match(player,/Возможный план на будущее/)
  assert.match(player,/data-opora-save-preview/)
  assert.match(player,/data-opora-real-choice-summary/)
  assert.match(player,/receiptRows\.length\?receiptRows\.map/)
  assert.match(player,/не оценка здоровья и не доказательство освоения/)
  assert.doesNotMatch(player,/100% освоено/)
})
