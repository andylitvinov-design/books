import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as whatsappEnquiry from '../lib/whatsapp-enquiry.js'
import { availableSavedReports, latestReceivedReport } from '../lib/profile/report-summary.js'

const source = readFileSync(new URL('../components/app/profile-domains.jsx', import.meta.url), 'utf8')
const transpiled = ts.transpileModule(source, { fileName: 'profile-domains.jsx', reportDiagnostics: true, compilerOptions: {
  jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} })
assert.deepEqual(
  (transpiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error)
    .map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')),
  [],
  'Profile JSX must compile without syntax errors',
)
const compiled = transpiled.outputText
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree)
  ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)]

function mount(mode, locale) {
  const slots = [], calls = []
  let index = 0, pending = [], dirty = false, tree
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]))
  const react = {
    useState(initial) {
      const i = index++
      slots[i] ||= { value: typeof initial === 'function' ? initial() : initial }
      return [slots[i].value, value => {
        if (!Object.is(slots[i].value, value)) { slots[i].value = value; dirty = true }
      }]
    },
    useRef(initial) { return slots[index++] ||= { current: initial } },
    useEffect(fn, deps) {
      const i = index++
      if (!same(slots[i]?.deps, deps)) pending.push(() => {
        slots[i]?.cleanup?.()
        slots[i] = { deps, cleanup: fn() }
      })
    },
  }
  const element = (type, props, key) => ({ type, props, key })
  const modules = {
    react, 'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'Fragment' },
    'next/link': { default: 'a' }, 'next/dynamic': { default: () => 'development-program-boundary' }, 'lucide-react': new Proxy({}, { get: () => 'svg' }),
    '@/lib/whatsapp-enquiry': whatsappEnquiry,
    '@/lib/profile/report-summary': { availableSavedReports, latestReceivedReport },
    '@/lib/documents/recommendation': { recommendationItemType: item => item.type },
    '@/lib/profile/profile-service-offers': {
      PROFILE_AREAS: ['psychology', 'homeopathy', 'wu_xing', 'hypnotherapy'],
      profileServiceOffer: () => { throw new Error('Service rendering is outside this state regression') },
    },
    './profile-domains.css': {}, './profile-refresh.css': {},
    './free-express-my-requests': { default: () => 'private-express-requests' },
  }
  const runtime = { exports: {}, require: key => {
    assert.ok(Object.hasOwn(modules, key), 'Unexpected import: ' + key)
    return modules[key]
  }, Intl, console, window: { location: { hash: '' } }, fetch: async (path, options) => {
    calls.push({ path, options })
    return { ok: true, json: async () => path.includes('/reports/')
      ? { report: { title: 'Synthetic saved report', profileArea: 'psychology' } }
      : { document: { recommendationType: 'homeopathy', items: [] } } }
  } }
  vm.runInNewContext(compiled, runtime)
  const props = { mode, locale,
    savedReports: [{ id: 'synthetic-report', available: true }],
    savedDocuments: [{ id: 'synthetic-document', kind: 'recommendation' }],
  }
  function render() {
    index = 0; pending = []; dirty = false
    tree = runtime.exports.ProfileDomains(props)
    pending.forEach(fn => fn())
    return tree
  }
  async function settle() {
    for (let i = 0; i < 20; i++) { await Promise.resolve(); if (dirty) render() }
  }
  render()
  return { calls, render, settle,
    elements: () => nodes(tree),
    disclosure: () => nodes(tree).find(node => node.type === 'details' && node.props.className === 'hh-domain-more'),
    tab: area => nodes(tree).find(node => node.props?.id === 'hh-domain-tab-' + area),
    toggle: open => nodes(tree).find(node => node.props?.className === 'hh-domain-more').props.onToggle({ currentTarget: { open } }),
  }
}

for (const locale of ['en', 'ru']) {
  test(locale + ' authenticated My Profile reveals four areas and reads only its account-scoped archive', async () => {
    const h = mount('account', locale)
    await h.settle()
    assert.ok(h.disclosure(), 'the four-area selector is available in the signed-in cabinet')
    assert.equal(h.disclosure().props.open, true)
    for (const area of ['psychology', 'homeopathy', 'wu_xing', 'hypnotherapy']) {
      assert.ok(h.tab(area), 'missing profile area: ' + area)
    }
    assert.equal(h.calls.length, 2, 'saved report and document are read once')
    assert.ok(h.calls.every(call => /^\/api\/app\/(?:reports|documents)\//.test(call.path)))
    assert.ok(h.calls.every(call => call.options.credentials === 'same-origin' && call.options.cache === 'no-store'))
    h.tab('wu_xing').props.onClick()
    await h.settle()
    h.toggle(false)
    h.render()
    await h.settle()
    assert.equal(h.disclosure().props.open, false)
    assert.equal(h.calls.length, 2, 'switching or closing a profile does not refetch private data')
    assert.equal(h.elements().some(node =>
      typeof node.props?.className === 'string' &&
      /hh-domain-(footer-actions|private)/.test(node.props.className)
    ), false, 'account Profile omits redundant public CTAs and private-link-only notices')
  })

  test(locale + ' legacy area disclosure starts open and remains user-toggleable without account requests', async () => {
    const h = mount('legacy', locale)
    await h.settle()
    assert.equal(h.disclosure().props.open, true)
    assert.equal(Object.hasOwn(h.disclosure().props, 'defaultOpen'), false)
    h.toggle(false); await h.settle(); h.render(); await h.settle()
    assert.equal(h.disclosure().props.open, false)
    h.toggle(true); await h.settle()
    h.tab('wu_xing').props.onClick(); await h.settle()
    assert.equal(h.disclosure().props.open, true)
    assert.equal(h.calls.length, 0, 'legacy disclosure never fetches another account archive')
  })
}
