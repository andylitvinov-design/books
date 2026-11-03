import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const root=new URL('../',import.meta.url)
const read=path=>readFileSync(new URL(path,root),'utf8')
const path='docs/myspace/HOLISTIC_HOUSE_OPORA_ANTISTRESS_AS5_2_ALL_210_SCREENS_METHODOLOGY_2026-10-17.md'
const body=read(path)
const expectedRoles=[
  'Приветствие','Моментная оценка','Темп и право выбора','Личный фокус',
  'Афоризм и голосование','Показ готового примера','Подготовка',
  'Практика A — заметить','Практика B — сделать','Практика C — повторить',
  'Перенос на новую сцену','Если — то — иначе','Честная обратная связь',
  'Сохранённая карточка','Мой прогресс',
]
const lessons=body.match(/^### День \d+ —.*?(?=^### День \d+ —|^## 5\. Механизмы)/gms)||[]
const screens=lesson=>[...lesson.matchAll(/^#### Экран (\d{2}) — ([^\n]+)/gm)]
test('AS5.2 contains exactly 14 lessons and 15 physical screens each (210 total)',()=>{
  assert.equal(lessons.length,14)
  let total=0
  for(const [dayIndex,lesson] of lessons.entries()){
    assert.match(lesson,new RegExp('^### День '+(dayIndex+1)+' —'))
    const slides=screens(lesson)
    assert.equal(slides.length,15,'day '+(dayIndex+1))
    for(let i=0;i<15;i++){
      assert.equal(slides[i][1],String(i+1).padStart(2,'0'))
      assert.equal(slides[i][2],expectedRoles[i])
    }
    const segments=lesson.split(/^#### Экран \d{2} —[^\n]+$/gm).slice(1)
    assert.equal(segments.length,15)
    for(const segment of segments){
      assert.match(segment,/\*\*На экране и действие:\*\*/)
      assert.match(segment,/\*\*Учебный механизм:\*\*/)
      assert.match(segment,/\*\*Данные\/обратная связь:\*\*/)
      assert.ok(segment.length>220)
    }
    total+=slides.length
  }
  assert.equal(total,210)
})
test('first five kept distinct; 8–11 train four separate operations; result only after save',()=>{
  assert.deepEqual(expectedRoles.slice(0,5),[
    'Приветствие','Моментная оценка','Темп и право выбора','Личный фокус','Афоризм и голосование'])
  assert.deepEqual(expectedRoles.slice(7,11),[
    'Практика A — заметить','Практика B — сделать','Практика C — повторить','Перенос на новую сцену'])
  assert.deepEqual(expectedRoles.slice(-2),['Сохранённая карточка','Мой прогресс'])
  assert.match(body,/Экран 15 может открыться \*\*только после\*\* серверного подтверждения/)
  assert.match(body,/его нельзя ошибочно требовать в `visitedSlideKeys` до сохранения/)
  assert.match(body,/aphorismResponse:agree\|unsure\|disagree\|null/)
  assert.equal((body.match(/^#### Экран 05 — Афоризм и голосование/gm)||[]).length,14)
  assert.equal((body.match(/^#### Экран 05 — Афоризм и голосование/gm)||[]).length,14)
  assert.match(body,/не \*\*\s*выдавать\s*\*\*|не выдавать XP/)
})
test('target time 8–12 minutes is editorial, with ~5m50 of genuine exercise',()=>{
  const budget=[...body.matchAll(/^\| \d{2} \| `[^\n]+` \|[^\n]*?\| (\d+):(\d{2}) \|/gm)]
  assert.equal(budget.length,15)
  const seconds=budget.map(m=>Number(m[1])*60+Number(m[2]))
  assert.equal(seconds.reduce((sum,n)=>sum+n,0),650)
  assert.equal(seconds.slice(7,11).reduce((sum,n)=>sum+n,0),350)
  assert.match(body,/Пилот должен проверять реальное время/)
})
test('AS5.2 is an editorial plan: V5/V3 clients and old records remain untouched',()=>{
  const v5=read('lib/inner-growth/course-slide-sequence.js')
  const as5=read('docs/myspace/HOLISTIC_HOUSE_OPORA_ANTISTRESS_7_SKILLS_COURSE_PASSPORT_AS5_2026-10-17.md')
  const archived=read('docs/myspace/HOLISTIC_HOUSE_OPORA_ANTISTRESS_AS5_1_ALL_98_SLIDES_METHODOLOGY_2026-10-17.md')
  assert.match(v5,/OPORA_SKILL_SLIDE_MODEL/)
  assert.match(v5,/{key:'guided-practice'/)
  assert.match(as5,/AS-5\.2/)
  assert.match(as5,/AS5_2_ALL_210_SCREENS/)
  assert.match(archived,/SUPERSEDED/)
  assert.match(body,/AS4 только с квалифицированным специалистом/)
  assert.match(body,/не опубликованная runtime-реализация/)
  assert.match(body,/не принуждать|не проводит экспозицию|не заставляет раскрывать травматическую историю/)
})
