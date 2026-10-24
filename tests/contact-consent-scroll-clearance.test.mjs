import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import postcss from 'postcss'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const local = read('components/contact-channel-chooser.module.css')
const mobile = read('app/ia-v2.css')
const component = read('components/contact-channel-chooser.tsx')
const globalSelector = 'body:has(.ia222-bottom-navigation) :is(input,textarea,button,a)'

// Static CSS-cascade proof for the two real competing author rules, not a
// simulated browser, scroll algorithm, pointer event or keyboard acceptance.
function clearanceRules(source, isMobileGlobal = false) {
  const found = []
  postcss.parse(source).walkRules(rule => {
    if (isMobileGlobal && rule.selector !== globalSelector) return
    if (!isMobileGlobal && !/^((?:\.[a-zA-Z]+\s+)+)input$/.test(rule.selector)) return
    rule.walkDecls('scroll-margin-bottom', decl => {
      if (isMobileGlobal) {
        assert.equal(rule.parent.type, 'atrule')
        assert.equal(rule.parent.name, 'media')
        assert.equal(rule.parent.params, '(max-width: 767px)')
      }
      found.push({selector: rule.selector, value: decl.value, important: Boolean(decl.important),
        // :has adds its class; :is contributes the maximum one type selector.
        specificity: isMobileGlobal ? [0, 1, 2] : [0, (rule.selector.match(/\./g) || []).length, 1],
        mobileOnly: isMobileGlobal})
    })
  })
  return found
}
function greater(a, b) {
  if (a.important !== b.important) return a.important ? 1 : -1
  for (let i = 0; i < 3; i++) if (a.specificity[i] !== b.specificity[i]) return a.specificity[i] - b.specificity[i]
  return 0
}
function resolveClearance(source, {width = 390, navHeight = 0, globalLast = true} = {}) {
  const shared = clearanceRules(mobile, true), scoped = clearanceRules(source)
  const rules = (globalLast ? [...scoped, ...shared] : [...shared, ...scoped]).filter(rule => !rule.mobileOnly || width <= 767)
  const winner = rules.reduce((current, rule) => !current || greater(rule, current) >= 0 ? rule : current, null)
  assert.ok(winner)
  if (winner.value === 'calc(var(--ia222-bottom-height,76px) + 24px)') return navHeight + 24
  assert.match(winner.value, /^\d+px$/)
  return Number.parseInt(winner.value, 10)
}
function contract(source) {
  const rules = clearanceRules(source)
  assert.equal(rules.length, 1, 'One scoped input-clearance rule, no focus-specific override')
  assert.equal(rules[0].selector, '.wrapper .enquiryForm input')
  assert.equal(rules[0].value, '170px', 'Keep the established form clearance')
  assert.equal(rules[0].important, false, 'No blanket important override')
  assert.deepEqual(rules[0].specificity, [0, 2, 1])
  for (const width of [320, 390, 767, 768, 1280]) {
    for (const navHeight of [0, 69, 84, 97, 135]) {
      for (const globalLast of [false, true]) assert.equal(resolveClearance(source, {width, navHeight, globalLast}), 170)
    }
  }
}

test('form input clearance stays170px across email-to-checkbox focus and stylesheet ordering', () => contract(local))

test('exact baseline selector loses to the focus-dependent mobile rule', () => {
  const baseline = local.replace('.wrapper .enquiryForm input { scroll-margin-bottom:170px; }', '.enquiryForm input { scroll-margin-bottom:170px; }')
  assert.notEqual(baseline, local)
  assert.equal(resolveClearance(baseline, {navHeight: 0}), 24)
  assert.equal(resolveClearance(baseline, {navHeight: 84}), 108)
  assert.equal(resolveClearance(baseline, {width: 1280, navHeight: 84}), 170)
  assert.throws(() => contract(baseline))
})

test('the actual mobile editor rule changes nav-height, but does not include checkbox focus', () => {
  let editorRule
  postcss.parse(mobile).walkRules(rule => {
    if (rule.selector.includes(':focus)') && rule.selector.includes('input:not([type="checkbox"])')) {
      rule.walkDecls('--ia222-bottom-height', decl => { editorRule = {selector: rule.selector, value: decl.value, important: decl.important} })
    }
  })
  assert.ok(editorRule); assert.equal(editorRule.value, '0px'); assert.equal(editorRule.important, true)
  const shared = clearanceRules(mobile, true)
  assert.equal(shared.length, 1); assert.equal(shared[0].value, 'calc(var(--ia222-bottom-height,76px) + 24px)')
})

test('selector matches the real wrapper/form/input nesting and leaves native consent/focus intact', () => {
  assert.match(component, /<div className=\{styles\.wrapper\} data-contact-channel-chooser/)
  assert.match(component, /<form onSubmit=\{submit\} className=\{styles\.enquiryForm\}>/)
  assert.match(component, /<input type="checkbox" required checked=\{consent\} disabled=\{locked \|\| busy\}/)
  assert.match(component, /onChange=\{event => \{ setConsent\(event\.target\.checked\); \}\}/)
  assert.match(component, /const \[consent, setConsent\] = useState\(false\)/)
  const checkbox = component.slice(component.indexOf('<input type="checkbox"'), component.indexOf('<span>{c.consent}</span>'))
  assert.equal((component.match(/onPointerDown=/g) || []).length, 1)
  assert.match(checkbox, /event\.defaultPrevented \|\| !event\.isPrimary \|\| event\.button !== 0 \|\| event\.currentTarget\.disabled/)
  assert.match(checkbox, /event\.currentTarget\.focus\(\{ preventScroll: true \}\)/)
  assert.doesNotMatch(checkbox, /preventDefault|stopPropagation|setPointerCapture|onKey|onFocus|onClick|onMouse|onTouch|setTimeout|scrollTo|\.checked\s*=/)
  assert.match(local, /\.contactFields input:focus-visible, \.consent input:focus-visible \{ outline:3px solid #80abc7; outline-offset:2px; \}/)
  assert.match(component, /behavior: reducedMotion \? "auto" : "smooth"/)
})

for (const [name, from, to] of [
  ['remove wrapper specificity', '.wrapper .enquiryForm input { scroll-margin-bottom:170px; }', '.enquiryForm input { scroll-margin-bottom:170px; }'],
  ['zero out clearance', 'scroll-margin-bottom:170px;', 'scroll-margin-bottom:0px;'],
  ['restore dynamic nav clearance', 'scroll-margin-bottom:170px;', 'scroll-margin-bottom:calc(var(--ia222-bottom-height,76px) + 24px);'],
  ['global important override', 'scroll-margin-bottom:170px;', 'scroll-margin-bottom:170px !important;'],
  ['wrong local ancestry', '.wrapper .enquiryForm input { scroll-margin-bottom:170px; }', '.absent .enquiryForm input { scroll-margin-bottom:170px; }'],
]) test('rejects ' + name, () => {
  assert.ok(local.includes(from)); assert.throws(() => contract(local.replace(from, to)))
})
