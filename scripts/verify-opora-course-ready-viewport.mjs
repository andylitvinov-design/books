
/*
 * Isolated visual contract for the real OPORA welcome CSS.
 * This intentionally does NOT simulate login, Supabase progress or a saved test.
 * It protects the viewport sizing/CTA/picker geometry in Chromium and WebKit.
 */
import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { chromium, webkit } from '@playwright/test'

const css = await readFile(new URL('../components/app/antistress-module-finder.module.css', import.meta.url), 'utf8')
const browserName = process.env.HH_TEST_BROWSER || 'chromium'
assert.ok(['chromium', 'webkit'].includes(browserName))
const engine = browserName === 'webkit' ? webkit : chromium
const browser = await engine.launch()
const cases = []
const output = 'artifacts/opora-ready-mobile/' + browserName
await mkdir(output, { recursive: true })

const copy = {
  en: { title: 'Your course is ready', badge: 'Recommended starting point', day: 'Day 1 of 14', intro: 'Based on your test results, we recommend starting here.', module: 'Stabilization and self-regulation', description: 'Early signals, manageable load and recovery', first: 'Notice my first stress signals', action: 'Start my first lesson', all: 'View all 6 programme blocks', note: 'A suggested learning direction, not a diagnosis.' },
  ru: { title: 'Ваш курс готов!', badge: 'Рекомендуемый старт', day: 'День 1 из 14', intro: 'По результатам тестов рекомендуем начать здесь.', module: 'Стабилизация и саморегуляция', description: 'Первые сигналы, посильная нагрузка и восстановление', first: 'Замечаю первые сигналы стресса', action: 'Начать первый урок', all: 'Посмотреть все 6 блоков программы', note: 'Рекомендация для обучения и самонаблюдения, не диагноз.' },
  es: { title: '¡Tu curso está listo!', badge: 'Punto de partida recomendado', day: 'Día 1 de 14', intro: 'Según tus resultados, te recomendamos empezar aquí.', module: 'Estabilización y autorregulación', description: 'Señales tempranas, esfuerzo sostenible y recuperación', first: 'Reconozco mis primeras señales de estrés', action: 'Empezar mi primera lección', all: 'Ver los 6 bloques del programa', note: 'Una sugerencia educativa, no un diagnóstico.' },
}
const frameCss = '*,*::before,*::after{box-sizing:border-box}html,body{margin:0;padding:0;font-family:system-ui} .fixture{padding:0 12px} .hh-header{height:80px;border-bottom:1px solid #ddd} .hh-mobile-app-nav{position:fixed;bottom:0;left:0;right:0;height:74px;background:#fafafa;border-top:1px solid #ddd;z-index:20}'
const markup = t => '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + frameCss + css + '</style></head><body>' +
  '<main class="fixture"><header class="hh-header">Holistic House</header><section class="root" data-course-welcome-screen><div class="card">' +
  '<div class="heroArt" role="img" aria-label="Sea view"></div><div class="content">' +
  '<div class="celebration">✧ CONGRATULATIONS</div><h1 class="title">' + t.title + '</h1><p class="intro">' + t.intro + '</p>' +
  '<div class="selectedCard"><div class="selectedMeta"><span class="selectedBadge">✓ ' + t.badge + '</span><span class="dayTag">' + t.day + '</span></div>' +
  '<div class="moduleInfo"><span class="routeNumber">02</span><div><h2>' + t.module + '</h2><p>' + t.description + '</p></div></div>' +
  '<div class="lessonPreview"><div><small>YOUR FIRST LESSON</small><strong>' + t.first + '</strong></div></div>' +
  '<div class="progressLine"><progress class="courseProgress" max="14" value="0"></progress><span>0/14 completed</span></div></div>' +
  '<details class="routeDisclosure"><summary>☷ ' + t.all + ' ⌄</summary><div class="moduleList">' +
  Array.from({ length: 6 }, (_, i) => '<button class="moduleChoice" type="button"><span class="moduleIndex">0' + (i + 1) + '</span><span class="moduleBody"><strong>' + t.module + '</strong><small>' + t.description + '</small></span></button>').join('') +
  '</div></details><button class="cta" data-course-consent-module type="button">' + t.action + ' →</button><p class="note">' + t.note + '</p></div></div></section></main>' +
  '<nav class="hh-mobile-app-nav">Profile　Tests　Reports　Courses　Practice　Home</nav></body></html>'

