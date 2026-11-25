import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
const source = read('components/academy-free-course-banner.tsx')
const styles = read('components/academy-free-course-banner.module.css')
const hub = read('components/academy-hub.tsx')

test('Legacy free-course dropdown stays accessible in isolation; Academy now displays its courses directly', () => {
  assert.doesNotMatch(hub, /<AcademyFreeCourseBanner/)
  assert.match(hub, /<AcademyDiscovery locale=\{locale\}/)
  assert.match(source, /<details className=\{styles\.disclosure\}>/)
  assert.match(source, /<summary className=\{styles\.summary\}>/)
  assert.match(source, /aria-labelledby="academy-free-course-title"/)
  assert.match(source, /data-academy-free-course-list/)
  assert.doesNotMatch(source, /className=\{styles\.(visual|orbit|steps)\}/)
  assert.match(styles, /\.disclosure\[open\] \.chevron/)
  assert.match(styles, /\.summary:focus-visible/)
})

test('Dropdown only offers the four existing free learning paths and distinguishes AI from Reiki introductions', () => {
  assert.equal((source.match(/\bid: "(stress|energywork|tantra-reiki|reiki-yggdrasil)"/g) || []).length, 4)
  for (const path of [
    'app/course?program=stress',
    'principles-of-energywork',
    'reiki/tantra-reiki/free-initiation',
    'reiki/yggdrasil/free-initiation',
  ]) assert.ok(source.includes(path), path)
  assert.match(source, /course\.id === "stress"/)
  assert.match(source, /courseLocale = locale === "es" \? "en" : locale/)
  assert.match(source, /course\.detailsPath/)
  assert.match(source, /personal initiations need teacher confirmation/)
  assert.match(source, /Инициация — по согласованию/)
  assert.doesNotMatch(source, /fetch\(|checkout|onClick|automatically enrol/i)
})

test('Photo-left cards keep a visible course start link in EN RU ES and remain usable on phones', () => {
  for (const phrase of ['Start course', 'Пройти', 'Empezar', 'Бесплатные ИИ-курсы', 'Free AI courses']) {
    assert.ok(source.includes(phrase), phrase)
  }
  assert.match(source, /<Image src=\{cardArtworkUrl\(course\.image\)\} unoptimized=\{hasCardArtwork\(course\.image\)\} alt="" fill/)
  assert.match(source, /image: "\/academy\/reiki-yggdrasil\/source\/program-overview\.jpg"/)
  assert.match(source, /className=\{styles\.start\} href=\{href\}/)
  assert.match(styles, /grid-template-columns: 132px minmax\(0, 1fr\)/)
  assert.match(styles, /@media \(max-width: 540px\)/)
  assert.match(styles, /grid-template-columns: 96px minmax\(0,1fr\)/)
  assert.match(styles, /min-height: 44px/)
  assert.match(styles, /\.start:focus-visible, \.details:focus-visible/)
})
