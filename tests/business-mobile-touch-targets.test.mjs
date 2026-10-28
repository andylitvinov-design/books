import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const direction = readFileSync(new URL('../components/direction-offers.module.css', import.meta.url), 'utf8')
const landing = readFileSync(new URL('../components/business-consulting-landing.module.css', import.meta.url), 'utf8')
const directionComponent = readFileSync(new URL('../components/direction-offers.tsx', import.meta.url), 'utf8')
const landingComponent = readFileSync(new URL('../components/business-consulting-landing.tsx', import.meta.url), 'utf8')

// Source-level cascade check for the existing min-height selectors, not a browser
// layout claim. Parse nested media blocks rather than matching the last declaration.
function minimum(css, width, accepts) {
  let winner = { specificity: -1, order: -1, value: null }, order = 0
  const walk = (source, active = true) => {
    let index = 0
    while (index < source.length) {
      const open = source.indexOf('{', index)
      if (open < 0) break
      let depth = 1, close = open + 1
      while (close < source.length && depth) {
        if (source[close] === '{') depth++
        if (source[close] === '}') depth--
        close++
      }
      assert.equal(depth, 0, 'Balanced current CSS')
      const selector = source.slice(index, open).trim(), body = source.slice(open + 1, close - 1)
      if (selector.startsWith('@media')) {
        const max = selector.match(/max-width\s*:\s*(\d+)px/), min = selector.match(/min-width\s*:\s*(\d+)px/)
        walk(body, active && (!max || width <= Number(max[1])) && (!min || width >= Number(min[1])))
      } else if (!selector.startsWith('@') && active) {
        const match = body.match(/(?:^|;)\s*min-height\s*:\s*(\d+)px\s*(!important)?\s*(?:;|$)/)
        for (const part of selector.split(',')) {
          order++
          if (!match || !accepts(part.trim())) continue
          const specificity = (match[2] ? 1000 : 0) + (part.match(/[.#\[]/g)?.length ?? 0)
          if (specificity > winner.specificity || specificity === winner.specificity && order > winner.order)
            winner = { specificity, order, value: Number(match[1]) }
        }
      }
      index = close
    }
  }
  walk(css.replace(/\/\*[\s\S]*?\*\//g, ''))
  return winner.value
}
const paid = business => selector => selector === '.action'
  || business && selector === '.root[data-direction-offers="business"] [data-offer-action="session"]'
const direct = selector => selector === '.offerDirectLink'

test('Business session action retains 44px at all existing phone widths without changing other directions', () => {
  assert.ok(directionComponent.includes('<div className={styles.root} data-direction-offers={direction}>'))
  assert.ok(directionComponent.includes('<Link className={styles.action} href={offer.href} prefetch={false} data-offer-action={kind}>'))
  for (const width of [320, 375, 390, 430, 480]) {
    assert.equal(minimum(direction, width, paid(true)), 44, `Business paid target at ${width}`)
    assert.equal(minimum(direction, width, paid(false)), 42, `Other directions remain unchanged at ${width}`)
  }
  for (const width of [481, 768, 1188]) assert.equal(minimum(direction, width, paid(true)), 44)
})

test('Business direct site-form anchors retain 44px through the mobile cascade', () => {
  assert.ok(landingComponent.includes('<AcquisitionEventLink className={styles.offerDirectLink}'))
  assert.ok(landingComponent.includes('attributes={{ "data-business-direct-option": offer.kind }}'))
  for (const width of [320, 375, 390, 430, 767, 768, 1188])
    assert.equal(minimum(landing, width, direct), 44, `Direct link target at ${width}`)
})

test('Cascade tests reject original and later conflicting undersized rules', () => {
  const unscoped = direction.replace(/\s*\.root\[data-direction-offers="business"\] \[data-offer-action="session"\]\{min-height:44px\}/, '')
  assert.equal(minimum(unscoped, 320, paid(true)), 42)
  assert.equal(minimum(landing.replace('.offerDirectLink{min-height:44px;font-size:11px}', '.offerDirectLink{min-height:37px;font-size:11px}'), 320, direct), 37)
  assert.equal(minimum(direction + '@media(max-width:480px){.root[data-direction-offers="business"] [data-offer-action="session"]{min-height:43px}}', 320, paid(true)), 43)
  assert.equal(minimum(landing + '@media(max-width:767px){.offerDirectLink{min-height:37px}}', 320, direct), 37)
})
