// Anonymous no-network counterfactual in the already-running browser engine.
// No application navigation, provider, poster, media or narrative is used here.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const captionRule = '.minimal :global(.site-video-caption) {\n'
const positionedCaptionRule = captionRule + '  position: relative;\n'
const reset = 'html,body{margin:0;padding:0}*,*::before,*::after{box-sizing:border-box}'

export function buildAboutCaptionFixture({ minimal, gallery, shared }) {
  for (const css of [minimal, gallery, shared]) {
    assert.equal(typeof css, 'string', 'Fixture requires the actual allowed CSS sources')
    assert.ok(!/url\s*\(|@import|@font-face/i.test(css), 'Anonymous fixture must not load any CSS resource')
  }
  assert.equal(minimal.split(positionedCaptionRule).length - 1, 1, 'One narrowly positioned minimal caption is required')
  const baselineMinimal = minimal.replace(positionedCaptionRule, captionRule)
  const captionBody = baselineMinimal.slice(baselineMinimal.indexOf(captionRule) + captionRule.length).split('}')[0]
  assert.ok(!/\bposition\s*:/.test(captionBody), 'Counterfactual must remove only the new containing block')
  const unwrap = css => {
    const result = css.replace(/:global\(([^()]*)\)/g, '$1')
    assert.ok(!result.includes(':global('), 'Fixture cannot silently reinterpret unsupported CSS-module syntax')
    return result
  }
  const names = Array.from({ length: 10 }, (_, index) => `Anonymous clip ${String(index + 1).padStart(2, '0')}`)
  const cards = names.map((name, index) => {
    const language = index < 6 ? 'en' : 'ru'
    return `<div class="videoItem" data-anonymous-card><p class="videoLanguageTag">${language.toUpperCase()}</p>` +
      `<figure class="site-video-player site-video-player--compact site-video-player--minimal minimal" aria-labelledby="anonymous-title-${index + 1}" lang="en">` +
      `<div class="site-video-frame"><button class="site-video-play" type="button" aria-label="Play ${name}"><span class="site-video-shade" aria-hidden="true"></span></button></div>` +
      `<figcaption class="site-video-caption"><span class="accessibleTitle" id="anonymous-title-${index + 1}" lang="${language}">${name}</span></figcaption></figure></div>`
  }).join('')
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'none\'; img-src \'none\'; media-src \'none\'; font-src \'none\'; connect-src \'none\'; frame-src \'none\'; base-uri \'none\'; form-action \'none\'">' +
    '</head><body><section class="section" data-personal-testimonials="about" lang="en"><div class="videoGrid" role="region" aria-label="Anonymous clips" tabindex="0">' + cards + '</div></section></body></html>'
  const compose = css => [reset, unwrap(shared), unwrap(css), unwrap(gallery)].join('\n')
  return { html, names, baselineMinimal, baselineCSS: compose(baselineMinimal), finalCSS: compose(minimal) }
}

export function readAboutCaptionFixtureSources() {
  return {
    minimal: readFileSync(new URL('../components/site-video-minimal.module.css', import.meta.url), 'utf8'),
    gallery: readFileSync(new URL('../components/personal-testimonials.module.css', import.meta.url), 'utf8'),
    shared: readFileSync(new URL('../app/site-videos.css', import.meta.url), 'utf8'),
  }
}

export async function verifyAboutVideoCaptionLayout(browser, expect,
  observe = measurement => console.log('OBSERVATION: anonymous-caption-layout', JSON.stringify(measurement))) {
  const fixture = buildAboutCaptionFixture(readAboutCaptionFixtureSources())
  // A separate anonymous context uses the existing engine, never a new launch.
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 }, serviceWorkers: 'block' })
  let requests = 0
  try {
    await context.route('**/*', route => { requests++; return route.abort() })
    const page = await context.newPage()
    for (const width of [1365, 390]) {
      await page.setViewportSize({ width, height: 900 })
      const observations = []
      for (const [alias, css] of [['baseline', fixture.baselineCSS], ['contained', fixture.finalCSS]]) {
        await page.setContent(fixture.html, { waitUntil: 'domcontentloaded' })
        await page.addStyleTag({ content: css })
        assert.equal(await page.locator('iframe,video,audio,img,source,script,link,a').count(), 0, 'Anonymous fixture must remain asset/action free')
        const players = page.locator('figure.site-video-player')
        assert.equal(await players.count(), 10, 'Exactly ten anonymous players')
        for (let index = 0; index < 10; index++) {
          await expect(players.nth(index)).toHaveAccessibleName(fixture.names[index])
          await expect(players.nth(index).locator('button')).toHaveAccessibleName(`Play ${fixture.names[index]}`)
        }
        const observed = await page.evaluate(() => {
          const row = document.querySelector('.videoGrid')
          const cards = [...document.querySelectorAll('[data-anonymous-card]')]
          const box = element => {
            const bounds = element.getBoundingClientRect()
            return ['left', 'top', 'width', 'height'].map(key => Math.round(bounds[key] * 1000) / 1000)
          }
          return {
            viewport: innerWidth, document: document.documentElement.scrollWidth,
            rowClient: row.clientWidth, rowScroll: row.scrollWidth, rowOverflow: getComputedStyle(row).overflowX,
            normalFlow: cards.map(card => [box(card), box(card.querySelector('figure')), box(card.querySelector('.site-video-frame')), box(card.querySelector('figcaption'))]),
            titleContainedByCaption: cards.map(card => card.querySelector('.accessibleTitle').offsetParent === card.querySelector('figcaption')),
            captionPositions: cards.map(card => getComputedStyle(card.querySelector('figcaption')).position),
            framePositions: cards.map(card => getComputedStyle(card.querySelector('.site-video-frame')).position),
            cardPositions: cards.map(card => getComputedStyle(card).position),
          }
        })
        assert.equal(observed.viewport, width, 'Anonymous fixture viewport is explicit')
        assert.equal(observed.rowOverflow, 'auto', 'Actual gallery retains its own scroll container')
        assert.ok(observed.rowScroll > observed.rowClient, 'All ten cards remain reachable through internal horizontal scrolling')
        assert.ok(observed.framePositions.every(position => position === 'relative'), 'Positioned frame is a sibling, not the title containing block')
        assert.ok(observed.cardPositions.every(position => position === 'static'), 'No broad card positioning workaround')
        if (alias === 'baseline') {
          assert.ok(observed.document > width + 2, 'Counterfactual must reproduce overflow; otherwise stop, not waive')
          assert.ok(observed.captionPositions.every(position => position === 'static'))
          assert.ok(observed.titleContainedByCaption.every(value => value === false))
        } else {
          assert.ok(observed.document <= width + 2, 'Caption containing block must prevent document overflow')
          assert.ok(observed.captionPositions.every(position => position === 'relative'))
          assert.ok(observed.titleContainedByCaption.every(value => value === true))
        }
        assert.equal(requests, 0, 'Anonymous fixture attempted a resource request')
        observations.push(observed)
      }
      const [baseline, contained] = observations
      assert.deepEqual(contained.normalFlow, baseline.normalFlow, 'Containing block must not alter card/frame/caption normal flow')
      assert.equal(contained.rowClient, baseline.rowClient, 'No gallery sizing workaround')
      assert.equal(contained.rowScroll, baseline.rowScroll, 'No removal or clipping of the internally scrollable cards')
      observe({ width, baselineDocument: baseline.document,
        containedDocument: contained.document, rowClient: contained.rowClient, rowScroll: contained.rowScroll })
    }
  } finally { await context.close() }
}
