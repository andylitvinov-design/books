import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../components/home-conversation-guide.tsx', import.meta.url), 'utf8');
const start = source.indexOf('  useEffect(() => {\n    if (!isOpen) return;\n    const previouslyFocused');
assert.ok(start >= 0, 'Locate the real modal-focus effect');
const ending = '  }, [isOpen, closeDialog]);';
const end = source.indexOf(ending, start);
assert.ok(end > start);
const effectSource = source.slice(start, end + ending.length);
const compiled = ts.transpileModule(effectSource, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
} }).outputText;

function fixture(initial = 'outside', isOpen = true) {
  const frames = new Map();
  const cancelled = [];
  const listeners = new Map();
  const focusCalls = [];
  let cleanup;
  let frameId = 0;
  const document = { activeElement: null, body: { style: { overflow: 'auto' } },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); },
  };
  const makeNode = name => ({ name, isConnected: true,
    focus(options) { focusCalls.push({ name, options }); document.activeElement = this; },
  });
  const outside = makeNode('outside');
  const textarea = makeNode('textarea');
  const button = makeNode('button');
  const dialog = makeNode('dialog');
  dialog.contains = node => [dialog, textarea, button].includes(node);
  dialog.querySelectorAll = () => [];
  const nodes = { outside, textarea, button, dialog, null: null };
  document.activeElement = nodes[initial];
  const dialogRef = { current: dialog };
  vm.runInNewContext(compiled, {
    isOpen, document, dialogRef, closeDialog() {},
    window: {
      requestAnimationFrame(fn) { frames.set(++frameId, fn); return frameId; },
      cancelAnimationFrame(id) { cancelled.push(id); frames.delete(id); },
    },
    useEffect(fn) { cleanup = fn(); },
  });
  return { document, nodes, dialogRef, focusCalls, frames, cancelled, listeners,
    cleanup: () => cleanup?.(),
    flush() { for (const [id, fn] of [...frames]) { frames.delete(id); fn(); } },
  };
}

for (const target of ['textarea', 'button', 'dialog']) {
  test(`deferred opening does not steal early ${target} focus`, () => {
    const f = fixture();
    // User action happens after the open effect schedules its frame, before it runs.
    f.document.activeElement = f.nodes[target];
    f.flush();
    assert.equal(f.document.activeElement, f.nodes[target]);
    assert.equal(f.focusCalls.length, 0);
    f.cleanup();
  });
}
for (const target of ['outside', 'null']) {
  test(`deferred opening still establishes focus from ${target}`, () => {
    const f = fixture(target);
    f.flush();
    assert.equal(f.document.activeElement, f.nodes.dialog);
    assert.equal(f.focusCalls.length, 1);
    assert.equal(f.focusCalls[0].options.preventScroll, true);
    f.cleanup();
  });
}
test('absent dialog ref is harmless at the scheduled frame', () => {
  const f = fixture();
  f.dialogRef.current = null;
  f.flush();
  assert.equal(f.focusCalls.length, 0);
  f.cleanup();
});
for (const reason of ['close', 'unmount']) {
  test(`${reason} cancels pending focus and restores existing ownership`, () => {
    const f = fixture();
    assert.equal(f.document.body.style.overflow, 'hidden');
    assert.ok(f.listeners.has('keydown'));
    f.cleanup();
    if (reason === 'unmount') f.dialogRef.current = null;
    f.flush();
    assert.equal(f.cancelled.length, 1);
    assert.equal(f.frames.size, 0);
    assert.equal(f.listeners.size, 0);
    assert.equal(f.document.body.style.overflow, 'auto');
    assert.equal(f.document.activeElement, f.nodes.outside);
    assert.deepEqual(f.focusCalls.map(item => item.name), ['outside']);
  });
}
test('cleanup does not focus a disconnected previous owner', () => {
  const f = fixture();
  f.nodes.outside.isConnected = false;
  f.cleanup();
  f.flush();
  assert.equal(f.focusCalls.length, 0);
});
test('closed dialog schedules no work', () => {
  const f = fixture('outside', false);
  assert.equal(f.frames.size, 0);
  assert.equal(f.listeners.size, 0);
  assert.equal(f.document.body.style.overflow, 'auto');
});
test('focus effect does not mutate draft or replace submit validation', () => {
  assert.doesNotMatch(effectSource, /setDraft|requestSubmit|\.click\(|setTimeout/);
  assert.match(source, /onChange=\{event => setDraft\(event\.currentTarget\.value\)\}/);
  assert.match(source, /disabled=\{!draft\.trim\(\)\}/);
  assert.match(source, /function submit\(event: FormEvent<HTMLFormElement>\) \{\s*event\.preventDefault\(\);\s*ask\(draft\);/);
});
test('failure diagnostics do not change the immediate real reopen-fill-click sequence', () => {
  const browser = readFileSync(new URL('./home-conversation-browser.mjs', import.meta.url), 'utf8');
  assert.match(browser, /await dialog\.locator\("textarea"\)\.fill\(scenario\.text\);\s*await dialog\.getByRole\("button", \{ name: scenario\.send \}\)\.click\(\);/);
  assert.match(browser, /evidence\.failure = \{ scenarioIndex:/);
  const scenarioLoop = browser.slice(browser.indexOf('for (const scenario of scenarios)'), browser.indexOf('// Regression for the iPhone report:'));
  assert.doesNotMatch(scenarioLoop, /force:\s*true|dispatchEvent\(/);
  const capture = browser.slice(browser.indexOf('// Failure-only observation:'), browser.indexOf('throw error;', browser.indexOf('// Failure-only observation:')));
  assert.doesNotMatch(capture, /innerHTML|outerHTML|innerText|textContent|\.url\(|\.screenshot\(|errors\.map/);
  assert.match(capture, /inputLength: input \? input\.value\.length : null/);
});
