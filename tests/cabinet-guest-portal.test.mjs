import assert from 'node:assert/strict'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { getCompactNavigation, navigationCopy } from '../lib/site-navigation-model.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('My Space replaces Cabinet across the public header, without changing six bottom-bar routes', () => {
  const labels = { en: 'My Space', ru: 'Моё пространство', es: 'Mi espacio' }
  for (const locale of ['en', 'ru', 'es']) {
    const items = getCompactNavigation(locale)
    assert.deepEqual(items.map(item => item.id), ['home','energy','love','business','tests','books'])
    assert.deepEqual(items.map(item => item.href), [locale === 'en' ? '/' : '/' + locale, ...['energy','love','business'].map(id => '/' + locale + '/explore/' + id), '/' + locale + '/client/tests', '/' + locale + '/books'])
    const last = items.at(-1)
    assert.equal(last.label, navigationCopy[locale].books)
    assert.equal(last.ariaLabel, navigationCopy[locale].books)
    assert.equal(last.id, 'books')
    assert.equal(last.href, '/' + locale + '/books')
    assert.equal(navigationCopy[locale].house, labels[locale])
    assert.equal(navigationCopy[locale].cabinet, labels[locale])
  }
  const nav = read('components/site-navigation.tsx')
  const space = read('components/home-personal-space.tsx')
  const layout = read('app/layout.tsx')
  assert.match(nav, /<HomePersonalSpaceNavEntry locale=\{activeLocale\}/)
  assert.doesNotMatch(nav, /cabinetEntryCopy|LayoutDashboard/)
  assert.match(space, /aria-haspopup="dialog"/)
  assert.match(space, /aria-expanded=\{space.open\}/)
  assert.match(space, /site-cabinet-entry__full/)
  assert.match(layout, /<HomePersonalSpaceProvider locale=\{lang\}>/)
})

test('portrait-only guest welcome explains growth tools and practitioner publishing', () => {
  const page = read('components/app/app-workspace.jsx')
  const portal = read('components/app/cabinet-guest-overview.jsx')
  const styles = read('components/app/cabinet-guest-overview.module.css')

  assert.match(page, /state !== 'ready' && page === 'portrait' && !stressSignup/)
  assert.match(page, /<CabinetGuestOverview/)
  assert.match(page, /onSignin=\{signin\}/)
  assert.match(page, /unavailable=\{state === 'unavailable'\}/)
  assert.match(page, /sessionNotice=\{state === 'error'\}/)
  assert.match(page, /const signinAttempted = useRef\(false\)/)
  assert.match(page, /signinAttempted.current = true/)
  assert.match(page, /errorMessage=\{signinAttempted.current && error \? message\(error, c\)/)
  assert.match(page, /appFetch\('auth\/start'/)
  assert.match(page, /if \(state !== 'ready' && page === 'course'/)
  assert.match(portal, /data-cabinet-guest-overview="true"/)
  assert.match(portal, /Explore free tests/)
  assert.match(portal, /professional questionnaires/)
  assert.match(portal, /progress charts/)
  assert.match(portal, /development programme/)
  assert.match(portal, /Save your courses/)
  assert.match(portal, /Present your services/)
  assert.match(portal, /Share articles and knowledge/)
  assert.match(portal, /ЛИЧНЫЙ КАБИНЕТ/)
  assert.match(portal, /GABINETE PERSONAL/)
  assert.match(portal, /publication review where required/)
  assert.match(portal, /role="alert"/)
  assert.match(portal, /sessionNotice && <p className=\{styles.sessionNotice\} role="status">/)
  assert.match(portal, /Couldn’t check|couldn’t check/iu)
  assert.match(portal, /onClick=\{onSignin\}/)
  assert.match(portal, /selectedLocale \+ '\/client\/tests'/)
  assert.match(styles, /@media \(max-width: 650px\)/)
  assert.match(styles, /grid-template-columns: minmax\(0,1fr\)/)
  assert.match(styles, /prefers-reduced-motion/)
})

test('signed-in Cabinet and course deep links retain private account handling', () => {
  const page = read('app/[locale]/app/[[...path]]/page.jsx')
  const workspace = read('components/app/app-workspace.jsx')
  assert.match(page, /redirect\('\/' \+ locale \+ '\/app\/portrait'\)/)
  assert.match(workspace, /if \(state !== 'ready' && page === 'portrait' && !stressSignup\)/)
  assert.match(workspace, /if \(state !== 'ready'\)/)
  assert.match(workspace, /const nav = \[/)
  assert.match(workspace, /id: 'practice'/)
})

// Execute the actual exported entry and copy with a controlled context. Never run
// the provider or access a real session, account, network, or browser.
function verifyDialogEntry(locale, transform = source => source) {
  let clicks = 0;
  const space = { open: false, openPanel() { clicks++; space.open = true; } };
  const jsx = (type, props) => typeof type === 'function' ? type(props || {}) : { type, props: props || {} };
  const forbidden = () => assert.fail('No session, network or provider effect in this entry fixture');
  const imports = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react': { createContext: () => ({}), useContext: () => space, useCallback: forbidden, useEffect: forbidden, useRef: forbidden, useState: forbidden },
    'next/image': { default: () => null },
    'next/link': { default: props => jsx('a', props) },
    'next/navigation': { usePathname: forbidden },
    'lucide-react': new Proxy({}, { get: () => () => null }),
    '@/lib/app/client-fetch': { appFetch: forbidden },
    '@/lib/native/client': { isNativeHolisticHouse: forbidden },
    '@/lib/home-personal-space.mjs': { homeSpaceSummary: forbidden },
    './home-personal-space.module.css': { default: {} },
  };
  const exports = {};
  const code = ts.transpileModule(transform(read('components/home-personal-space.tsx')), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, { exports, require(name) { assert.ok(Object.hasOwn(imports, name), name); return imports[name]; } });
  const render = () => exports.HomePersonalSpaceNavEntry({ locale, href: '/' + (locale === 'es' ? 'en' : locale) + '/app' });
  const button = render();
  assert.equal(clicks, 0, 'Rendering must not open the dialog or initiate sign-in');
  assert.equal(button.type, 'button');
  assert.equal(button.props.type, 'button');
  assert.equal(button.props.href, undefined);
  assert.equal(button.props['aria-label'], navigationCopy[locale].house);
  assert.equal(button.props['aria-haspopup'], 'dialog');
  assert.equal(button.props['aria-controls'], 'home-personal-space-dialog');
  assert.equal(button.props['aria-expanded'], false);
  assert.equal(button.props.onClick, space.openPanel);
  button.props.onClick();
  assert.equal(clicks, 1);
  assert.equal(render().props['aria-expanded'], true);
}
for (const locale of ['en', 'ru', 'es']) test(locale + ' actual My Space entry opens only on explicit click', () => verifyDialogEntry(locale));
for (const [name, before, after] of [
  ['disconnected click', 'onClick={space.openPanel}', 'onClick={() => {}}'],
  ['automatic action on render', 'onClick={space.openPanel}', 'onClick={space.openPanel()}'],
  ['wrong dialog target', 'aria-controls="home-personal-space-dialog"', 'aria-controls="private-account"'],
  ['stale expanded state', 'aria-expanded={space.open}', 'aria-expanded={false}'],
]) test('actual My Space entry rejects ' + name, () => {
  assert.ok(read('components/home-personal-space.tsx').includes(before));
  assert.throws(() => verifyDialogEntry('en', source => source.replace(before, after)));
});