try {
  for (const locale of ['en','ru','es']) for (const [width,height] of [[320,568],[320,667],[360,740],[390,844],[430,932]]) {
    const page = await browser.newPage({ viewport: { width, height }, serviceWorkers: 'block' })
    try {
      await page.setContent(markup(copy[locale]))
      // This follows the production hook's geometry equation; no fake API or auth.
      await page.evaluate(() => {
        const root = document.querySelector('[data-course-welcome-screen]')
        const navTop = document.querySelector('.hh-mobile-app-nav').getBoundingClientRect().top
        root.style.setProperty('--course-ready-available', String(Math.max(0, Math.floor(Math.min(navTop,innerHeight) - Math.max(0,root.getBoundingClientRect().top) - 6))) + 'px')
      })
      const inspect = async (expanded) => page.evaluate(expanded => {
        const root = document.querySelector('[data-course-welcome-screen]')
        const card = root.querySelector('.card'), content = root.querySelector('.content')
        const navTop = document.querySelector('.hh-mobile-app-nav').getBoundingClientRect().top
        const headerBottom = document.querySelector('.hh-header').getBoundingClientRect().bottom
        const items = ['.heroArt','.celebration','.title','.routeDisclosure > summary','.cta']
        if (!expanded) items.push('.selectedCard')
        const visibleBounds = items.map(selector => {
          const node = content.querySelector(selector) || root.querySelector(selector)
          const r = node.getBoundingClientRect()
          return { selector, top: r.top, bottom: r.bottom, left: r.left, right: r.right }
        })
        return { top:root.getBoundingClientRect().top, bottom:root.getBoundingClientRect().bottom,
          navTop, headerBottom, docWidth:document.documentElement.scrollWidth,
          cardExcess:card.scrollHeight-card.clientHeight,
          contentExcess:content.scrollHeight-content.clientHeight, visibleBounds,
          list:expanded ? { scroll:root.querySelector('.moduleList').scrollHeight, client:root.querySelector('.moduleList').clientHeight } : null }
      }, expanded)
      for (const expanded of [false,true]) {
        if (expanded) await page.locator('details.routeDisclosure').evaluate(node => { node.open = true })
        const b = await inspect(expanded)
        const name = locale + '/' + width + 'x' + height + (expanded ? '/picker':'/ready')
        assert.ok(b.docWidth <= width + 1, name + ': horizontal document overflow')
        assert.ok(b.top >= b.headerBottom - 1 && b.bottom <= b.navTop + 1, name + ': card overlaps app chrome')
        assert.ok(b.cardExcess <= 2, name + ': card content clipped')
        assert.ok(b.contentExcess <= 2, name + ': content clipped')
        for (const r of b.visibleBounds) {
          assert.ok(r.top >= b.headerBottom - 1 && r.bottom <= b.navTop + 1 && r.left >= -1 && r.right <= width + 1,
            name + ': ' + r.selector + ' outside visible viewport')
        }
        cases.push({ locale,width,height,expanded,ctaVisible:true,internalPickerScroll:expanded && b.list.scroll>b.list.client+1 })
      }
      if (width === 390 && height === 844) {
        await page.locator('details.routeDisclosure').evaluate(node => { node.open = false })
        await page.screenshot({ path: output + '/' + locale + '-390-ready.png', fullPage:false })
      }
    } finally { await page.close() }
  }
  await writeFile(output + '/geometry.json',JSON.stringify({scope:'ISOLATED_OPORA_WELCOME_CSS_ONLY_NO_AUTH',engine:browserName,cases},null,2))
  console.log('OPORA welcome viewport geometry:',cases.length,'cases passed in',browserName)
} finally { await browser.close() }
