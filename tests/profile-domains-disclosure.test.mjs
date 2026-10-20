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
  test(locale + ' account Profile omits obsolete lower panels and does not fetch their records', async () => {
    const h = mount('account', locale)
    await h.settle()
    assert.equal(h.disclosure(), undefined, 'area disclosure remains on legacy cabinets only')
    assert.equal(h.calls.length, 0, 'removed panels trigger no account report/document reads')
    assert.equal(h.elements().some(node =>
      typeof node.props?.className === 'string' &&
      /hh-domain-(more|footer-actions|private)/.test(node.props.className)
    ), false, 'account Profile has no legacy lower actions or repeated privacy line')
    h.render(); await h.settle()
    assert.equal(h.calls.length, 0, 'rerender must not reintroduce hidden data reads')
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
