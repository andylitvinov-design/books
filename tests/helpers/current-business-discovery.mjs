// Execute the actual public page, offer data and composed card declarations.
// Unrelated widgets are inert JSX markers; no browser, transport or database is used.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as whatsapp from '../../lib/whatsapp-enquiry.js'
import * as videoModel from '../../lib/site-videos/model.js'

const root = new URL('../../', import.meta.url)
const read = path => readFileSync(new URL(path, root), 'utf8')
const element = (type, props) => {
  assert.ok(typeof type === 'string' || typeof type === 'function', 'Undefined JSX component')
  return {type, props: props || {}}
}
const jsx = {jsx: element, jsxs: element, Fragment: 'fragment'}
const css = {default: new Proxy({}, {get: (_, key) => String(key)})}
const denied = () => { throw new Error('External operation forbidden in public discovery fixture') }
const icons = Object.fromEntries('ArrowRight ChevronDown ClipboardCheck ShieldCheck ArrowUpRight PlayCircle Check Compass Lightbulb'.split(' ').map(name => [name, 'icon-' + name]))
export function sourceModule(source, path, modules) {
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  assert.equal(ast.parseDiagnostics.length, 0, path + ' parses')
  const code = ts.transpileModule(source, {fileName: path, compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  }}).outputText
  const compiledModule = {exports: {}}
  vm.runInNewContext(code, {module: compiledModule, exports: compiledModule.exports, fetch: denied, XMLHttpRequest: denied, WebSocket: denied,
    require: name => {assert.ok(Object.hasOwn(modules, name), 'Unexpected dependency ' + name); return modules[name]},
  }, {filename: path, timeout: 5000})
  return compiledModule.exports
}
function flat(tree) {
  if (Array.isArray(tree)) return tree.flatMap(flat)
  if (!tree || typeof tree !== 'object' || !('type' in tree)) return []
  return [tree, ...flat(tree.props.children)]
}
function render(tree) {
  if (Array.isArray(tree)) return tree.map(render)
  if (!tree || typeof tree !== 'object' || !('type' in tree)) return tree
  if (typeof tree.type === 'function') return render(tree.type(tree.props))
  return {...tree, props: {...tree.props, children: render(tree.props.children)}}
}
export async function assertCurrentBusinessDiscovery({locale = 'es', mode = 'online', topic = 'all', overrides = {}} = {}) {
  const load = (path, modules = {}) => sourceModule(overrides[path] ?? read(path), path, {'react/jsx-runtime': jsx, ...modules})
  const core = load('data/core-service-offers.ts')
  const state = {mode, topic}
  const explorer = load('components/services-explorer-state.tsx', {react: {
    createContext: () => ({Provider: 'provider'}), useContext: () => state, useState: denied,
  }})
  const common = {
    'next/link': {default: 'a'}, 'next/image': {default: 'img'}, 'lucide-react': icons,
    '@/components/static-portrait': {StaticPortrait: 'portrait'},
    '@/components/contact-channel-chooser': {ContactChannelChooser: 'chooser'},
    '@/data/core-service-offers': core, '@/lib/whatsapp-enquiry': whatsapp,
  }
  const studio = load('components/services-studio-offers.tsx', {...common,
    '@/components/services-explorer-state': explorer, './services-studio-offers.module.css': css,
  })
  const modules = {
    'next/navigation': {notFound: denied, redirect: denied},
    '@/components/public-site-header': {PublicSiteHeader: 'header'},
    '@/components/services-conversion-hero': {ServicesConversionHero: 'hero'},
    '@/components/services-explorer-state': {ServicesExplorerProvider: 'provider'},
    '@/components/services-studio-offers': studio,
    '@/components/services-studio-extras': {ServicesIntroMedia: 'media', ServicesMethodVideos: 'videos', ServicesDirectoryInvitation: 'directory'},
    '@/components/personal-testimonials': {PersonalTestimonials: 'testimonials'},
    '@/components/public-consultation-cta': {PublicConsultationCta: 'consultation'},
    '@/components/compact-lead-capture': {CompactLeadCapture: 'capture'},
    '@/lib/commerce/wise-payments': {wisePaymentsEnabled: () => false},
    '@/lib/commerce/paypal-personal': {personalPayPalEnabled: () => false},
    '@/lib/spanish-metadata': {spanishMetadata: () => ({})},
    '@/data/remedies': {getHomeopathyLocaleParams: denied, isSupportedLocale: value => ['en','ru'].includes(value)},
    '@/data/site-metadata': {metadataBaseFor: denied},
  }
  const page = load(locale === 'es' ? 'app/es/services/page.tsx' : 'app/[locale]/services/page.tsx', modules)
  const tree = await page.default({params: Promise.resolve({locale}), searchParams: Promise.resolve({})})
  assert.equal(tree.type, 'main')
  assert.equal(tree.props.lang, locale)
  assert.notEqual(tree.props.hidden, true, 'Public page must remain visible')
  const providers = flat(tree).filter(node => node.type === 'provider')
  assert.equal(providers.length, 1, 'One live public service provider')
  assert.notEqual(providers[0].props.hidden, true, 'Public service provider must remain visible')
  const mounts = flat(providers[0]).filter(node => node.type === studio.ServicesStudioOffers)
  assert.equal(mounts.length, 1, 'The real page mounts exactly one actual offer composition')
  assert.equal(mounts[0].props.locale, locale, 'Actual mounted locale')
  const cards = flat(render(mounts[0])).filter(node => node.props['data-services-studio-card'] === 'business')
  assert.equal(cards.length, 1, 'Business offer must remain rendered exactly once')
  assert.equal(cards[0].props.hidden, false, 'Business offer remains visible for the selected public filter')
  const expected = '/' + locale + '/services/business-consulting'
  const links = flat(cards[0]).filter(node => node.type === 'a')
  assert.equal(links.length, 3, 'Photo, title and expanded details keep the real destination')
  for (const link of links) assert.equal(link.props.href, expected, 'Business link preserves exact locale destination')
  const chooser = flat(cards[0]).filter(node => node.type === 'chooser')
  assert.equal(chooser.length, 1)
  assert.equal(chooser[0].props.locale, locale)
  assert.equal(chooser[0].props.event, 'service_request_start')
  assert.equal(chooser[0].props.attributes['data-services-studio-action'], 'business')
  assert.ok(new URL(chooser[0].props.whatsappUrl).searchParams.get('text').includes(expected))
  const solutions = load('components/services-solutions.tsx', {...common,
    '@/components/acquisition-event-link': {AcquisitionEventLink: 'a'},
    '@/data/service-video-library': load('data/service-video-library.ts', {'@/lib/site-videos/model': videoModel}), './services-solutions.module.css': css,
  })
  const home = flat(solutions.ServicesSolutions({locale, variant: 'home'})).filter(node => node.props['data-core-service-id'])
  assert.deepEqual(home.map(node => node.props['data-core-service-id']), ['situation','dao','alchemy','hypnotherapy'], 'ServicesSolutions home variant keeps exactly four original service cards')
}
export const businessDiscoverySource = read

