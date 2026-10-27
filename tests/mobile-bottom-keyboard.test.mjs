import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getCompactNavigation } from '../lib/site-navigation-model.js';

const css = readFileSync('app/ia-v2.css', 'utf8');

// WebKit anchors position:fixed bars to the reduced visual viewport while
// its software keyboard is shown. Editing controls must not leave the bar
// floating over the page; it returns when focus leaves the control.
test('mobile navigation hides while a text field or editor is focused', () => {
  assert.match(css, /@media \(max-width: 767px\) \{/);
  assert.match(css, /body:has\(:is\([\s\S]*?textarea,[\s\S]*?select,[\s\S]*?input:not\(\[type="checkbox"\]\)[\s\S]*?\[contenteditable="true"\][\s\S]*?\):focus\) \.ia222-bottom-navigation \{\s*display: none !important;/);
  assert.match(css, /body:has\(:is\([\s\S]*?\):focus\) \{\s*--ia222-bottom-height: 0px !important;/);
  for (const type of ['checkbox','radio','range','button','submit','reset','hidden']) {
    assert.ok(css.includes(':not([type="' + type + '"])'), 'do not hide the bar when a non-editing ' + type + ' control is focused');
  }
});

// Assert the actual compact model, not merely the number of links: losing one
// journey and duplicating another must not leave the layout contract green.
function assertSevenItemLayout(bottom, currentCss, navigation = getCompactNavigation) {
  const ids = ['profile', 'courses', 'home', 'analysis', 'alchemy', 'pro', 'temple'];
  for (const locale of ['en', 'ru', 'es']) {
    const items = navigation(locale);
    const hrefs = [
      '/' + (locale === 'es' ? 'en' : locale) + '/app/portrait',
      '/' + locale + '/academy',
      locale === 'en' ? '/' : '/' + locale,
      '/' + locale + '/services/free-situation-review',
      '/' + locale + '/services/alchemy-of-soul',
      '/' + locale + '/pro',
      '/' + locale + '/holistic-support',
    ];
    assert.deepEqual(items.map(item => item.id), ids, locale + ': all seven journeys in mobile order');
    assert.deepEqual(items.map(item => item.href), hrefs, locale + ': each journey keeps its intended route');
    assert.ok(items.every(item => item.external === false && typeof item.ariaLabel === 'string' && item.ariaLabel.trim()), locale + ': internal accessible links');

    for (const [source, selector] of [[bottom, 'mobile-bottom-navigation'], [currentCss, 'ia222-bottom-navigation']]) {
      // Stay inside each exact selector's declaration block. A matching grid in
      // a later unrelated rule must not rescue a broken navigation rule.
      const blocks = [...source.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(new RegExp('(?:^|[{}])\\s*\\.' + selector + '\\s*\\{([^{}]*)(?=})', 'g'))];
      const layouts = blocks.map(match => match[1]).filter(block => /grid-template-columns\s*:/.test(block));
      assert.ok(layouts.length, selector + ': grid declaration exists');
      for (const block of layouts) {
        const grid = block.match(/(?:^|;)\s*grid-template-columns\s*:\s*([^;]+)/)?.[1];
        assert.equal(grid?.replace(/\s+/g, ''), 'repeat(' + items.length + ',minmax(0,1fr))', selector + ': one column per journey');
      }
      if (selector === 'mobile-bottom-navigation') {
        assert.ok(layouts.some(block => /(?:^|;)\s*position\s*:\s*fixed\s*;/.test(block) && /(?:^|;)\s*bottom\s*:\s*0\s*;/.test(block)), 'fixed shell stays anchored at the bottom');
        assert.ok(layouts.some(block => /(?:^|;)\s*padding\s*:[^;]*env\(safe-area-inset-bottom\)/.test(block)), 'shell retains its bottom safe-area padding');
      } else {
        assert.ok(layouts.some(block => /(?:^|;)\s*height\s*:\s*auto\s*;/.test(block)), 'mobile override retains automatic height');
      }
    }
  }
  assert.match(currentCss, /env\(safe-area-inset-bottom\)/);
}

test('mobile bottom navigation keeps all seven journeys aligned with its layout and safe-area anchor', () => {
  assertSevenItemLayout(readFileSync('app/holistic-house-home.css', 'utf8'), css);
});

function replaceNavigationGrid(source, selector, grid) {
  const rule = new RegExp('(\\.' + selector + '\\s*\\{[^{}]*?grid-template-columns\\s*:\\s*)[^;]+(;)', 'g');
  return source.replace(rule, (_, prefix, suffix) => prefix + grid + suffix);
}

for (const [name, mutateBottom, mutateCss, navigation] of [
  ['six-column shell', value => replaceNavigationGrid(value, 'mobile-bottom-navigation', 'repeat(6,minmax(0,1fr))'), value => value],
  ['six-column override', value => value, value => replaceNavigationGrid(value, 'ia222-bottom-navigation', 'repeat(6,minmax(0,1fr))')],
  ['unrelated grid decoy', value => replaceNavigationGrid(value, 'mobile-bottom-navigation', 'none') + '\n.unrelated { grid-template-columns: repeat(7,minmax(0,1fr)); }', value => value],
  ['missing shell safe-area', value => value.replaceAll('env(safe-area-inset-bottom)', '0px'), value => value],
  ['missing journey', value => value, value => value, locale => getCompactNavigation(locale).filter(item => item.id !== 'alchemy')],
  ['duplicate journey', value => value, value => value, locale => getCompactNavigation(locale).map(item => item.id === 'alchemy' ? getCompactNavigation(locale)[0] : item)],
  ['wrong localized route', value => value, value => value, locale => getCompactNavigation(locale).map(item => item.id === 'analysis' ? {...item, href: '/en/services/free-situation-review'} : item)],
]) test('mobile layout rejects ' + name, () => {
  const bottom = readFileSync('app/holistic-house-home.css', 'utf8');
  // A broken real baseline must fail here, not masquerade as a rejected mutant.
  assertSevenItemLayout(bottom, css);
  const nextBottom = mutateBottom(bottom), nextCss = mutateCss(css);
  assert.ok(nextBottom !== bottom || nextCss !== css || navigation, 'Mutation must change the contract input');
  assert.throws(() => assertSevenItemLayout(nextBottom, nextCss, navigation), {code: 'ERR_ASSERTION'});
});
