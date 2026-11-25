import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { collectReportOverflowDiagnostics } from '../scripts/helpers/report-overflow-diagnostics.mjs'

function fixture({ width = 430, scrollX = 0, extra = 0 } = {}) {
  const all = []
  const element = (tag, { parent = null, left = 0, right = 390, scrollWidth = right - left, text = '', attrs = {}, css = {} } = {}) => {
    const node = { localName: tag, id: attrs.id || '', parentElement: parent, attrs,
      clientWidth: right - left, offsetWidth: right - left, scrollWidth, scrollLeft: 0,
      childNodes: [{ nodeType: 3, textContent: text }],
      getAttribute(name) { return this.attrs[name] ?? null },
      getBoundingClientRect() { return { left: left - scrollX, right: right - scrollX, top: 0, bottom: 50, width: right - left, height: 50 } },
      getRootNode() { return {} },
      closest(selector) {
        for (let item = node; item; item = item.parentElement) {
          if (selector === 'svg' ? item.localName === 'svg' : item.attrs['data-personal-result-report'] != null) return item
        }
        return null
      },
      style: { display: 'block', position: 'static', minWidth: '0px', overflowX: 'visible', overflowY: 'visible', ...css },
    }
    all.push(node)
    return node
  }
  const html = element('html', { scrollWidth: width })
  const body = element('body', { parent: html, scrollWidth: width, text: 'PRIVATE ACCOUNT CONTACT' })
  const report = element('section', { parent: body, attrs: { 'data-personal-result-report': '' } })
  const scroller = element('div', { parent: report, left: 20, right: 370, scrollWidth: 1200, css: { overflowX: 'auto' } })
  element('button', { parent: scroller, left: 1020, right: 1160, text: 'Synthetic hidden tab', attrs: { 'data-assessment-scale-trigger': 'trait.nine', 'aria-pressed': 'true' } })
  element('p', { parent: report, left: 20, right: width, text: 'Synthetic report '.repeat(20), css: { minWidth: '410px' } })
  element('input', { parent: report, left: 20, right: 420, text: 'PRIVATE INPUT VALUE' })
  element('textarea', { parent: report, left: 20, right: 420, text: 'PRIVATE TEXTAREA VALUE' })
  const svg = element('svg', { parent: report, left: 20, right: 420 })
  element('path', { parent: svg, left: 20, right: 430 })
  element('iframe', { parent: body, left: 20, right: 420, attrs: { src: 'https://example.invalid/frame?secret=PRIVATE_TOKEN' } })
  const host = element('overlay-host', { parent: body })
  const shadowChild = element('div', { left: 20, right: 415 })
  all.pop()
  shadowChild.getRootNode = () => ({ host })
  host.shadowRoot = { querySelectorAll: () => [shadowChild] }
  for (let index = 0; index < extra; index++) element('p', { parent: report, left: 0, right: 500 + index, text: 'Synthetic bounded sample' })
  const document = { documentElement: html, body, querySelectorAll(selector) {
    if (selector === '*') return all
    if (selector.includes('[aria-pressed="true"]')) return all.filter(item => item.attrs['aria-pressed'] === 'true')
    return [report, scroller, svg]
  } }
  return { document, location: { hostname: '127.0.0.1', href: 'http://127.0.0.1:3100/ru/app/results/synthetic' },
    innerWidth: 390, innerHeight: 844, outerWidth: 390, outerHeight: 844, devicePixelRatio: 1,
    scrollX, scrollY: 1200, getComputedStyle: item => item.style, URL }
}
const collect = context => JSON.parse(JSON.stringify(runInNewContext(`(${collectReportOverflowDiagnostics})()`, context)))

test('read-only geometry distinguishes escaped content and intentional clipped tab scrolling', () => {
  const layout = collect(fixture())
  assert.equal(layout.document.scrollWidth, 430)
  assert.equal(layout.viewport.innerWidth, 390)
  assert.equal(layout.viewport.scrollbarWidth, 0)
  assert.equal(layout.viewport.visual, null)
  assert.deepEqual(layout.selectedScales, ['trait.nine'])
  assert.equal(layout.escapingWithClippingAncestor.length, 1)
  assert.equal(layout.escapingWithClippingAncestor[0].tag, 'button')
  assert.equal(layout.escapingWithClippingAncestor[0].clippingAncestors[0].scrollWidth, 1200)
  const paragraph = layout.escapingWithoutClippingAncestor.find(item => item.tag === 'p')
  assert.equal(paragraph.escapedBy, 40)
  assert.equal(paragraph.css.minWidth, '410px')
  assert.equal(paragraph.text.length, 100)
  assert.ok(layout.scrollOverflowElements.some(item => item.scrollWidth === 1200))
})

test('geometry attributes SVG, iframes and open shadow roots without reading private text or frame queries', () => {
  const layout = collect(fixture())
  const serialized = JSON.stringify(layout)
  assert.doesNotMatch(serialized, /PRIVATE_|secret=/)
  assert.equal(layout.embeddedElements.find(item => item.tag === 'iframe').frameOrigin, 'https://example.invalid')
  assert.equal(layout.escapingWithoutClippingAncestor.find(item => item.tag === 'path').svgOwner.tag, 'svg')
  assert.equal(layout.escapingWithoutClippingAncestor.find(item => item.shadowHost)?.shadowHost.tag, 'overlay-host')
})

test('document coordinates remain meaningful after horizontal scrolling and output is bounded', () => {
  const layout = collect(fixture({ scrollX: 25, extra: 40 }))
  assert.equal(layout.viewport.scrollX, 25)
  assert.equal(layout.document.left, -25)
  assert.equal(layout.document.documentLeft, 0)
  assert.equal(layout.escapingWithoutClippingAncestor.length, 16)
  assert.ok(layout.counts.withoutClippingAncestor > 16)
})

test('diagnostics reject non-loopback pages and preserve the exact assertion and screenshot ordering', () => {
  const context = fixture()
  context.location.hostname = 'production.invalid'
  assert.throws(() => collect(context), /isolated loopback fixture/)
  const source = readFileSync(new URL('../scripts/verify-personality-types.mjs', import.meta.url), 'utf8')
  const assertion = 'assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))'
  assert.equal(source.split(assertion).length, 2)
  assert.match(source, /if\(!guest&&locale==='ru'&&d.key==='hh-enneagram-36'\)/)
  assert.ok(source.indexOf('await page.evaluate(collectReportOverflowDiagnostics)') < source.indexOf(assertion))
  assert.ok(source.indexOf(assertion) < source.indexOf("await page.screenshot({path:output+'/'+(guest?'guest':'account')"))
  assert.match(source, /page\?\.screenshot\(\{path:output\+'\/failure.png',fullPage:false\}\)/)
  assert.doesNotMatch(collectReportOverflowDiagnostics.toString(), /\.value\b|\.innerHTML\b|\.scrollTo\(|\.scrollIntoView\(|\.setAttribute\(|\.click\(/)
})
