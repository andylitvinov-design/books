import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';
import ts from 'typescript';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const css = read('components/alchemy-soul-landing.module.css');
const compact = value => value.replace(/\s+/g, '');

// Source/cascade proof only. Actual viewport fit remains the browser verifier's
// unchanged ceil(height) <= innerHeight - 80 assertion, never an estimate here.
function layoutContract(input) {
  const root = postcss.parse(input);
  const media = root.nodes.filter(node => node.type !== 'comment').at(-1);
  assert.equal(media.type, 'atrule');
  assert.equal(media.name, 'media');
  assert.equal(compact(media.params), '(min-width:1024px)');
  const rules = media.nodes.filter(node => node.type !== 'comment');
  const expected = [
    ['.panel.optionsSection', {
      display: 'grid', 'grid-template-columns': 'minmax(220px,26%)minmax(0,1fr)',
      'column-gap': '24px', 'row-gap': '0', 'padding-block': '20px', 'align-items': 'start',
    }],
    ['.optionsSection>.panelPhoto', {
      'grid-column': '1', 'grid-row': '1/span2', height: 'auto', 'align-self': 'stretch',
    }],
    ['.optionsSection>.sectionHeading', { 'grid-column': '2', 'grid-row': '1', 'min-width': '0' }],
    ['.optionsSection>:global([data-alchemy-booking-formats])', {
      'grid-column': '2', 'grid-row': '2', 'min-width': '0',
    }],
  ];
  assert.equal(rules.length, expected.length);
  for (const [index, rule] of rules.entries()) {
    assert.equal(rule.type, 'rule');
    assert.equal(compact(rule.selector), expected[index][0]);
    assert.deepEqual(rule.nodes.map(declaration => {
      assert.equal(declaration.type, 'decl');
      assert.equal(Boolean(declaration.important), false);
      return [declaration.prop, compact(declaration.value)];
    }), Object.entries(expected[index][1]));
  }
  const oldFlex = root.nodes.find(node => node.type === 'rule' && compact(node.selector) === '.panel:has(>.panelPhoto)');
  assert.ok(oldFlex);
  assert.equal(oldFlex.nodes.find(node => node.prop === 'display').value, 'flex');
  // :has() adopts its argument specificity: both selectors have two classes.
  // The later scoped rule wins without !important or affecting other panels.
  assert.ok(root.nodes.indexOf(oldFlex) < root.nodes.indexOf(media));
  return { root, media, rules };
}

test('desktop formats reflow only their existing photo, heading and choices, with natural height', () => {
  const { media } = layoutContract(css);
  const minimumWidth = Number(media.params.match(/\d+/)[0]);
  for (const width of [320, 360, 390, 430, 680, 850, 1023]) assert.equal(width >= minimumWidth, false);
  for (const width of [1024, 1280, 1440]) assert.equal(width >= minimumWidth, true);
});

test('actual TSX direct children and selector root match the scoped grid without DOM reordering', () => {
  const parse = path => {
    const ast = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    assert.equal(ast.parseDiagnostics.length, 0); return ast;
  };
  const opening = node => ts.isJsxElement(node) ? node.openingElement : node;
  const attr = (node, name) => opening(node).attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText() === name);
  const ast = parse('components/alchemy-soul-landing.tsx'), sections = [];
  const walk = node => {
    if (ts.isJsxElement(node) && attr(node, 'data-alchemy-panel')?.initializer?.text === 'formats') sections.push(node);
    ts.forEachChild(node, walk);
  };
  walk(ast); assert.equal(sections.length, 1);
  const children = sections[0].children.filter(node => ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node));
  assert.deepEqual(children.map(node => opening(node).tagName.getText(ast)), ['div', 'header', 'AlchemySoulFormatSelector']);
  assert.equal(attr(children[0], 'className').initializer.expression.getText(ast), 'styles.panelPhoto');
  assert.equal(attr(children[1], 'className').initializer.expression.getText(ast), 'styles.sectionHeading');
  const formAst = parse('components/alchemy-soul-lead-form.tsx');
  const fn = formAst.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'AlchemySoulFormatSelector');
  const returned = fn.body.statements.find(ts.isReturnStatement).expression;
  const element = ts.isParenthesizedExpression(returned) ? returned.expression : returned;
  assert.equal(opening(element).tagName.getText(formAst), 'div');
  assert.ok(attr(element, 'data-alchemy-booking-formats'));
  layoutContract(css);
});

test('desktop contract rejects mobile spill, lost specificity, clipping, shrinking and hidden content', () => {
  const change = (rules, i, property, value) => {
    const declaration = rules[i].nodes.find(node => node.prop === property);
    assert.ok(declaration); declaration.value = value;
  };
  const mutations = [
    ({ media }) => { media.params = '(max-width:1024px)'; },
    ({ media }) => { media.params = '(min-width:680px)'; },
    ({ media }) => { media.params += ' and (min-height:844px)'; },
    ({ rules }) => { rules[0].selector = '.optionsSection'; },
    ({ rules }) => { rules[0].selector += ', .reviewSection'; },
    ({ rules }) => change(rules, 0, 'display', 'flex'),
    ({ rules }) => change(rules, 0, 'grid-template-columns', '1fr'),
    ({ rules }) => change(rules, 1, 'height', '56px'),
    ({ rules }) => change(rules, 1, 'align-self', 'start'),
    ({ rules }) => change(rules, 3, 'grid-column', '1'),
    ({ rules }) => { rules[0].append({ prop: 'max-height', value: '764px' }); },
    ({ rules }) => { rules[0].append({ prop: 'overflow', value: 'hidden' }); },
    ({ rules }) => { rules[3].append({ prop: 'font-size', value: '10px' }); },
    ({ rules }) => { rules[3].append({ prop: 'display', value: 'none' }); },
    ({ rules }) => { rules[0].nodes[0].important = true; },
  ];
  for (const mutate of mutations) {
    const parsed = layoutContract(css); mutate(parsed);
    assert.throws(() => layoutContract(parsed.root.toString()), { code: 'ERR_ASSERTION' });
  }
});
