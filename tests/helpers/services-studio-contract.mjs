import assert from 'node:assert/strict';
import { sourceModule, sourceNode } from './source-contract-runtime.mjs';
import ts from 'typescript';

const children = node => [node?.props?.children].flat(Infinity).filter(child => child != null && child !== false);
const walk = node => Array.isArray(node) ? node.flatMap(walk) : node && typeof node === 'object'
  ? [node, ...children(node).flatMap(walk)] : [];

// Observe the actual public route, provider defaults, offer data and card render.
// Decorative/contact/payment edges are inert markers, never loaded or invoked.
export async function servicesStudioContract(locale) {
  assert.ok(['en', 'ru', 'es'].includes(locale));
  const jsx = (type, props) => ({ type, props: props || {} });
  const markers = new Map();
  const marker = name => { const value = Symbol(name); markers.set(value, name); return value; };
  const contexts = new Map(), defaults = [];
  const react = {
    createContext(initial) {
      const context = { current: initial, Provider: Symbol('context-provider') };
      contexts.set(context.Provider, context);
      return context;
    },
    useContext: context => context.current,
    useState(initial) {
      const value = typeof initial === 'function' ? initial() : initial;
      defaults.push(value);
      return [value, () => { throw new Error('No interactions are executed by this source contract'); }];
    },
  };
  const runtime = { jsx, jsxs: jsx, Fragment: marker('fragment') };
  const core = sourceModule('data/core-service-offers.ts', {});
  const state = sourceModule('components/services-explorer-state.tsx', {
    react, 'react/jsx-runtime': runtime,
  });
  const image = marker('image'), portrait = marker('static-portrait'), chooser = marker('contact-chooser');
  const common = {
    'react/jsx-runtime': runtime,
    'next/image': image,
    'next/link': 'a',
    'lucide-react': Object.fromEntries(['ArrowRight', 'ChevronDown', 'ClipboardCheck', 'ShieldCheck', 'ArrowUpRight', 'PlayCircle'].map(name => [name, marker(name)])),
    '@/components/static-portrait': { StaticPortrait: portrait },
    '@/components/contact-channel-chooser': { ContactChannelChooser: chooser },
    '@/lib/whatsapp-enquiry': { whatsappEnquiryUrl: () => 'synthetic-enquiry-not-sent' },
    '@/data/core-service-offers': core,
  };
  const studio = sourceModule('components/services-studio-offers.tsx', {
    ...common,
    '@/components/services-explorer-state': state,
    './services-studio-offers.module.css': {},
  });
  const hero = marker('hero');
  const route = sourceModule(locale === 'es' ? 'app/es/services/page.tsx' : 'app/[locale]/services/page.tsx', {
    'react/jsx-runtime': runtime,
    'next/navigation': { notFound: () => { throw new Error('Unexpected notFound'); }, redirect: () => { throw new Error('Unexpected redirect'); } },
    '@/components/public-site-header': { PublicSiteHeader: marker('header') },
    '@/components/services-conversion-hero': { ServicesConversionHero: hero },
    '@/components/services-explorer-state': state,
    '@/components/services-studio-offers': studio,
    '@/components/services-studio-extras': Object.fromEntries(['ServicesIntroMedia', 'ServicesMethodVideos', 'ServicesDirectoryInvitation'].map(name => [name, marker(name)])),
    '@/components/personal-testimonials': { PersonalTestimonials: marker('testimonials') },
    '@/components/public-consultation-cta': { PublicConsultationCta: marker('consultation') },
    '@/lib/commerce/wise-payments': { wisePaymentsEnabled: () => false },
    '@/lib/commerce/paypal-personal': { personalPayPalEnabled: () => false },
    '@/lib/spanish-metadata': { spanishMetadata: () => ({}) },
    '@/data/remedies': { getHomeopathyLocaleParams: () => [], isSupportedLocale: value => ['en', 'ru'].includes(value) },
    '@/data/site-metadata': { metadataBaseFor: () => new URL('https://example.invalid') },
  });
  const tree = await route.default({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({}) });
  const providers = walk(tree).filter(node => node.type === state.ServicesExplorerProvider);
  assert.equal(providers.length, 1, `${locale}: actual Services provider mounted once`);
  for (const type of [hero, studio.ServicesStudioOffers]) {
    const mounted = walk(tree).filter(node => node.type === type);
    assert.equal(mounted.length, 1, `${locale}: actual hero/studio mounted once`);
    assert.ok(walk(providers[0]).includes(mounted[0]), `${locale}: hero/studio shares the actual provider`);
    assert.equal(mounted[0].props.locale, locale, `${locale}: child receives the route locale`);
  }
  function render(node) {
    if (Array.isArray(node)) return node.map(render);
    if (node == null || typeof node !== 'object') return node;
    const context = contexts.get(node.type);
    if (context) {
      assert.equal(node.props.value?.mode, 'online', 'Actual context starts online');
      assert.equal(node.props.value?.topic, 'all', 'Actual context starts on all topics');
      const previous = context.current;
      context.current = node.props.value;
      try { return render(node.props.children); } finally { context.current = previous; }
    }
    if (typeof node.type === 'function') {
      assert.ok(node.type === state.ServicesExplorerProvider || node.type === studio.ServicesStudioOffers || node.type.name === 'ServiceCard', 'Unexpected functional component');
      return render(node.type(node.props));
    }
    assert.ok(typeof node.type === 'string' || markers.has(node.type), 'Unexpected component boundary');
    return { ...node, props: { ...node.props, children: children(node).map(render) } };
  }
  const rendered = render(tree);
  assert.deepEqual(defaults, ['online', 'all'], 'Actual provider retains the default state');
  const cards = walk(rendered).filter(node => node.props['data-services-studio-card']);
  const visibility = new Map();
  function recordVisibility(node, inheritedHidden = false) {
    if (Array.isArray(node)) { node.forEach(child => recordVisibility(child, inheritedHidden)); return; }
    if (!node || typeof node !== 'object') return;
    const hidden = inheritedHidden || node.props.hidden === true;
    visibility.set(node, !hidden);
    children(node).forEach(child => recordVisibility(child, hidden));
  }
  recordVisibility(rendered);
  const solutions = sourceModule('components/services-solutions.tsx', {
    ...common,
    '@/components/acquisition-event-link': { AcquisitionEventLink: 'a' },
    '@/data/service-video-library': { getServiceVideoWatchUrl: () => 'synthetic-video-not-opened' },
    './services-solutions.module.css': {},
  });
  const homeImport = sourceNode('components/holistic-house-home.tsx', node => ts.isImportDeclaration(node)
    && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)
    && node.importClause.namedBindings.elements.some(binding => binding.name.text === 'ServicesSolutions'), 'Home ServicesSolutions import binding');
  assert.equal(homeImport.moduleSpecifier.text, '@/components/services-solutions', 'Home imports the actual ServicesSolutions module');
  const homeBinding = homeImport.importClause.namedBindings.elements.find(binding => binding.name.text === 'ServicesSolutions');
  assert.equal((homeBinding.propertyName || homeBinding.name).text, 'ServicesSolutions', 'Home imports the actual ServicesSolutions export');
  const homeMount = sourceNode('components/holistic-house-home.tsx', node => ts.isJsxSelfClosingElement(node) && node.tagName.getText() === 'ServicesSolutions', 'Home ServicesSolutions mount');
  assert.match(homeMount.getText(), /locale=\{locale\}/);
  assert.match(homeMount.getText(), /variant="home"/);
  const home = solutions.ServicesSolutions({ locale, variant: 'home' });
  const homeIds = walk(home).filter(node => node.props['data-core-service-id']).map(node => node.props['data-core-service-id']);
  return { cards, homeIds, isVisible: card => visibility.get(card), descendants: walk, core: core.coreServiceOffers(locale), portrait, image };
}
