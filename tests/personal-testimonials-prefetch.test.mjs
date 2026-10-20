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
