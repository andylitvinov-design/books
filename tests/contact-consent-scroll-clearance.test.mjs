import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import postcss from 'postcss'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const local = read('components/contact-channel-chooser.module.css')
const mobile = read('app/ia-v2.css')
const component = read('components/contact-channel-chooser.tsx')
const globalSelector = 'body:has(.ia222-bottom-navigation) :is(input,textarea,button,a)'
const localSelector = '.wrapper .enquiryForm input'
// CSS whitespace is only TAB, LF, FF, CR and SPACE. JS whitespace/trim also erase
// meaningful non-ASCII identifier characters (and VT), causing false greens.
const trimCssWhitespace = value => value.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '')
const normalizeSelector = selector => trimCssWhitespace(selector).replace(/[\t\n\f\r ]+/g, ' ')

// This is deliberately a bounded grammar, not eval or a general CSS engine.
// Parse both fallback branches even when a measured variable is supplied.
function lengthExpression(value) {
  assert.ok(value.length <= 256, 'Bounded clearance expression')
  let offset = 0
  function take(pattern) {
    const match = value.slice(offset).match(pattern)
    assert.ok(match, 'Unsupported clearance expression at ' + value.slice(offset))
    offset += match[0].length
    return trimCssWhitespace(match[0])
  }
  const token = text => take(new RegExp('^[\\t\\n\\f\\r ]*' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\t\\n\\f\\r ]*'))
  function parse(depth = 0) {
    assert.ok(depth < 8, 'Bounded expression nesting')
    if (/^[\t\n\f\r ]*\d/.test(value.slice(offset))) return {px: Number(take(/^[\t\n\f\r ]*\d+(?:\.\d+)?px[\t\n\f\r ]*/).slice(0, -2))}
    const name = take(/^[\t\n\f\r ]*(?:calc|var|env)(?=\()/)
    token('(')
    if (name === 'calc') {
      const left = parse(depth + 1)
      assert.match(value[offset - 1], /[\t\n\f\r ]/, 'CSS calc addition requires whitespace before +')
      take(/^\+[\t\n\f\r ]+/)
      const right = parse(depth + 1); token(')')
      return {add: [left, right]}
    }
    token(name === 'var' ? '--ia222-bottom-height' : 'safe-area-inset-bottom')
    token(','); const fallback = parse(depth + 1); token(')')
    return {[name]: fallback}
  }
  const result = parse()
  assert.equal(offset, value.length, 'No trailing expression tokens')
  return result
}
function evaluateLength(expression, {navHeight, safeArea} = {}) {
  if ('px' in expression) return expression.px
  if ('add' in expression) return expression.add.reduce((sum, child) => sum + evaluateLength(child, {navHeight, safeArea}), 0)
  const name = 'var' in expression ? 'var' : 'env'
  const supplied = name === 'var' ? navHeight : safeArea
  if (supplied === undefined) return evaluateLength(expression[name], {navHeight, safeArea})
  assert.ok(Number.isFinite(supplied) && supplied >= 0)
  return supplied
}
function mobileMedia(rule) {
  assert.equal(rule.parent.type, 'atrule')
  assert.equal(rule.parent.name, 'media')
  assert.equal(rule.parent.params, '(max-width: 767px)')
  assert.equal(rule.parent.parent.type, 'root', 'No unmodeled enclosing cascade context')
}

// Static cascade proof for these actual author rules, not browser scrolling.
// Unsupported local bottom-margin selectors fail closed instead of disappearing.
function clearanceRules(source, isMobileGlobal = false) {
  const found = []
  postcss.parse(source).walkRules(rule => {
    if (isMobileGlobal && rule.selector !== globalSelector) return
    if (isMobileGlobal || rule.selector.includes('input')) {
      rule.walkDecls(/^(?:scroll-margin|scroll-margin-block|scroll-margin-block-end)$/, () => {
        assert.fail('Unmodeled shorthand or logical input clearance override')
      })
    }
    rule.walkDecls('scroll-margin-bottom', decl => {
      assert.equal(decl.parent, rule)
      if (isMobileGlobal) mobileMedia(rule)
      else {
        assert.match(rule.selector, /^(?:\.[a-zA-Z]+[\t\n\f\r ]+)+input$/)
        assert.equal(rule.parent.type, 'root')
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
function resolveClearance(source, {width = 390, navHeight, safeArea, globalLast = true, mobileSource = mobile} = {}) {
  const shared = clearanceRules(mobileSource, true), scoped = clearanceRules(source)
  const rules = (globalLast ? [...scoped, ...shared] : [...shared, ...scoped]).filter(rule => !rule.mobileOnly || width <= 767)
  const winner = rules.reduce((current, rule) => !current || greater(rule, current) >= 0 ? rule : current, null)
  assert.ok(winner)
  return evaluateLength(lengthExpression(winner.value), {navHeight, safeArea})
}
function contract(source, mobileSource = mobile) {
  const rules = clearanceRules(source)
  assert.equal(rules.length, 1, 'One scoped input-clearance rule, no focus-specific override')
  assert.equal(rules[0].selector, localSelector)
  assert.equal(rules[0].value, '170px', 'Keep the established normal-form clearance')
  assert.equal(rules[0].important, false, 'No blanket important override')
  assert.deepEqual(rules[0].specificity, [0, 2, 1])
  for (const width of [320, 390, 767, 768, 1280]) {
    for (const navHeight of [undefined, 0, 69, 84, 97, 135]) {
      for (const safeArea of [undefined, 0, 20, 34]) {
        for (const globalLast of [false, true]) assert.equal(resolveClearance(source, {width, navHeight, safeArea, globalLast, mobileSource}), 170)
      }
    }
  }
}
function reservationContract(source) {
  const root = postcss.parse(source), shared = clearanceRules(source, true)
  assert.equal(shared.length, 1)
  assert.equal(shared[0].important, false)
  assert.deepEqual(shared[0].specificity, [0, 1, 2])
  const fallback = {var: {add: [{px: 76}, {env: {px: 0}}]}}
  assert.deepEqual(lengthExpression(shared[0].value), {add: [fallback, {px: 24}]})
  const editors = [], padding = [], variableWrites = []
  root.walkDecls('--ia222-bottom-height', decl => variableWrites.push(decl))
  assert.equal(variableWrites.length, 0, 'CSS must not replace the JS last-positive reservation on focus')
  root.walkRules(rule => {
    if (rule.selector.includes(':focus') && normalizeSelector(rule.selector).endsWith(' .ia222-bottom-navigation')) editors.push(rule)
    // Print has its own legitimate zero page padding; only model the mobile screen rule.
    if (rule.selector === 'body:has(.ia222-bottom-navigation)' && rule.parent.type === 'atrule' && rule.parent.params === '(max-width: 767px)') {
      mobileMedia(rule)
      rule.walkDecls('padding-bottom', decl => padding.push(decl))
    }
  })
  assert.equal(padding.length, 1)
  assert.equal(padding[0].important, true)
  assert.deepEqual(lengthExpression(padding[0].value), fallback)
  assert.equal(editors.length, 1, 'One editor hide rule, no focus-dependent reservation rule')
  mobileMedia(editors[0])
  assert.equal(normalizeSelector(editors[0].selector), normalizeSelector(`body:has(:is(
    textarea,
    select,
    input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="hidden"]),
    [contenteditable="true"]
  ):focus) .ia222-bottom-navigation`))
  const declarations = editors[0].nodes.filter(node => node.type !== 'comment')
  assert.equal(declarations.length, 1)
  assert.equal(declarations[0].type, 'decl')
  assert.equal(declarations[0].prop, 'display')
  assert.equal(declarations[0].value, 'none')
  assert.equal(declarations[0].important, true)
  for (const safeArea of [undefined, 0, 20, 34]) {
    const sharedLength = lengthExpression(shared[0].value)
    assert.equal(evaluateLength(sharedLength, {safeArea}), 100 + (safeArea ?? 0))
    for (const navHeight of [69, 84.5, 97, 135]) {
      assert.equal(evaluateLength(sharedLength, {navHeight, safeArea}), navHeight + 24, 'Do not add safe area twice to a measured height')
    }
  }
}

function parseComponent(source) {
  const file = ts.createSourceFile('contact-channel-chooser.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  assert.equal(file.parseDiagnostics.length, 0)
  return file
}
function descendants(node, predicate) {
  const found = []
  function visit(child) { if (predicate(child)) found.push(child); ts.forEachChild(child, visit) }
  visit(node)
  return found
}
function shape(node) {
  const result = [ts.SyntaxKind[node.kind]]
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) result.push(node.text)
  if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) result.push(node.operator)
  ts.forEachChild(node, child => { result.push(shape(child)) })
  return result
}
function expectedExpression(source) {
  return parseComponent('const expected = ' + source).statements[0].declarationList.declarations[0].initializer
}
function sameExpression(actual, expected) {
  assert.ok(actual)
  assert.deepEqual(shape(actual), shape(expectedExpression(expected)))
}
function attributes(node) {
  const result = new Map()
  for (const attribute of node.attributes.properties) {
    assert.ok(ts.isJsxAttribute(attribute), 'No spread can override native checkbox attributes')
    assert.ok(!result.has(attribute.name.text), 'No duplicate JSX attribute')
    result.set(attribute.name.text, attribute.initializer)
  }
  return result
}
function expressionAttribute(attrs, name) {
  const value = attrs.get(name)
  assert.ok(value && ts.isJsxExpression(value), 'Expected expression attribute ' + name)
  return value.expression
}
function styledAncestor(input, tag, className) {
  for (let parent = input.parent; parent; parent = parent.parent) {
    if (!ts.isJsxElement(parent) || parent.openingElement.tagName.getText() !== tag) continue
    const attr = attributes(parent.openingElement).get('className')
    if (!attr || !ts.isJsxExpression(attr) || !attr.expression) continue
    if (ts.isPropertyAccessExpression(attr.expression)
      && attr.expression.expression.getText() === 'styles' && attr.expression.name.text === className) return parent
    // The compact trigger adds an optional second class, never conditionalizing
    // the base compactPhone class. Accept only this exact bounded AST shape.
    if (className === 'compactPhone' && JSON.stringify(shape(attr.expression)) === JSON.stringify(shape(expectedExpression(
      '[styles.compactPhone, compactTrigger ? styles.compactPhoneToggle : ""].filter(Boolean).join(" ")',
    )))) return parent
  }
  return null
}
function componentContract(source) {
  const file = parseComponent(source)
  const owner = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'ContactChannelChooser')
  assert.ok(owner?.body)
  const states = owner.body.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations])
  const consent = states.filter(node => ts.isArrayBindingPattern(node.name) && node.name.elements[0]?.name?.getText() === 'consent')
  assert.equal(consent.length, 1)
  assert.equal(consent[0].name.elements[1].name.getText(), 'setConsent')
  sameExpression(consent[0].initializer, 'useState(false)')
  const inputs = descendants(owner, node => ts.isJsxSelfClosingElement(node) && node.tagName.getText() === 'input')
  const checkboxes = inputs.filter(node => attributes(node).get('type')?.text === 'checkbox')
  assert.equal(checkboxes.length, 2, 'Exactly one native consent checkbox per independently rendered variant')
  for (const [label, form, wrapper, disabled, change] of [
    ['consent', 'enquiryForm', 'wrapper', 'locked || busy', 'event => { setConsent(event.target.checked); }'],
    ['compactConsent', 'compactPhoneForm', 'compactPhone', 'locked || busy || googleBusy', 'event => { setConsent(event.target.checked); setError(""); }'],
  ]) {
    const matches = checkboxes.filter(node => styledAncestor(node, 'label', label))
    assert.equal(matches.length, 1, 'One actual checkbox in ' + label)
    const checkbox = matches[0], attrs = attributes(checkbox)
    assert.ok(styledAncestor(checkbox, 'form', form))
    assert.ok(styledAncestor(checkbox, 'div', wrapper))
    assert.equal(Boolean(styledAncestor(checkbox, 'form', 'enquiryForm')), label === 'consent')
    assert.equal(Boolean(styledAncestor(checkbox, 'div', 'wrapper')), label === 'consent', '170px selector does not cover compact mode')
    assert.deepEqual([...attrs.keys()].sort(), ['type', 'required', 'checked', 'disabled', 'onPointerDown', 'onChange'].sort(), 'No focus/key/click/capture/cancellation overrides')
    assert.equal(attrs.get('required'), undefined)
    sameExpression(expressionAttribute(attrs, 'checked'), 'consent')
    sameExpression(expressionAttribute(attrs, 'disabled'), disabled)
    sameExpression(expressionAttribute(attrs, 'onChange'), change)
    sameExpression(expressionAttribute(attrs, 'onPointerDown'), `event => {
      if (event.defaultPrevented || !event.isPrimary || event.button !== 0 || event.currentTarget.disabled) return;
      event.currentTarget.focus({ preventScroll: true });
    }`)
    let compactBranch = false
    for (let parent = checkbox.parent; parent && parent !== owner; parent = parent.parent) {
      if (ts.isIfStatement(parent) && parent.expression.getText() === 'compactPhone') compactBranch = true
    }
    assert.equal(compactBranch, label === 'compactConsent', 'Variants stay in their actual return branches')
  }
  const emails = inputs.filter(node => attributes(node).get('type')?.text === 'email')
  assert.equal(emails.length, 1)
  assert.ok(styledAncestor(emails[0], 'form', 'enquiryForm'))
  assert.ok(styledAncestor(emails[0], 'div', 'wrapper'))
  const scrolls = descendants(owner, node => ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'scrollIntoView')
  assert.equal(scrolls.length, 2, 'Exactly the normal saved/form and compact-trigger scroll effects')
  const byTarget = new Map()
  for (const call of scrolls) {
    const target = call.expression.expression.getText()
    assert.ok(!byTarget.has(target), 'No duplicate scroll target')
    let effect = call.parent
    while (effect && !(ts.isCallExpression(effect) && effect.expression.getText() === 'useEffect')) effect = effect.parent
    assert.ok(effect, 'Scroll belongs to an explicit effect, never a pointer/consent handler')
    byTarget.set(target, effect)
  }
  assert.deepEqual([...byTarget.keys()].sort(), ['panelRef.current', 'target'])
  sameExpression(byTarget.get('target'), `useEffect(() => {
    if (compactPhone || (!open && !(quick && saved))) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = saved ? panelRef.current?.querySelector('[data-contact-channel="whatsapp"]') : panelRef.current;
    target?.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
  }, [open, saved, quick, compactPhone])`)
  sameExpression(byTarget.get('panelRef.current'), `useEffect(() => {
    if (!compactPhone || !compactTrigger || !open) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panelRef.current?.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
  }, [compactPhone, compactTrigger, open, saved])`)
}
function focusRingContract(source) {
  const matches = []
  postcss.parse(source).walkRules(rule => {
    if (rule.selector === '.contactFields input:focus-visible, .consent input:focus-visible') matches.push(rule)
  })
  assert.equal(matches.length, 1)
  const declarations = matches[0].nodes.filter(node => node.type === 'decl')
  assert.deepEqual(declarations.map(({prop, value, important}) => [prop, value, Boolean(important)]), [
    ['outline', '3px solid #80abc7', false], ['outline-offset', '2px', false],
  ])
}
function replaceOnce(source, from, to) {
  assert.equal(source.split(from).length, 2, 'Mutation must target exactly one real source fragment')
  return source.replace(from, to)
}

test('normal-form email and checkbox clearance stays170px across reservation states and stylesheet ordering', () => contract(local))
test('exact old low-specificity selector loses to the retained mobile reservation in either stylesheet order', () => {
  const baseline = replaceOnce(local, localSelector, '.enquiryForm input')
  for (const globalLast of [false, true]) {
    for (const safeArea of [0, 20, 34]) {
      assert.equal(resolveClearance(baseline, {safeArea, globalLast}), 100 + safeArea)
      assert.equal(resolveClearance(baseline, {navHeight: 84, safeArea, globalLast}), 108)
      assert.equal(resolveClearance(baseline, {width: 1280, navHeight: 84, safeArea, globalLast}), 170)
    }
  }
  assert.throws(() => contract(baseline))
})
test('mobile editor hide rule excludes checkbox focus and preserves measured or safe-area reservation', () => reservationContract(mobile))
test('actual normal and compact JSX ancestry preserves native consent without claiming compact170px clearance', () => {
  componentContract(component)
  focusRingContract(local)
})

for (const [name, from, to] of [
  ['remove wrapper specificity', localSelector, '.enquiryForm input'],
  ['zero out clearance', 'scroll-margin-bottom:170px;', 'scroll-margin-bottom:0px;'],
  ['restore dynamic nav clearance', 'scroll-margin-bottom:170px;', 'scroll-margin-bottom:calc(var(--ia222-bottom-height,76px) + 24px);'],
  ['global important override', 'scroll-margin-bottom:170px;', 'scroll-margin-bottom:170px !important;'],
  ['wrong local ancestry', localSelector, '.absent .enquiryForm input'],
]) test('rejects ' + name, () => assert.throws(() => contract(replaceOnce(local, from, to))))

test('rejects a mobile important override even though local specificity remains correct', () => {
  const mutant = replaceOnce(mobile, ' + 24px);', ' + 24px) !important;')
  assert.throws(() => contract(local, mutant))
  assert.throws(() => reservationContract(mutant))
})
test('rejects a shorthand input-clearance override instead of silently ignoring its property', () => {
  assert.throws(() => contract(local + '\n.wrapper .enquiryForm input:focus { scroll-margin:0px; }'))
})
test('rejects a focus-only local clearance override instead of silently ignoring its selector', () => {
  assert.throws(() => contract(local + '\n.wrapper .enquiryForm input:focus { scroll-margin-bottom:0px; }'))
})
for (const [name, mutate] of [
  ['focus reservation collapse', source => source + '\n@media (max-width: 767px) { body:has(input:focus) { --ia222-bottom-height:0px !important; } }'],
  ['lost safe-area fallback', source => source.replaceAll('calc(76px + env(safe-area-inset-bottom, 0px))', '76px')],
  ['checkbox hides navigation', source => replaceOnce(source, ':not([type="checkbox"])', '')],
]) test('rejects ' + name, () => { const mutant = mutate(mobile); assert.notEqual(mutant, mobile); assert.throws(() => reservationContract(mutant)) })
for (const value of ['calc(76px - 24px)', 'var(--other,76px)', 'env(other,0px)', '170px garbage', 'calc(var(--ia222-bottom-height,BOGUS) + 24px)', 'calc(76px + 24px', '170em', 'calc(76px+24px)', 'calc(76px +24px)', 'calc (76px + 24px)']) {
  test('bounded CSS parser rejects ' + value, () => assert.throws(() => lengthExpression(value)))
}
for (const [name, from, to] of [
  ['normal wrong ancestry', 'className={styles.wrapper} data-contact-channel-chooser', 'className={styles.absent} data-contact-channel-chooser'],
  ['compact borrowing normal clearance', '[styles.compactPhone, compactTrigger ? styles.compactPhoneToggle : ""].filter(Boolean).join(" ")', 'styles.wrapper'],
  ['compact base class cannot depend on trigger', '[styles.compactPhone, compactTrigger ?', '[compactTrigger ? styles.compactPhone : "", compactTrigger ?'],
  ['normal missing consent', '<input type="checkbox" required checked={consent}', '<input type="checkbox" checked={consent}'],
  ['compact unchecked override', '<input type="checkbox" checked={consent} required', '<input type="checkbox" checked={true} required'],
  ['fabricated initial consent', 'const [consent, setConsent] = useState(false)', 'const [consent, setConsent] = useState(true)'],
  ['normal pointer cancellation', '// Keep the visible pointer target stable; native activation still owns consent.', 'event.preventDefault();'],
  ['compact change grants consent', 'setConsent(event.target.checked); setError("");', 'setConsent(true); setError("");'],
  ['normal loses preventScroll', '// Keep the visible pointer target stable; native activation still owns consent.\n                  event.currentTarget.focus({ preventScroll: true });', 'event.currentTarget.focus();'],
  ['normal reduced motion ignored', 'block: "center", behavior: reducedMotion ? "auto" : "smooth"', 'block: "center", behavior: "smooth"'],
  ['compact reduced motion ignored', 'block: "nearest", behavior: reducedMotion ? "auto" : "smooth"', 'block: "nearest", behavior: "smooth"'],
  ['compact scrolling without an open form', 'if (!compactPhone || !compactTrigger || !open) return;', 'if (!compactPhone || !compactTrigger) return;'],
  ['compact scroll uses normal centering', 'block: "nearest", behavior: reducedMotion', 'block: "center", behavior: reducedMotion'],
  ['compact scroll loses open dependency', '}, [compactPhone, compactTrigger, open, saved]);', '}, [compactPhone, compactTrigger, saved]);'],
]) test('AST rejects ' + name, () => {
  const mutated = replaceOnce(component, from, to) // A missing/duplicate mutation target is not a successful negative.
  assert.throws(() => componentContract(mutated))
})
test('rejects loss of normal-form keyboard focus outline', () => {
  assert.throws(() => focusRingContract(replaceOnce(local, '.contactFields input:focus-visible, .consent input:focus-visible { outline:3px solid #80abc7;', '.contactFields input:focus-visible, .consent input:focus-visible { outline:none;')))
})

// Mutate a real declaration selected by PostCSS, not a disconnected parser fixture.
function mutateMobileDeclaration(source, selector, property, mutate) {
  const root = postcss.parse(source), matches = []
  root.walkRules(rule => {
    if (rule.selector !== selector || rule.parent.type !== 'atrule' || rule.parent.params !== '(max-width: 767px)') return
    mobileMedia(rule)
    rule.walkDecls(property, declaration => matches.push(declaration))
  })
  assert.equal(matches.length, 1, 'One actual mobile declaration for whitespace boundary')
  const before = matches[0].value
  matches[0].value = mutate(before)
  assert.notEqual(matches[0].value, before)
  return root.toString()
}
const whitespaceBoundaries = [
  ['after calc open', (value, whitespace) => value.replace('calc(', 'calc(' + whitespace)],
  ['around addition', (value, whitespace) => value.replace(' + ', whitespace + '+' + whitespace)],
  ['trailing value', (value, whitespace) => value + whitespace],
]
const editorSelectorBoundaries = [
  (source, whitespace) => replaceOnce(source, 'body:has(:is(\n', whitespace + 'body:has(:is(\n'),
  (source, whitespace) => replaceOnce(source, 'body:has(:is(\n', 'body:has(:is(\n' + whitespace),
  (source, whitespace) => replaceOnce(source, '):focus) .ia222-bottom-navigation {', '):focus) .ia222-bottom-navigation' + whitespace + ' {'),
  (source, whitespace) => replaceOnce(source, '):focus) .ia222-bottom-navigation', '):focus)' + whitespace + whitespace + '.ia222-bottom-navigation'),
]
const mobileDeclarations = [
  [globalSelector, 'scroll-margin-bottom'],
  ['body:has(.ia222-bottom-navigation)', 'padding-bottom'],
]
for (const [name, whitespace] of [['SPACE', ' '], ['TAB', '\t'], ['LF', '\n'], ['CR', '\r'], ['FF', '\f']]) {
  test('accepts CSS ' + name + ' at actual declaration and editor-selector boundaries', () => {
    for (const [selector, property] of mobileDeclarations) {
      for (const [boundary, mutate] of whitespaceBoundaries) {
        // The SPACE addition is already in the source; make it two valid spaces.
        const separator = name === 'SPACE' && boundary === 'around addition' ? '  ' : whitespace
        reservationContract(mutateMobileDeclaration(mobile, selector, property, value => mutate(value, separator)))
      }
    }
    for (const mutate of editorSelectorBoundaries) reservationContract(mutate(mobile, whitespace))
  })
}
for (const [name, whitespace] of [['NBSP', '\u00a0'], ['VT', '\u000b'], ['BOM', '\ufeff'], ['LINE SEPARATOR', '\u2028'], ['PARAGRAPH SEPARATOR', '\u2029'], ['EM SPACE', '\u2003']]) {
  test('rejects non-CSS ' + name + ' at actual declaration and editor-selector boundaries', () => {
    for (const [selector, property] of mobileDeclarations) {
      for (const [boundary, mutate] of whitespaceBoundaries) {
        const mutant = mutateMobileDeclaration(mobile, selector, property, value => mutate(value, whitespace))
        assert.throws(() => reservationContract(mutant), undefined, property + ': ' + boundary)
      }
    }
    for (const mutate of editorSelectorBoundaries) assert.throws(() => reservationContract(mutate(mobile, whitespace)))
    const localVariant = replaceOnce(local, 'scroll-margin-bottom:170px;', 'scroll-margin-bottom:170px' + whitespace + ';')
    assert.throws(() => contract(localVariant))
  })
}
