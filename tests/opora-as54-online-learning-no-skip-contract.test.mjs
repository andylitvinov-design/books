import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const base = 'docs/myspace/'
const digital = read(base + 'HOLISTIC_HOUSE_OPORA_AS54_ONLINE_LEARNING_STANDARD_2026-10-17.md')
const scripts = read(base + 'HOLISTIC_HOUSE_OPORA_AS53_GUIDED_210_SLIDES_RU_2026-10-17.md')
const aphorisms = read(base + 'HOLISTIC_HOUSE_OPORA_AS53_14_APHORISMS_RU_EN_2026-10-17.md')
const as52 = read(base + 'HOLISTIC_HOUSE_OPORA_ANTISTRESS_AS5_2_ALL_210_SCREENS_METHODOLOGY_2026-10-17.md')
const passport = read(base + 'HOLISTIC_HOUSE_OPORA_ANTISTRESS_7_SKILLS_COURSE_PASSPORT_AS5_2026-10-17.md')
const canonical = read(base + 'HOLISTIC_HOUSE_OPORA_COURSE_METHODOLOGY_CANONICAL_2026-10-14.md')
const lessons=[...scripts.matchAll(/^### День (\d+) —[^\n]+\n([\s\S]*?)(?=^### День \d+ —|^## |$(?![\s\S]))/gm)]
const slides = lesson => [...lesson.matchAll(/^#### Экран (\d{2}) — ([^\n]+)\n([\s\S]*?)(?=^#### Экран \d{2} —|^### День |^## |$(?![\s\S]))/gm)]

test('AS-5.4 has exactly fourteen 15-step lessons with 14 meaningful aphorisms',()=>{
  assert.equal(lessons.length,14)
  const rows=aphorisms.split('\n').filter(line=>/^\| \d{1,2} \| S\d \|/.test(line))
  assert.equal(rows.length,14)
  let screenCount=0
  for(const [i,lesson] of lessons.entries()){
    assert.equal(Number(lesson[1]),i+1)
    const frames=slides(lesson[2]); assert.equal(frames.length,15,'day '+(i+1))
    screenCount+=frames.length
    assert.equal(frames[4][2],'Афоризм и голосование')
    const prompt=frames[4][3]
    for(const phrase of ['откликается','сомневаюсь','Не согласен'])
      assert.ok(prompt.toLowerCase().includes(phrase.toLowerCase()),'day '+(i+1)+' vote missing '+phrase)
    assert.match(prompt,/«Далее»/)
  }
  assert.equal(screenCount,210)
})

test('no Skip choice anywhere in new 210 screen response lists, including moment ratings',()=>{
  const allChoiceLines=scripts.split('\n').filter(line=>/^\*\*(Что выбирает\/делает|Кнопки \/ обратная связь):\*\*/.test(line))
  assert.equal(allChoiceLines.length,210)
  for(const [i,line] of allChoiceLines.entries()){
    assert.doesNotMatch(line,/Пропустить|Пропускаю|Skip|skip|Не хочу оценивать/, 'unexpected skip answer in slide '+(i+1))
  }
  for(const lesson of lessons){
    const frames=slides(lesson[2])
    assert.match(frames[1][3],/«Далее»/,'optional moment can continue without a rating')
    assert.match(frames[12][3],/0–10/,'same voluntary moment anchor later')
    for(const i of [7,8,9]){
      const copy=frames[i][3]
      assert.match(copy,/Частично|частично/,'real attempted amount')
      assert.match(copy,/Подсказка|подсказка/,'show contextual assistance')
      assert.match(copy,/Некомфортно|некомфортно|неприятно/,'safe stop')
    }
  }
})

test('AS-5.4 contract separates visible answers from navigation and formative feedback',()=>{
  assert.match(digital,/«Пропустить» УДАЛЕНО/)
  assert.match(digital,/agree\|unsure\|disagree\|null/)
  assert.match(digital,/«Далее»/)
  assert.match(digital,/«Пауза»/)
  assert.match(digital,/«Закончить»/)
  assert.match(digital,/Worked example/)
  assert.match(digital,/Retrieval practice/)
  assert.match(digital,/Formative assessment/)
  assert.match(digital,/Universal Design for Learning/)
  assert.match(digital,/Mayer/)
  assert.match(digital,/CAST/)
  assert.match(digital,/WCAG/)
  assert.match(digital,/Эффективность авторского интегрированного курса ОПОРА пока/)
  assert.equal((as52.match(/^#### Экран 05 — Афоризм и голосование/gm)||[]).length,14)
  assert.doesNotMatch(as52,/aphorismResponse:agree\|unsure\|disagree\|skip/)
  assert.match(passport,/AS-5\.4/)
  assert.match(canonical,/Редакторское дополнение AS-5\.4/)
})

test('source remains version-pinned and old sessions are not silently migrated',()=>{
  const current=read('lib/inner-growth/course-slide-sequence.js')
  const v5=read('lib/inner-growth/anti-stress-skills-v5.js')
  assert.match(current,/OPORA_SKILL_SLIDE_MODEL/)
  assert.match(current,/{key:'guided-practice'/)
  assert.match(v5,/hh-antistress-skills-v5-20261017/)
  assert.match(digital,/не означает выпуск на live/)
  assert.match(digital,/исторический legacy enum/)
})
