import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../components/personal-testimonials.tsx', import.meta.url), 'utf8');
const jsx = (type, props) => typeof type === 'function' ? type(props ?? {}) : { type, props: props ?? {} };
function render(locale, variant, input = source) {
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': { default: props => jsx('a', props) },
    'lucide-react': { ArrowRight: () => null, Quote: () => null },
    '@/components/site-video-player': { SiteVideoPlayer: props => jsx('video-fixture', props) },
    '@/components/home-testimonial-more': { HomeTestimonialMore: props => jsx('lazy-testimonials-fixture', props) },
    './personal-testimonials.module.css': { default: {} },
  };
  const compiled = ts.transpileModule(input, { fileName: 'personal-testimonials.tsx', compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, require(name) { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; } });
  return exports.PersonalTestimonials({ locale, variant });
}
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props.children)];
function assertLinks(locale, variant, input) {
  const links = nodes(render(locale, variant, input)).filter(node => node.type === 'a');
  assert.equal(links.length, 2, 'Keep both visible navigation choices');
  assert.deepEqual(links.map(node => node.props.href), [`/${locale}/about#testimonials-title`, variant === 'all' ? '#request-free-review' : `/${locale}/services/free-situation-review`]);
  for (const link of links) {
    assert.equal(link.props.prefetch, false, 'A late hydration must not start speculative requests after a history departure');
    assert.equal(link.props.onClick, undefined, 'Preserve ordinary Next Link activation');
    assert.equal(link.props.target, undefined, 'Preserve same-window destinations');
  }
}
for (const locale of ['en', 'ru', 'es']) for (const variant of ['home', 'services', 'all']) {
  test(`${locale}/${variant} keeps exact testimonial links without automatic prefetch`, () => assertLinks(locale, variant));
}
test('regression rejects re-enabling automatic prefetch on either real component link', () => {
  for (const classname of ['more', 'contact']) {
    const before = `<Link prefetch={false} className={styles.${classname}}`;
    assert.ok(source.includes(before));
    const automatic = source.replace(before, `<Link className={styles.${classname}}`);
    assert.throws(() => assertLinks('en', 'home', automatic), /late hydration/);
    const enabled = source.replace(before, `<Link prefetch={true} className={styles.${classname}}`);
    assert.throws(() => assertLinks('en', 'home', enabled), /late hydration/);
  }
});

test('free review shows all twelve genuine videos vertically with original-language audio and locale-first ordering', () => {
  const english = ['Dk0LBmOivQo', 'aUJde6A-9p0', 'fE6sD1zr1Js', 'itjo2_z2NGk', '4NrryHcEF1A', 'hYwRNMxIMjc'];
  const russian = ['m9RfDgK76PU', 'MIVLm1GUTtM', 'ttQxUHopaUM', 'VABgpmn4ZYA', 'muOnIHllI7E', '5oj0BIbLT4w'];
  for (const locale of ['en', 'ru', 'es']) {
    const rendered = nodes(render(locale, 'all'));
    const cards = rendered.filter(node => node.props['data-testimonial-video-id']);
    const players = rendered.filter(node => node.type === 'video-fixture');
    const expectedIds = locale === 'ru' ? [...russian, ...english] : [...english, ...russian];
    const expectedLanguages = locale === 'ru' ? [...Array(6).fill('ru'), ...Array(6).fill('en')] : [...Array(6).fill('en'), ...Array(6).fill('ru')];
    assert.deepEqual(cards.map(node => node.props['data-testimonial-video-id']), expectedIds);
    assert.equal(new Set(expectedIds).size, 12);
    assert.deepEqual(players.map(node => node.props.video.language), expectedLanguages);
    assert.ok(players.every(node => node.props.compact === true), 'Video loading must remain opt-in');
    const feed = rendered.find(node => node.props['data-vertical-review-list'] === '');
    assert.ok(feed, locale + ': expected visible vertical list');
    assert.equal(feed.props.tabIndex, undefined, 'No tab stop for a list that does not scroll');
    assert.equal(rendered.find(node => node.props['data-personal-testimonials'] === 'all')?.props.lang, locale);
  }
  const css = readFileSync(new URL('../components/personal-testimonials.module.css', import.meta.url), 'utf8');
  const stack = css.match(/\.section\[data-personal-testimonials="all"\] \.videoGrid\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(stack, /flex-direction:\s*column/);
  assert.match(stack, /overflow:\s*visible/);
  assert.match(stack, /scroll-snap-type:\s*none/);
  assert.match(source, /\{isAbout && <p className=\{styles\.swipeHint\}>/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.section\[data-personal-testimonials="all"\] \.videoItem/);
});

test('English and Spanish pages localize Russian testimonial titles while retaining original audio', () => {
  for (const locale of ['en', 'es']) for (const [variant, count] of [['about', 4], ['all', 6]]) {
    const rendered = nodes(render(locale, variant))
    const players = rendered.filter(node => node.type === 'video-fixture' && node.props.video.language === 'ru')
    assert.equal(players.length, count, variant + ' retains the source-backed Russian-language videos')
    for (const player of players) assert.doesNotMatch(player.props.video.title, /[\u0400-\u04ff]/)
    assert.ok(players.every(player => player.props.video.language === 'ru'))
  }
})
