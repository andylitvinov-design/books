// Execute the real component with synthetic hook state and inert external widgets.
// Effects, network, storage, navigation and timers are never executed by this fixture.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const root = new URL('../../', import.meta.url);
export const readReikiSource = path => readFileSync(new URL(path, root), 'utf8');
const forbidden = () => { throw new Error('External operation forbidden in Reiki component fixture'); };
const element = (type, props) => {
  assert.ok(typeof type === 'string' || typeof type === 'function', 'Defined JSX component');
  return { type, props: props || {} };
};
const jsx = { jsx: element, jsxs: element, Fragment: 'fragment' };
const css = { default: new Proxy({}, { get: (_, key) => String(key) }) };
const icons = Object.fromEntries(('ArrowLeft ArrowRight ArrowDown Award BookOpen Check CheckCircle2 ClipboardCopy Clock3 Compass HandHeart Heart LockKeyhole PlayCircle Sparkles Sprout MessageCircle ExternalLink ChevronDown HeartHandshake').split(' ').map(name => [name, 'icon-' + name]));

function compile(source, path, modules, block = forbidden) {
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  assert.equal(ast.parseDiagnostics.length, 0, path + ' parses');
  const code = ts.transpileModule(source, { fileName: path, compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(code, { module: compiledModule, exports: compiledModule.exports, URL,
    fetch: () => block('fetch'),
    XMLHttpRequest: function () { return block('XMLHttpRequest'); },
    WebSocket: function () { return block('WebSocket'); },
    require: name => { assert.ok(Object.hasOwn(modules, name), 'Unexpected dependency: ' + name); return modules[name]; },
  }, { filename: path, timeout: 5000 });
  return compiledModule.exports;
}

function sourceLoader(overrides = {}) {
  const cache = new Map();
  const externalOperations = [];
  const block = operation => { externalOperations.push(operation); return forbidden(); };
  const source = path => overrides[path] ?? readReikiSource(path);
  const load = (path, modules = {}) => compile(source(path), path, { 'react/jsx-runtime': jsx, ...modules }, block);
  const data = path => {
    if (cache.has(path)) return cache.get(path);
    const imports = {};
    const ast = ts.createSourceFile(path, source(path), ts.ScriptTarget.Latest, true);
    for (const statement of ast.statements) {
      if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly) continue;
      const name = statement.moduleSpecifier.text;
      assert.ok(name.startsWith('./'), 'Data dependencies stay local: ' + name);
      const parent = path.slice(0, path.lastIndexOf('/') + 1);
      const dependency = parent + name.slice(2) + (/\.(js|ts)$/.test(name) ? '' : '.ts');
      imports[name] = data(dependency);
    }
    const value = load(path, imports);
    cache.set(path, value);
    return value;
  };
  return { source, load, data, block, assertNoExternalOperations: () => assert.deepEqual(externalOperations, [], 'No external attempts, including caught failures') };
}

export function reikiNodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(reikiNodes);
  if (!tree || typeof tree !== 'object' || !('type' in tree)) return [];
  return [tree, ...reikiNodes(tree.props.children)];
}
export function reikiText(tree) {
  if (Array.isArray(tree)) return tree.map(reikiText).join('');
  if (tree == null || typeof tree === 'boolean') return '';
  if (typeof tree !== 'object') return String(tree);
  return reikiText(tree.props?.children);
}
export function oneReikiNode(tree, predicate, label) {
  const matches = reikiNodes(tree).filter(predicate);
  assert.equal(matches.length, 1, label);
  return matches[0];
}

