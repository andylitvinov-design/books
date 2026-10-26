import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const pageSource = read('app/[locale]/pro/page.tsx');
const hubSource = read('components/profi-hub.tsx');
const plain = value => JSON.parse(JSON.stringify(value));
const forbidden = name => () => { throw new Error('Forbidden public-route side effect: ' + name); };

// Evaluate the real route and real public shell, but never load a repository,
// private client, environment credential, browser or network implementation.
function compile(source, filename, imports = {}, globals = {}) {
  const exports = {};
  const compiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  runInNewContext(compiled.outputText, {
    exports,
    require(name) {
      assert.ok(Object.hasOwn(imports, name), 'Forbidden import: ' + name);
      return imports[name];
    },
    fetch: forbidden('fetch'), XMLHttpRequest: forbidden('XMLHttpRequest'),
    WebSocket: forbidden('WebSocket'), setTimeout: forbidden('setTimeout'),
    ...globals,
  }, { filename });
  return exports;
}

const { AppError } = compile(read('lib/assessments/contracts.js'), 'contracts.js');
const actualConfig = compile(read('lib/app/config.js'), 'config.js', {
  '../billing/config.js': { getBillingConfig: forbidden('billing config after unavailable app') },
  '../billing/manual-config.js': { manualBillingConfig: forbidden('billing config after unavailable app') },
  '../assessments/contracts.js': { AppError },
}, { process: { env: Object.freeze({}) } });
const programs = compile(read('lib/reiki-master-programs.ts'), 'reiki-master-programs.ts');
const jsx = (type, props = {}) => typeof type === 'function' ? type(props) : { type, props };
const elements = tree => tree == null || typeof tree !== 'object' ? [] :
  Array.isArray(tree) ? tree.flatMap(elements) : [tree, ...elements(tree.props?.children)];
const byAttribute = (tree, name, value) => elements(tree).filter(node => node.props?.[name] === value);
const textOf = tree => tree == null ? '' : typeof tree !== 'object' ? String(tree) :
  Array.isArray(tree) ? tree.map(textOf).join(' ') : textOf(tree.props?.children);

function fixture({ configError, missingConfig = false, mastersReject = false, coursesReject = false,
  repositoryConstructionError, courseConstructionError, routeSource = pageSource } = {}) {
  const calls = [];
  const rendered = [];
  const config = Symbol('opaque synthetic config reference; no credentials or settings');
  const notFoundError = Symbol('not-found');
  const practitioners = Object.freeze([{ slug: 'synthetic-approved-master', name: 'Synthetic public listing' }]);
  const publicRows = Object.freeze([
    { slug: 'synthetic-course-en', practitionerSlug: 'synthetic-approved-master', course: { title: 'Synthetic EN course', locale: 'en', description: 'Public course description' } },
    { slug: 'synthetic-course-ru', practitionerSlug: 'synthetic-approved-master', course: { title: 'Synthetic RU course', locale: 'ru' } },
    { slug: 'synthetic-course-es', practitionerSlug: 'synthetic-approved-master', course: { title: 'Synthetic ES course', locale: 'es' } },
    { slug: 'not-approved', practitionerSlug: 'synthetic-unapproved-master', course: { title: 'Not public', locale: 'en' } },
    { slug: 'unsupported-locale', practitionerSlug: 'synthetic-approved-master', course: { title: 'Not supported', locale: 'fr' } },
    { slug: 'missing-title', practitionerSlug: 'synthetic-approved-master', course: { locale: 'en' } },
  ]);
  const icons = Object.fromEntries([
    'ArrowRight', 'BookOpen', 'CheckCircle2', 'ChevronRight', 'CircleDollarSign',
    'ClipboardList', 'GraduationCap', 'HeartHandshake', 'LockKeyhole', 'Search',
    'MessageSquare', 'Rocket', 'ShieldCheck', 'Sparkles',
  ].map(name => [name, () => null]));
  const { ProfiHub } = compile(hubSource, 'profi-hub.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: { useState: initial => [initial, forbidden('interactive state update')] },
    'next/link': { __esModule: true, default: props => jsx('a', props) },
    'next/image': { __esModule: true, default: props => jsx('img', props) },
    'lucide-react': icons,
    '@/components/public-site-header': { PublicSiteHeader: props => jsx('synthetic-public-header', props) },
    '@/components/home-free-diagnosis-banner': { HomeFreeDiagnosisBanner: props => jsx('synthetic-public-banner', props) },
    './profi-hub.module.css': { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) },
    '@/lib/reiki-master-programs': programs,
  });
  const strictRepository = (allowed, method) => new Proxy(Object.freeze({ [allowed]: method }), {
    get(target, name) { assert.ok(Object.hasOwn(target, name), 'Forbidden repository method: ' + String(name)); return target[name]; },
  });
  const exports = compile(routeSource, 'pro/page.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { notFound() { calls.push(['notFound']); throw notFoundError; } },
    '@/components/profi-hub': { ProfiHub(props) { rendered.push(props); return ProfiHub(props); } },
    '@/components/master-network-explorer': { MarketplaceMasterFinder: props => jsx('synthetic-public-directory', props) },
    '@/lib/assessments/contracts': { AppError },
    '@/lib/app/config': { getAppConfig(...args) {
      calls.push(['config', ...args]); assert.equal(args.length, 0, 'Use unchanged production config resolution');
      if (missingConfig) return actualConfig.getAppConfig();
      if (configError !== undefined) throw configError;
      return config;
    } },
    '@/lib/practitioners/repository': { createPractitionerRepository(...args) {
      calls.push(['practitionerRepository', ...args]); assert.deepEqual(args, [config]);
      if (repositoryConstructionError) throw repositoryConstructionError;
      return strictRepository('listPublicPractitioners', (...queryArgs) => {
        calls.push(['listPublicPractitioners', ...queryArgs]);
        assert.equal(queryArgs.length, 1);
        return mastersReject ? Promise.reject(new Error('synthetic public directory failure')) : Promise.resolve(practitioners);
      });
    } },
    '@/lib/practitioners/course-repository': { createPractitionerCourseRepository(...args) {
      calls.push(['courseRepository', ...args]); assert.deepEqual(args, [config]);
      if (courseConstructionError) throw courseConstructionError;
      return strictRepository('catalog', (...queryArgs) => {
        calls.push(['catalog', ...queryArgs]); assert.equal(queryArgs.length, 0);
        return coursesReject ? Promise.reject(new Error('synthetic public course failure')) : Promise.resolve(publicRows);
      });
    } },
    '@/data/site-metadata': { metadataBaseFor: () => new URL('https://public.invalid') },
  });
  return { ...exports, config, notFoundError, calls, rendered, practitioners,
    async run(locale) { return exports.default({ params: Promise.resolve({ locale }) }); } };
}

