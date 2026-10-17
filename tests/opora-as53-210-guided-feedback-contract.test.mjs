import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const root=new URL('../',import.meta.url)
const read=path=>readFileSync(new URL(path,root),'utf8')
const DIR='docs/myspace/'
const script=read(DIR+'HOLISTIC_HOUSE_OPORA_AS53_GUIDED_210_SLIDES_RU_2026-10-17.md')
const guide=read(DIR+'HOLISTIC_HOUSE_OPORA_TRAUMA_INFORMED_SLIDE_AUTHORING_STANDARD_AS53_2026-10-17.md')
const quotes=read(DIR+'HOLISTIC_HOUSE_OPORA_AS53_14_APHORISMS_RU_EN_2026-10-17.md')
const prior=read(DIR+'HOLISTIC_HOUSE_OPORA_ANTISTRESS_AS5_2_ALL_210_SCREENS_METHODOLOGY_2026-10-17.md')
const canonical=read(DIR+'HOLISTIC_HOUSE_OPORA_COURSE_METHODOLOGY_CANONICAL_2026-10-14.md')
const passport=read(DIR+'HOLISTIC_HOUSE_OPORA_ANTISTRESS_7_SKILLS_COURSE_PASSPORT_AS5_2026-10-17.md')
const lessons=[...script.matchAll(/^### День (\d+) —[^\n]+\n([\s\S]*?)(?=^### День \d+ —|^## |$(?![\s\S]))/gm)]
const screens=s=>[...s.matchAll(/^#### Экран (\d{2}) — ([^\n]+)\n([\s\S]*?)(?=^#### Экран \d{2} —|^### День |^## |$(?![\s\S]))/gm)]
const roleNames=[
  'Приветствие','Моментная оценка','Темп и безопасность','Личный фокус',
  'Афоризм и голосование','Пример действия','Подготовка','Пробую заметить',
  'Выполняю практику','Повторяю по выбору','Новая ситуация',
  'Применение в жизни','Рефлексия и адаптация','Сохранение','Прогресс',
]

test('every one of 14 days has 15 nonempty screen scripts and response branches',()=>{
  assert.equal(lessons.length,14)
  let total=0
  for(const [i,d] of lessons.entries()){
    assert.equal(Number(d[1]),i+1)
    const cards=screens(d[2])
    assert.equal(cards.length,15,'day '+(i+1))
    for(let j=0;j<15;j++){
      assert.equal(Number(cards[j][1]),j+1,'screen order in day '+(i+1))
      assert.equal(cards[j][2],roleNames[j], 'screen role in day '+(i+1))
      const content=cards[j][3]
      assert.match(content,/\*\*(Текст участнику|Текст и действие):\*\*/, 'visible copy for '+(i+1)+':'+(j+1))
      assert.match(content,/\*\*(Что выбирает\/делает|Кнопки \/ обратная связь):\*\*/, 'action for '+(i+1)+':'+(j+1))
      assert.match(content,/\*\*(Ответ системы|Поддерживающий ответ):\*\*/, 'supportive feedback '+(i+1)+':'+(j+1))
      assert.match(content,/\*\*(Механизм|Модель):\*\*/, 'pedagogy '+(i+1)+':'+(j+1))
      assert.match(content,/\*\*Альтернатива:\*\*/, 'safe alternative '+(i+1)+':'+(j+1))
      assert.ok(content.length>180,'screen has real details '+(i+1)+':'+(j+1))
    }
    total+=cards.length
  }
  assert.equal(total,210)
})

test('all fourteen aphorism slides have genuine voluntary voting, no forced agreement, and EN/RU catalogue',()=>{
  const rows=quotes.split('\n').filter(line=>/^\| \d{1,2} \| S\d \|/.test(line))
  assert.equal(rows.length,14)
  for(const [index,d] of lessons.entries()){
    const aph=screens(d[2])[4][3]
    assert.match(aph,/соглас|Соглас|отклика|Отклика/)
    assert.match(aph,/Сомневаю|сомневаю|сомнева/)
    assert.match(aph,/Не согласен|не согласен|Несоглас/)
    assert.doesNotMatch(aph,/«Пропустить»/)
    assert.doesNotMatch(aph,/aphorismResponse:\s*skip/)
    assert.match(aph,/нейтральн|нейтральн|Ваш взгляд|Ваше мнение|Не нужно менять/)
    const row=rows[index].split('|').map(x=>x.trim())
    assert.equal(Number(row[1]),index+1)
    assert.equal(row[2],'S'+((index%7)+1))
    assert.ok(row[3].length>28,'RU quote missing')
    assert.ok(row[4].length>28,'EN quote missing')
    assert.ok(row[5].length>26,'RU neutral quote missing')
    assert.ok(row[6].length>26,'EN neutral quote missing')
  }
  assert.equal((prior.match(/^#### Экран 05 — Афоризм и голосование/gm)||[]).length,14)
  assert.doesNotMatch(prior,/aphorismResponse:agree\|unsure\|disagree\|skip/)
})

test('each practice has true attempts, hints or neutral alternatives, not a required clinical number',()=>{
  for(const d of lessons){
    const cards=screens(d[2])
    for(const k of [7,8,9]){
      assert.match(cards[k][3],/Частичн|частичн|Частично/)
      assert.match(cards[k][3],/Подсказ|подсказ|не нужно|не обяз/)
      assert.match(cards[k][3],/некомфортно|Некомфортно|Неприятн/)
    }
    assert.match(cards[1][3],/0–10/)
    assert.match(cards[12][3],/0–10/)
    assert.match(cards[13][3],/server|API|сервер|Сохран/)
    assert.match(cards[14][3],/После|сохрани|Сохрани|server|подтверж/)
  }
  assert.match(script,/без обязательного таймера|один шаг|не требуем/)
  assert.match(guide,/0–3/)
  assert.match(guide,/стандартной клинической шкалой/)
  assert.match(guide,/«Мне некомфортно»/)
  assert.match(guide,/afforismResponse|aphorismResponse/)
})

test('methodology is published only as editorial source, with existing runtime pinned and genuine boundaries',()=>{
  assert.match(script,/не live-слайды/)
  assert.match(guide,/не является уже развернутым UX/)
  assert.match(passport,/AS-5\.3/)
  assert.match(canonical,/Редакторское дополнение AS-5\.3/)
  assert.match(prior,/AS-5\.3/)
  assert.match(prior,/не обновлённый runtime/)
  assert.match(guide,/SAMHSA/)
  assert.match(guide,/NICE/)
  const original=read('lib/inner-growth/course-slide-sequence.js')
  assert.match(original,/OPORA_SKILL_SLIDE_MODEL/)
  assert.match(original,/guided-practice/)
})
