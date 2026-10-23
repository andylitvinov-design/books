import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

// Bounded source-render fixture, not a browser/React hydration test. Execute the
// actual exported page and deferred card components. Infrastructure and unrelated
// leaf widgets stay explicitly opaque; an unlisted import fails closed.
const root = new URL('../../', import.meta.url);
const actual = [
  'components/holistic-house-home.tsx', 'app/es/page.tsx',
  'components/home-more-disclosure.tsx', 'components/services-solutions.tsx',
  'components/homepage-topic-journeys.tsx', 'components/home-explore-sections.tsx',
  'components/site-navigation.tsx', 'components/compact-navigation-icons.ts',
  'components/acquisition-event-link.tsx', 'components/homepage-contact-cta.tsx',
  'components/homepage-free-capture.tsx', 'components/services-explorer-state.tsx',
  'components/services-studio-offers.tsx', 'components/services-studio-extras.tsx',
  'app/[locale]/services/page.tsx', 'app/es/services/page.tsx',
  'data/local-acquisition.js', 'data/core-service-offers.ts', 'data/service-video-library.ts',
  'lib/assessments/contracts.js', 'lib/site-videos/model.js', 'lib/whatsapp-enquiry.js', 'lib/site-navigation-model.js',
  'lib/ui-locale.js', 'lib/public-locales.ts', 'lib/spanish-metadata.ts',
];

export const readHomeSource = file => readFileSync(new URL(file, root), 'utf8');
export const nodes = tree => !tree || typeof tree !== 'object' ? [] :
  [tree, ...(tree.children ?? []).flatMap(nodes)];
export const textOf = tree => typeof tree === 'string' || typeof tree === 'number' ? String(tree) :
  (tree?.children ?? []).map(textOf).join(' ').replace(/\s+/g, ' ').trim();
export const elements = (tree, type) => nodes(tree).filter(node => node.type === type);
export const components = (tree, name) => nodes(tree).filter(node => node.component === name);
export const links = tree => elements(tree, 'a');

export function assertPhotoOffers(tree, locale, attribute = 'data-core-service-id') {
  const routes = { situation: 'free-situation-review', dao: 'dao-health-profile', alchemy: 'alchemy-of-soul', hypnotherapy: 'hypnotherapy-course' };
  const cards = elements(tree, 'article').filter(node => node.props[attribute]);
  assert.deepEqual(cards.map(node => node.props[attribute]), Object.keys(routes));
  for (const card of cards) {
    assert.ok(links(card).some(link => link.props.href === `/${locale}/services/${routes[card.props[attribute]]}`));
    assert.ok(elements(card, 'h3').some(title => textOf(title).length > 4));
    assert.ok(nodes(card).some(node => (node.type === 'img' || node.component === 'StaticPortrait') && node.props.src?.startsWith('/')));
  }
}

export async function assertDeferredHome(fixture, locale) {
  const { initial, expanded } = await fixture.expandHome();
  const disclosure = elements(initial, 'details').find(node => node.props.id === 'more-directions');
  assert.equal(disclosure.props.open, undefined, 'The catalogue is initially closed');
  assert.equal(disclosure.props['data-home-more-deferred'], 'true');
  const summaries = elements(disclosure, 'summary');
  assert.equal(summaries.length, 1);
  assert.ok(textOf(summaries[0]).includes({ en: 'All programmes and services', ru: 'Все направления и услуги', es: 'Todos los programas y servicios' }[locale]));
  assert.deepEqual(links(elements(disclosure, 'noscript')[0]).map(node => node.props.href),
    [`/${locale}/services`, `/${locale}/client/tests`, `/${locale}/academy`]);
  for (const name of ['ServicesSolutions', 'HomeExploreSections']) assert.equal(components(initial, name).length, 0, name + ' must be deferred');
  assert.equal(components(expanded, 'HomeExploreSections').length, 1);
  // Owner-merged #1609 deliberately promotes three needs-based directions to
  // the initial page, outside the still-deferred service/guide catalogue.
  for (const tree of [initial, expanded]) {
    const journeys = components(tree, 'HomepageTopicJourneys');
    assert.equal(journeys.length, 1, 'The initial page mounts one three-direction section');
    const more = elements(tree, 'details').find(node => node.props.id === 'more-directions');
    assert.ok(nodes(tree).indexOf(journeys[0]) < nodes(tree).indexOf(more));
    assert.ok(!nodes(more).includes(journeys[0]), 'Directions must not be hidden inside the catalogue');
    assert.deepEqual(links(journeys[0]).map(link => link.props.href), ['energy', 'love', 'business'].map(id => `/${locale}/explore/${id}`));
    assert.deepEqual(elements(journeys[0], 'article').map(node => node.props['data-topic-id']), ['energy', 'relationships', 'business']);
    assert.ok(textOf(journeys[0]).includes({ en: 'Energy · Love · Business', ru: 'Энергия · Любовь · Бизнес', es: 'Energía · Amor · Negocios' }[locale]));
    for (const card of links(journeys[0])) {
      assert.ok(textOf(card).length > 20);
      assert.ok(elements(card, 'img').some(image => image.props.src?.startsWith('/')));
    }
  }
  if (locale !== 'es') {
    const offers = components(expanded, 'ServicesSolutions');
    assert.equal(offers.length, 1);
    assert.equal(offers[0].props.variant, 'home');
    assertPhotoOffers(offers[0], locale);
    assert.equal(nodes(offers[0]).filter(node => node.props?.id === 'free-start').length, 1);
  } else {
    // ES deliberately retains its three inline service directions inside the
    // native disclosure, rather than silently substituting the EN/RU cards.
    const cards = links(expanded).filter(node => node.props.className === 'service-home-card');
    assert.deepEqual(cards.map(node => node.props.href), ['systemic-constellations', 'psychohomeopathy', 'imagery-therapy'].map(route => '/es/services/' + route));
    for (const card of cards) {
      assert.ok(elements(card, 'h3').some(title => textOf(title).length > 4));
      assert.ok(elements(card, 'img').some(image => image.props.src?.startsWith('/')));
    }
    const more = elements(expanded, 'details').find(node => node.props.id === 'more-directions');
    assert.ok(cards.every(card => nodes(more).includes(card)));
  }
  const opened = elements(expanded, 'details').find(node => node.props.id === 'more-directions');
  opened.props.onToggle({ currentTarget: { open: false } });
  const closedAgain = await fixture.renderHome();
  for (const name of ['ServicesSolutions', 'HomeExploreSections']) assert.equal(components(closedAgain, name).length, 0, name + ' unmounts when closed');
  assert.equal(components(closedAgain, 'HomepageTopicJourneys').length, 1, 'Directions stay available after closing the catalogue');
  return { initial, expanded };
}