function assertPublicShell(view, locale, unavailable) {
  assert.equal(byAttribute(view, 'data-profi-page', locale).length, 1);
  assert.equal(byAttribute(view, 'id', 'profi-practice').length, 1, 'Real authored practitioner anchor survives');
  assert.equal(byAttribute(view, 'data-profi-path', 'practice')[0].props.href, '#profi-practice');
  const status = byAttribute(view, 'role', 'status');
  assert.equal(status.length, unavailable ? 1 : 0);
  if (unavailable) assert.equal(textOf(status[0]), {
    en: 'The directory is temporarily unavailable. Please try the full directory.',
    ru: 'Каталог временно недоступен. Попробуйте открыть полный список мастеров.',
    es: 'El catálogo no está disponible ahora. Prueba el directorio completo.',
  }[locale]);
  const appLocale = locale === 'es' ? 'en' : locale;
  assert.equal(byAttribute(view, 'data-profi-entry', 'professional')[0].props.href, '/' + appLocale + '/app/practice?panel=profile');
  assert.equal(byAttribute(view, 'data-profi-selected-offer', 'diagnostic')[0].props.href,
    '/' + appLocale + '/app/practice?panel=services&create=1&starter=diagnostic');
}

for (const locale of ['en', 'ru', 'es']) {
  test(`missing config preserves actual anonymous ${locale} shell, unavailable notice and anchor without I/O`, async () => {
    const f = fixture({ missingConfig: true });
    const view = await f.run(locale);
    assert.deepEqual(f.calls, [['config']]);
    assert.equal(f.rendered.length, 1);
    assert.equal(f.rendered[0].directory, null);
    assert.equal(f.rendered[0].directoryUnavailable, true);
    assert.equal(byAttribute(view, 'data-profi-master-directory', true).length, 0);
    assertPublicShell(view, locale, true);
  });
  for (const [mastersReject, coursesReject] of [[false, false], [true, false], [false, true], [true, true]]) {
    test(`configured ${locale}: original public queries/filtering preserved; mastersReject=${mastersReject}, coursesReject=${coursesReject}`, async () => {
      const f = fixture({ mastersReject, coursesReject });
      const view = await f.run(locale);
      assert.deepEqual(f.calls, [['config'], ['practitionerRepository', f.config], ['listPublicPractitioners', locale],
        ['courseRepository', f.config], ['catalog']]);
      assert.equal(f.rendered.length, 1);
      assert.equal(f.rendered[0].directoryUnavailable, mastersReject);
      const directories = elements(view).filter(node => node.type === 'synthetic-public-directory');
      assert.equal(directories.length, mastersReject ? 0 : 1);
      if (mastersReject) assert.equal(f.rendered[0].directory, null);
      else {
        const props = directories[0].props;
        assert.equal(props.practitioners, f.practitioners, 'Original approved public identities, not substitute fixtures');
        assert.equal(props.locale, locale); assert.equal(props.embedded, true);
        assert.equal(props.coursesUnavailable, coursesReject);
        assert.deepEqual(plain(props.courses), coursesReject ? [] : [
          { slug: 'synthetic-course-en', practitionerSlug: 'synthetic-approved-master', title: 'Synthetic EN course', description: 'Public course description', locale: 'en' },
          { slug: 'synthetic-course-ru', practitionerSlug: 'synthetic-approved-master', title: 'Synthetic RU course', description: '', locale: 'ru' },
          { slug: 'synthetic-course-es', practitionerSlug: 'synthetic-approved-master', title: 'Synthetic ES course', description: '', locale: 'es' },
        ]);
      }
      assertPublicShell(view, locale, mastersReject);
    });
  }
}