export function createReikiLearner({ locale = 'en', slideId = 'flight-voices', sync = 'ready', state = {}, overrides = {} } = {}) {
  const loader = sourceLoader(overrides);
  const curriculum = loader.data('data/academy/energywork-ai-curriculum.ts');
  const slides = curriculum.energyworkSlides();
  const index = slides.findIndex(slide => slide.id === slideId);
  assert.ok(index >= 0, 'Actual curriculum slide: ' + slideId);
  // Names are taken from the component's actual top-level useState declarations.
  // No hook order is invented or silently adjusted when the source changes.
  const path = 'components/energywork-ai-learner.tsx';
  const ast = ts.createSourceFile(path, loader.source(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const component = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'EnergyworkAiLearner');
  assert.ok(component?.body, 'Actual learner function');
  const names = component.body.statements.flatMap(statement => ts.isVariableStatement(statement)
    ? statement.declarationList.declarations.flatMap(declaration =>
      ts.isArrayBindingPattern(declaration.name) && ts.isCallExpression(declaration.initializer) && declaration.initializer.expression.getText(ast) === 'useState'
        ? [declaration.name.elements[0].name.getText(ast)] : []) : []);
  const seeds = { index, sync, ...state };
  let hooks;
  const react = {
    useState(initial) {
      const slot = hooks.stateIndex++;
      if (!(slot in hooks.values)) hooks.values[slot] = Object.hasOwn(hooks.seeds, hooks.names[slot])
        ? hooks.seeds[hooks.names[slot]] : typeof initial === 'function' ? initial() : initial;
      return [hooks.values[slot], next => { hooks.values[slot] = typeof next === 'function' ? next(hooks.values[slot]) : next; }];
    },
    useRef(initial) { const slot = hooks.refIndex++; return hooks.refs[slot] ??= { current: initial }; },
    useMemo: fn => fn(), useCallback: fn => fn, useEffect() {},
  };
  const mainHooks = { names, seeds, values: [], refs: [] };
  const modules = {
    react, 'next/image': { default: 'img' }, 'next/link': { default: 'a' }, 'lucide-react': icons,
    '@/components/academy-video-player': { AcademyVideoPlayer: 'academy-video' },
    '@/components/reiki-lesson-intro-audio': { ReikiLessonIntroAudio: 'intro-audio' },
    '@/components/reiki-course-referral-share': { ReikiCourseReferralShare: 'referral-share' },
    // Inspect the real parent's photo props without mounting its upload effects.
    '@/components/reiki-initiation-photo': { ReikiInitiationPhoto: 'initiation-photo' },
    '@/lib/app/client-fetch': { appFetch: () => loader.block('appFetch') },
    '@/lib/whatsapp-enquiry': loader.data('lib/whatsapp-enquiry.js'),
    '@/data/academy/english-guided-meditations': loader.data('data/academy/english-guided-meditations.ts'),
    '@/data/academy/reiki-practitioner-lesson-videos': loader.data('data/academy/reiki-practitioner-lesson-videos.ts'),
    './ocean-practice-audio': { useOceanPracticeAudio: () => loader.block('ocean audio') }, './ocean-sound-toggle': { default: 'ocean-toggle' },
    '@/data/academy/energywork-ai-curriculum': curriculum,
    '@/data/academy/energywork-first-lesson': loader.data('data/academy/energywork-first-lesson.js'),
    '@/data/academy/energywork-ai-schema': loader.data('data/academy/energywork-ai-schema.js'),
    '@/data/academy/reiki-initiation-request.js': loader.data('data/academy/reiki-initiation-request.js'),
    './energywork-ai-learner.module.css': css,
  };
  const learner = loader.load(path, modules).EnergyworkAiLearner;
  const renderWith = (fn, props, instance) => {
    hooks = instance; hooks.stateIndex = 0; hooks.refIndex = 0;
    const tree = fn(props);
    if (instance === mainHooks) assert.equal(hooks.stateIndex, names.length, 'All actual learner state hooks executed');
    loader.assertNoExternalOperations();
    return tree;
  };
  const render = () => renderWith(learner, { locale }, mainHooks);
  const mountVoices = () => {
    const mount = oneReikiNode(render(), node => typeof node.type === 'function' && node.type.name === 'MeditationVoices', 'Actual review component mounted');
    const voiceHooks = { names: ['active'], seeds: {}, values: [], refs: [] };
    return { render: () => renderWith(mount.type, mount.props, voiceHooks), slide: mount.props.slide };
  };
  const mountVideo = () => {
    const mount = oneReikiNode(render(), node => typeof node.type === 'function' && node.type.name === 'ReikiLessonVideo', 'Actual lesson video mounted');
    return renderWith(mount.type, mount.props, { names: [], seeds: {}, values: [], refs: [] });
  };
  return { render, mountVoices, mountVideo, slides, assertNoExternalOperations: loader.assertNoExternalOperations };
}

export function renderEnergyworkLanding(locale, overrides = {}) {
  const loader = sourceLoader(overrides);
  return loader.load('components/principles-of-energywork.tsx', {
    'next/image': { default: 'img' }, 'next/link': { default: 'a' }, 'lucide-react': icons,
    '@/lib/academy/reiki-free-course': loader.data('lib/academy/reiki-free-course.ts'),
    '@/components/public-site-header': { PublicSiteHeader: 'public-header' },
    '@/components/academy-video-player': { AcademyVideoPlayer: 'academy-video' },
    '@/components/energywork-reiki-capture': { EnergyworkReikiCapture: 'reiki-capture' },
    '@/components/energywork-video-archive': { EnergyworkVideoArchive: 'video-archive' },
    '@/components/reiki-public-reviews': { ReikiPublicReviews: 'public-reviews' },
    '@/components/contact-channel-chooser': { ContactChannelChooser: 'contact-chooser' },
    '@/data/academy/english-guided-meditations': loader.data('data/academy/english-guided-meditations.ts'),
    '@/lib/whatsapp-enquiry': loader.data('lib/whatsapp-enquiry.js'),
    './principles-of-energywork.module.css': css,
  }).PrinciplesOfEnergywork({ locale });
}