export function assertExploreLinks(tree, locale) {
  const guides = components(tree, 'HomeExploreSections'); assert.equal(guides.length, 1);
  const guide = guides[0];
  const cards = links(guide).filter(node => node.props['data-home-explore-id']);
  assert.deepEqual(cards.map(node => node.props['data-home-explore-id']), ['diagnostics', 'tests', 'services', 'academy', 'business', 'ideas']);
  assert.deepEqual(cards.map(node => node.props.href), ['services/free-situation-review', 'client/tests', 'services', 'academy', 'explore/business', 'books'].map(route => `/${locale}/${route}`));
  for (const card of cards) {
    assert.ok(textOf(card).length > 20);
    assert.ok(nodes(card).some(node => (node.type === 'img' || node.component === 'StaticPortrait') && node.props.src?.startsWith('/')));
  }
  const footer = links(guide).slice(6);
  assert.deepEqual(footer.map(node => node.props.href), [`/${locale}/tests`, `/${locale === 'es' ? 'en' : locale}/app`, `/${locale}/library`]);
  assert.ok(footer.every(link => textOf(link).length > 4));
  assert.ok(textOf(guide).includes({ en: 'Browse courses', ru: 'Выбрать курс', es: 'Explorar cursos' }[locale]));
}

export function homeFixture({ locale = 'en', overrides = {} } = {}) {
  const cache = new Map(), states = new Map();
  let cursor = '', hook = 0;
  const jsx = (type, props = {}) => ({ type, props });
  const opaque = name => Object.assign(props => jsx('opaque', { name, ...props }), { displayName: name });
  const pass = name => Object.assign(({ children }) => children, { displayName: name });
  const stop = name => () => { throw new Error('Outside home fixture scope: ' + name); };
  const react = {
    useState(initial) {
      const key = cursor + ':' + hook++;
      if (!states.has(key)) states.set(key, typeof initial === 'function' ? initial() : initial);
      return [states.get(key), value => states.set(key, typeof value === 'function' ? value(states.get(key)) : value)];
    },
    useId: () => 'fixture-id', useRef: value => ({ current: value }),
    useEffect: () => {},
    createContext(value) { const context = { value }; context.Provider = { context }; return context; },
    useContext: context => context.value,
  };
  const explicit = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
    'next/link': { default: props => jsx('a', props) },
    'next/image': { default: props => jsx('img', props) },
    'next/navigation': { usePathname: () => locale === 'en' ? '/' : '/' + locale, notFound: stop('notFound'), redirect: stop('redirect') },
    'next/dynamic': { default: loader => async props => { const loaded = await loader(); const component = loaded?.default ?? loaded; assert.equal(typeof component, 'function', 'Dynamic loader resolves the actual exported component'); return jsx(component, props); } },
    'lucide-react': new Proxy({}, { get: (_, name) => opaque(String(name)) }),
    '@/components/static-portrait': { StaticPortrait: opaque('StaticPortrait') },
    '@/components/contact-channel-chooser': { ContactChannelChooser: opaque('ContactChannelChooser') },
    '@/components/home-section-carousel': { HomeSectionCarousel: opaque('HomeSectionCarousel') },
    '@/components/home-free-diagnosis-banner': { HomeFreeDiagnosisBanner: opaque('HomeFreeDiagnosisBanner') },
    '@/components/home-conversation-guide': { HomeConversationGuide: opaque('HomeConversationGuide') },
    '@/components/home-personal-space': { HomePersonalSpaceProvider: pass('HomePersonalSpaceProvider'), HomePersonalSpaceCard: opaque('HomePersonalSpaceCard'), HomePersonalSpaceNavEntry: opaque('HomePersonalSpaceNavEntry') },
    '@/components/personal-testimonials': { PersonalTestimonials: opaque('PersonalTestimonials') },
    '@/components/public-site-header': { PublicSiteHeader: opaque('PublicSiteHeader') },
    '@/components/public-consultation-cta': { PublicConsultationCta: opaque('PublicConsultationCta') },
    '@/components/compact-lead-capture': { CompactLeadCapture: opaque('CompactLeadCapture') },
    '@/components/services-conversion-hero': { ServicesConversionHero: opaque('ServicesConversionHero') },
    '@/components/page-video': { PageVideo: opaque('PageVideo') },
    '@/components/services-about-entry': { ServicesAboutEntry: opaque('ServicesAboutEntry') },
    '@/components/service-video-showcase': { ServiceVideoShowcase: opaque('ServiceVideoShowcase') },
    '@/components/commerce/cart-nav-link': { CartNavLink: opaque('CartNavLink') },
    '@/components/site-search': { SiteSearch: opaque('SiteSearch') },
    '@/components/use-navigation-locale': { useNavigationLocale: () => locale },
    '@/components/sitewide-antistress-banner': { TestSelectionCourseBanner: opaque('TestSelectionCourseBanner') },
    '@/lib/commerce/wise-payments': { wisePaymentsEnabled: () => false },
    '@/lib/commerce/paypal-personal': { personalPayPalEnabled: () => false },
    '@/data/site-metadata': { metadataBaseFor: () => new URL('https://holistichouse.vercel.app') },
    '@/data/remedies': { isSupportedLocale: value => ['en', 'ru'].includes(value), getHomeopathyLocaleParams: () => [{ locale: 'en' }, { locale: 'ru' }] },

  };
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    assert.ok(actual.includes(file), 'Unlisted actual module: ' + file);
    const source = overrides[file] ?? readHomeSource(file);
    const compiled = ts.transpileModule(source, { fileName: file, compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    } }).outputText;
    const module = { exports: {} }; cache.set(file, module);
    const require = specifier => {
      if (specifier.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
      const resolved = specifier.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier)) : specifier.replace(/^@\//, '');
      const alias = '@/' + resolved.replace(/\.(tsx?|jsx?)$/, '');
      const dependency = explicit[specifier] ?? explicit[alias];
      if (specifier === 'lucide-react') return dependency;
      if (dependency) return { __esModule: true, ...dependency };
      const candidate = actual.find(item => item === resolved || item.replace(/\.(tsx?|jsx?)$/, '') === resolved);
      assert.ok(candidate, 'Unexpected import in ' + file + ': ' + specifier);
      return load(candidate);
    };
    vm.runInNewContext(compiled, { require, module, exports: module.exports, URL, console }, { filename: file });
    return module.exports;
  }
  async function render(value, location = 'root') {
    value = await value;
    if (value == null || typeof value === 'boolean') return null;
    if (typeof value !== 'object') return value;
    if (Array.isArray(value)) { const children = []; for (let i = 0; i < value.length; i++) children.push(await render(value[i], location + '.' + i)); return { type: 'fragment', props: {}, children }; }
    const { type, props = {} } = value;
    if (type?.context) {
      const previous = type.context.value; type.context.value = props.value;
      const child = await render(props.children, location + '.provider'); type.context.value = previous;
      return { type: 'provider', props: {}, children: [child] };
    }
    if (typeof type === 'function') {
      cursor = location; hook = 0;
      const output = type(props);
      return { component: type.displayName ?? type.name, props, children: [await render(output, location + '.render')] };
    }
    assert.equal(typeof type, 'string', 'Unsupported source element');
    const children = Array.isArray(props.children) ? props.children : [props.children];
    // Sequential rendering keeps hook/context state isolated from sibling trees.
    const rendered = [];
    for (let i = 0; i < children.length; i++) rendered.push(await render(children[i], location + '.' + i));
    return { type, props, children: rendered };
  }
  const page = () => locale === 'es' ? load('app/es/page.tsx').default() : load('components/holistic-house-home.tsx').HolisticHouseHome({ locale });
  return {
    renderHome: () => render(page()),
    renderNavigation: () => render(load('components/site-navigation.tsx').SiteNavigation({ locale })),
    renderServices: () => render(locale === 'es' ? load('app/es/services/page.tsx').default({}) : load('app/[locale]/services/page.tsx').default({ params: Promise.resolve({ locale }) })),
    async expandHome() {
      const initial = await render(page());
      const more = elements(initial, 'details').find(node => node.props.id === 'more-directions');
      assert.ok(more, 'Homepage mounts its actual disclosure');
      assert.equal(typeof more.props.onToggle, 'function', 'Disclosure has an actual opening handler');
      more.props.onToggle({ currentTarget: { open: true } });
      return { initial, expanded: await render(page()) };
    },
  };
}