test('invalid locale remains notFound before config/repositories', async () => {
  const f = fixture({ missingConfig: true });
  await assert.rejects(f.run('fr'), error => error === f.notFoundError);
  assert.deepEqual(f.calls, [['notFound']]); assert.equal(f.rendered.length, 0);
});

for (const [name, error] of [
  ['unexpected AppError', new AppError('SYNTHETIC_UNEXPECTED_FAILURE', 503)],
  ['same-message ordinary Error', new Error('APP_UNAVAILABLE')],
  ['code-only object', { code: 'APP_UNAVAILABLE', status: 503 }],
]) test('config boundary rethrows ' + name, async () => {
  const f = fixture({ configError: error });
  await assert.rejects(f.run('en'), thrown => thrown === error);
  assert.deepEqual(f.calls, [['config']]); assert.equal(f.rendered.length, 0);
});

for (const factory of ['repositoryConstructionError', 'courseConstructionError']) {
  test('existing synchronous ' + factory + ' remains fatal, not swallowed by config boundary', async () => {
    const error = new AppError('APP_UNAVAILABLE', 503);
    const f = fixture({ [factory]: error });
    await assert.rejects(f.run('en'), thrown => thrown === error);
    assert.equal(f.rendered.length, 0);
  });
}

test('metadata and dynamic public route semantics remain unchanged and do not request config', async () => {
  const f = fixture({ missingConfig: true });
  assert.equal(f.dynamic, 'force-dynamic'); assert.equal(f.revalidate, 0);
  for (const locale of ['en', 'ru', 'es']) {
    const metadata = await f.generateMetadata({ params: Promise.resolve({ locale }) });
    assert.equal(metadata.alternates.canonical, '/' + locale + '/pro');
    assert.deepEqual(plain(metadata.alternates.languages), { en: '/en/pro', ru: '/ru/pro', es: '/es/pro', 'x-default': '/en/pro' });
  }
  assert.deepEqual(plain(await f.generateMetadata({ params: Promise.resolve({ locale: 'fr' }) })), { title: 'Not found', robots: { index: false } });
  assert.deepEqual(f.calls, []);
});

test('strict fixture rejects accidental private repository reads', async () => {
  const changed = pageSource.replace('.listPublicPractitioners(locale)', '.listClientProfiles(locale)');
  assert.notEqual(changed, pageSource);
  const f = fixture({ routeSource: changed });
  await assert.rejects(f.run('en'), /Forbidden repository method: listClientProfiles/);
});

test('strict fixture rejects unapproved import or network escape', async () => {
  assert.throws(() => fixture({ routeSource: 'import "node:net";\n' + pageSource }), /Forbidden import: node:net/);
  const changed = pageSource.replace('getAppConfig();', '(fetch("https://forbidden.invalid"), getAppConfig());');
  assert.notEqual(changed, pageSource);
  const f = fixture({ routeSource: changed });
  await assert.rejects(f.run('en'), /Forbidden public-route side effect: fetch/);
});

test('route and shell TypeScript syntax is valid', () => {
  for (const [name, source] of [['page.tsx', pageSource], ['profi-hub.tsx', hubSource]]) {
    const ast = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    assert.deepEqual(ast.parseDiagnostics.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')), []);
  }
});
