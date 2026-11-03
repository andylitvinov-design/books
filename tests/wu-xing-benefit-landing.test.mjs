import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const landing = await readFile('components/free-entry-landing.tsx', 'utf8')
const css = await readFile('components/free-entry-landing.module.css', 'utf8')

test('Wu Xing benefit headline, example disclaimer and outcomes are localized EN/RU/ES', () => {
  for (const phrase of [
    'Discover what gives you strength.', 'Узнайте, что даёт вам внутреннюю опору.',
    'Descubre qué te da fuerza.', 'Illustrative example — not your personal result.',
    'Условный пример — не ваш персональный профиль.',
    'Ejemplo ilustrativo; no es tu resultado personal.',
    'Your strengths', 'Your next step', 'Ваши опоры', 'Следующий шаг',
    'Tus fortalezas', 'Próximo paso'
  ]) assert.ok(landing.includes(phrase), phrase)
})
test('only Dao is short-scannable, while other free services retain their flow', () => {
  assert.match(landing, /kind === "dao" \?\s*<ul className=\{styles\.daoBenefits\}/)
  assert.match(landing, /kind !== "dao" \? <figcaption>/)
  assert.match(landing, /kind !== "dao" \? <section className=\{\[styles\.scene, styles\.processScene\]/)
  assert.match(landing, /kind === "situation" \? <div className=\{styles\.videoWrap\}/)
  assert.match(css, /\.daoHero \.heroVisual\{height:clamp\(112px,16svh,165px\)/)
  assert.match(css, /@media\(max-width:360px\)/)
})
test('free Dao CTA leads to the current compact consented service enquiry, not legacy form', () => {
  assert.match(landing, /href=\{"#" \+ captureId\}/)
  assert.match(landing, /<CompactLeadCapture/)
  assert.match(landing, /serviceTitle=\{serviceTitles\[kind\]\}/)
  assert.ok(landing.indexOf('id="what-you-get"') < landing.indexOf('<CompactLeadCapture'), 'show sample before final request')
})