export function assertCurrentBusinessLandingMedia({locale = 'en', source = read('components/business-consulting-landing.tsx')} = {}) {
  const coreCopy = sourceModule(read('data/business-consulting-copy.ts'), 'data/business-consulting-copy.ts', {})
  const landing = sourceModule(source, 'components/business-consulting-landing.tsx', {
    'react/jsx-runtime': jsx, 'next/link': {default: 'a'}, 'next/image': {default: 'img'}, 'lucide-react': icons,
    '@/components/acquisition-event-link': {AcquisitionEventLink: 'a'},
    '@/components/contact-channel-chooser': {ContactChannelChooser: 'chooser'},
    '@/components/public-site-header': {PublicSiteHeader: 'header'},
    '@/components/business-website-enquiry': {BusinessWebsiteEnquiry: 'website-enquiry'},
    '@/components/service-video-showcase': {ServiceVideoShowcase: 'showcase'},
    '@/lib/whatsapp-enquiry': whatsapp, '@/data/business-consulting-copy': coreCopy,
    './business-consulting-landing.module.css': css,
  })
  const tree = landing.BusinessConsultingLanding({locale})
  const media = flat(tree).filter(node => node.type === 'showcase')
  assert.equal(media.length, 1, 'One explicit public business case-study video')
  assert.deepEqual({...media[0].props}, {topic: 'constellation-case', locale, id: 'business-constellation-video'},
    'Business landing keeps the exact case-study topic and locale, not a generic showcase')
}
