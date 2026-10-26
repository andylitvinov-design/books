import assert from 'node:assert/strict'
import vm from 'node:vm'
import ts from 'typescript'
import { serviceMatchesGoal } from '../../lib/practitioners/discovery-intent.js'
import { getPublicServiceDetailHref } from '../../lib/practitioners/public-service-links.js'

const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : !tree || typeof tree !== 'object' ? [] : [tree, ...nodes(tree.props?.children)]
const jsx = (type, props) => { assert.ok(type, 'No undefined JSX dependency'); return { type, props: props || {} } }
const forbidden = () => { throw new Error('External operation forbidden in synthetic mentor fixture') }
function fixture(source, locale, slug = 'andy-litvinov') {
  const parsed = ts.createSourceFile('master-network-explorer.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  assert.equal(parsed.parseDiagnostics.length, 0)
  const states = { master: [], filters: [] }
  let context = 'master', cursor = 0, writes = 0
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    react: { useMemo: callback => callback(), useState: initial => {
      const bucket = states[context], index = cursor++
      if (!(index in bucket)) bucket[index] = initial
      return [bucket[index], next => { writes++; bucket[index] = typeof next === 'function' ? next(bucket[index]) : next }]
    } },
    'next/link': { default: 'a' },
    '@/components/service-funnel-tracking': { ServiceFunnelImpression: 'impression', TrackedServiceLink: 'tracked-link' },
    '@/lib/practitioners/discovery-intent.js': { serviceMatchesGoal },
    '@/lib/practitioners/public-service-links.js': { getPublicServiceDetailHref },
    './master-network-explorer.module.css': { default: new Proxy({}, { get: (_, key) => String(key) }) },
  }
  const componentModule = { exports: {} }
  vm.runInNewContext(ts.transpileModule(source, { fileName: 'master-network-explorer.tsx', compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText, { module: componentModule, exports: componentModule.exports, fetch: forbidden, XMLHttpRequest: forbidden, WebSocket: forbidden,
    require: name => { assert.ok(Object.hasOwn(modules, name), 'Unexpected mentor import ' + name); return modules[name] },
  }, { timeout: 2000 })
  const service = (id, serviceSlug, offeringType) => ({ id, slug: serviceSlug, offeringType,
    practitionerSlug: slug, status: 'published', areaKey: 'personal_growth', deliveryFormat: 'online',
    languages: ['en', 'ru', 'es'], methods: ['Synthetic method'], pricingMode: 'contact', copy: { title: 'Fictional ' + id } })
  const practitioners = [{ id: 'fictional-master', slug, profile: { displayName: 'Synthetic Mentor', languages: ['en', 'ru', 'es'] },
    services: [service('unfiltered', 'unrelated-session', 'session'), service('assessment', 'homeopathy-consultation', 'assessment'),
      service('course-a', 'unrelated-course', 'course'), service('course-b', 'selected-course', 'course')] }]
  let masterTree, filtersTree
  function render() {
    context = 'master'; cursor = 0
    masterTree = componentModule.exports.MarketplaceMasterFinder({ practitioners, courses: [], locale })
    const filters = nodes(masterTree).find(node => typeof node.type === 'function' && node.type.name === 'Filters')
    assert.ok(filters, 'Actual Filters component remains composed before cards')
    context = 'filters'; cursor = 0; filtersTree = filters.type(filters.props)
    return { masterTree, filtersTree }
  }
  render()
  return { render, get masterTree() { return masterTree }, get filtersTree() { return filtersTree },
    select(id, selected) {
      const control = nodes(filtersTree).find(node => node.type === 'select' && node.props.id === id)
      assert.ok(control && !control.props.disabled, 'Actual enabled filter control')
      control.props.onChange({ target: { value: selected } }); render()
    },
    gesture(type) {
      const button = nodes(filtersTree).find(node => node.type === 'button' && node.props['aria-controls'] === 'mentor-extra-filters')
      assert.ok(button, 'Actual advanced filter control')
      writes = 0
      let prevented = false
      if (type === 'touch') {
        button.props.onTouchEnd({ preventDefault() { prevented = true } })
        // Browser-compatible synthetic sequence: only an uncancelled touch gets a follow-up click.
        if (!prevented) button.props.onClick()
        assert.equal(prevented, true, 'Touch cancels its compatibility click')
      } else button.props.onClick()
      assert.equal(writes, 1, 'Exactly one state transition per click or touch gesture')
      render()
    },
  }
}

export function assertFilteredMentorRoutes(source) {
  for (const locale of ['en', 'ru', 'es']) for (const slug of ['andy-litvinov', 'fictional-other-practitioner']) {
    const f = fixture(source, locale, slug)
    const route = expected => {
      const services = nodes(f.masterTree).filter(node => node.type === 'a' && node.props.href?.startsWith('/' + locale + '/services/'))
      assert.equal(services.length, 1, 'One current selected service destination')
      assert.equal(services[0].props.href, expected, 'Actual selected service uses its canonical localized destination')
    }
    route('/' + locale + '/services/' + slug + '/unrelated-session')
    f.select('mentor-filter-offering', 'assessment')
    route('/' + locale + '/services/' + (slug === 'andy-litvinov' ? 'alchemy-of-soul' : slug + '/homeopathy-consultation'))
    f.select('mentor-filter-offering', 'course')
    route('/' + locale + '/services/' + slug + '/unrelated-course')
    f.select('mentor-filter-course', 'service:course-b')
    route('/' + locale + '/services/' + slug + '/selected-course')
    f.select('mentor-filter-offering', 'session')
    route('/' + locale + '/services/' + slug + '/unrelated-session')
  }
}

export function assertMentorDisclosure(source) {
  for (const locale of ['en', 'ru', 'es']) {
    const f = fixture(source, locale)
    const state = expanded => {
      const rendered = nodes(f.filtersTree)
      const button = rendered.find(node => node.type === 'button' && node.props['aria-controls'] === 'mentor-extra-filters')
      const body = rendered.find(node => node.props.id === 'mentor-extra-filters')
      assert.ok(button && body)
      assert.equal(button.props.type, 'button')
      assert.equal(button.props['aria-expanded'], expanded)
      assert.equal(body.props.hidden, !expanded)
      assert.ok(nodes(body).filter(node => node.type === 'select').length >= 4, 'The actual method/location/price/sort controls remain inside the disclosure')
    }
    state(false); f.gesture('click'); state(true); f.gesture('click'); state(false)
    f.gesture('touch'); state(true); f.gesture('touch'); state(false)
  }
}
