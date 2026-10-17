import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const banners = read('components/app/cabinet-free-course-banners.jsx')
const style = read('components/app/cabinet-free-course-banners.module.css')
const firstScreen = read('components/app/course-entry-selector.jsx')
const dashboard = read('components/app/my-courses-dashboard.jsx')
const academy = read('app/[locale]/academy/[[...slug]]/page.tsx')

test('My Courses shows three free Academy banners before paid/personal course cards', () => {
  assert.match(firstScreen, /<CabinetFreeCourseBanners locale=\{locale\}\/>[\s\S]*<section className=\{styles\.tiles\}/)
  assert.match(dashboard, /<CabinetFreeCourseBanners locale=\{locale\}\/>[\s\S]*\{main&&<CourseTile/)
  assert.match(banners, /data-cabinet-free-courses/)
  assert.equal((banners.match(/id: '(energywork|tantra-reiki|reiki-yggdrasil)'/g) || []).length, 3)
})

test('each banner links to its existing localized Academy learning path, never auto-enrolls', () => {
  for (const path of ['principles-of-energywork','reiki/tantra-reiki/free-initiation','reiki/yggdrasil/free-initiation']) {
    assert.ok(banners.includes("path: '" + path + "'"), path)
  }
  assert.match(banners, /href=\{'\/' \+ language \+ '\/academy\/' \+ course\.path\}/)
  assert.match(academy, /if \(key === "principles-of-energywork"\)/)
  assert.match(academy, /if \(key === "reiki\/tantra-reiki\/free-initiation"\)/)
  assert.match(academy, /if \(child === "free-initiation"\)/)
  assert.doesNotMatch(banners, /appFetch|fetch\(|onClick=|checkout/i)
})

test('EN/RU copy distinguishes free study from personally confirmed initiations, including mobile layout', () => {
  for (const phrase of ['Основы энергетики','Тантра Рейки','Рейки Иггдрасиль','Бесплатные курсы','Energywork Basics','Tantra Reiki','Reiki Yggdrasil','Free courses']) {
    assert.ok(banners.includes(phrase), phrase)
  }
  assert.match(banners, /Инициация проводится по согласованию/)
  assert.match(banners, /initiations require personal confirmation/)
  assert.match(style, /@media\(max-width:860px\)/)
  assert.match(style, /\.grid\{grid-template-columns:1fr/)
  assert.match(style, /\.card:focus-visible/)
})
