import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const banners = read('components/app/cabinet-free-course-banners.jsx')
const style = read('components/app/cabinet-free-course-banners.module.css')
const firstScreen = read('components/app/course-entry-selector.jsx')
const dashboard = read('components/app/my-courses-dashboard.jsx')
const academy = read('app/[locale]/academy/[[...slug]]/page.tsx')

test('My Courses puts started photo-left cards ahead of Academy discovery', () => {
  assert.match(firstScreen, /<section className=\{styles\.startedTiles\}[\s\S]*<CabinetFreeCourseBanners locale=\{locale\}\/>[\s\S]*<section className=\{styles\.tiles\}/)
  assert.match(dashboard, /<section className=\{styles\.startedCourses\}[\s\S]*<CabinetFreeCourseBanners locale=\{locale\}\/>/)
  assert.match(dashboard, /data-started-course-card/)
  assert.match(dashboard, /className=\{styles\.coursePhoto\}/)
  assert.match(banners, /data-energywork-course-resume[\s\S]*data-cabinet-free-courses/)
  assert.match(banners, /className=\{styles\.savedPhoto\}/)
  assert.match(banners, /COURSES\.filter\(course => !\(academyProgress/)
  assert.match(banners, /<details className=\{styles\.lessonDisclosure\}>/)
  assert.equal((banners.match(/id: '(energywork|tantra-reiki|reiki-yggdrasil)'/g) || []).length, 3)
  assert.match(banners, /tantra-reiki-yin-yang-cover\.svg/)
  assert.doesNotMatch(banners, /maya-mysteries\/media\/post-217-1\.jpg/)
})

test('Energywork links to its safe interactive preview while Reiki level-one links remain, with no auto-enrolment', () => {
  for (const path of ['principles-of-energywork/learn','reiki/tantra-reiki/free-initiation','reiki/yggdrasil/free-initiation']) {
    assert.ok(banners.includes("path: '" + path + "'"), path)
  }
  assert.match(banners, /href=\{'\/' \+ language \+ '\/academy\/' \+ course\.path\}/)
  assert.match(academy, /if \(key === "principles-of-energywork"\)/)
  assert.match(academy, /if \(key === "principles-of-energywork\/learn"\)/)
  assert.match(banners, /data-energywork-course-resume/)
  assert.match(banners, /appFetch\('academy-energywork'\)/)
  assert.match(academy, /if \(key === "reiki\/tantra-reiki\/free-initiation"\)/)
  assert.match(academy, /if \(child === "free-initiation"\)/)
  assert.doesNotMatch(banners, /onClick=|checkout/i)
  assert.match(banners, /value\?\.enrolled/)
  assert.doesNotMatch(banners, /appFetch\(\x27academy-energywork\x27\s*,\s*\{/)
})

test('EN/RU copy distinguishes free study from personally confirmed initiations, including mobile layout', () => {
  for (const phrase of ['Практик Рейки','Тантра Рейки','Рейки Иггдрасиль','Бесплатные курсы','Reiki Practitioner','Tantra Reiki','Reiki Yggdrasil','Free courses']) {
    assert.ok(banners.includes(phrase), phrase)
  }
  assert.match(banners, /Инициация проводится по согласованию/)
  assert.match(banners, /initiations require personal confirmation/)
  assert.match(style, /@media\(max-width:860px\)/)
  assert.match(style, /\.grid\{grid-template-columns:1fr/)
  assert.match(style, /\.card:focus-visible/)
})
