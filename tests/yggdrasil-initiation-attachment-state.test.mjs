import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../components/yggdrasil-initiation-form.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText;

// Execute the real component handlers with inert browser boundaries. No files
// are uploaded, no clipboard is changed and no messenger is contacted.
function fixture({ shareError = null, hash = '' } = {}) {
  const hooks = [], effects = [], listeners = new Map(), shares = [], opened = [];
  let cursor = 0, dirty = false, tree, visibleFile = null;
  const equal = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!hooks[index]) hooks[index] = { value: initial };
      return [hooks[index].value, value => {
        if (!Object.is(hooks[index].value, value)) { hooks[index].value = value; dirty = true; }
      }];
    },
    useCallback(callback, dependencies) {
      const index = cursor++;
      if (!hooks[index] || !equal(hooks[index].dependencies, dependencies)) hooks[index] = { value: callback, dependencies };
      return hooks[index].value;
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (!hooks[index] || !equal(hooks[index].dependencies, dependencies)) {
        hooks[index]?.cleanup?.();
        hooks[index] = { dependencies };
        effects.push(() => { hooks[index].cleanup = effect(); });
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const window = {
    location: { hash },
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: name => listeners.delete(name),
    open: (...args) => { opened.push(args); return {}; },
  };
  const navigator = {
    canShare: () => true,
    share: async value => { shares.push(value); if (shareError) throw shareError; },
  };
  const require = name => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (name === '@/lib/whatsapp-enquiry') return { WHATSAPP_NUMBER: '0000000000' };
    if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
    throw new Error('Unexpected dependency: ' + name);
  };
  const compiledModule = { exports: {} };
  new Function('require', 'module', 'exports', 'navigator', 'window', compiled)(require, compiledModule, compiledModule.exports, navigator, window);
  function nodes(predicate, current = tree, found = []) {
    if (!current || typeof current !== 'object') return found;
    if (Array.isArray(current)) { current.forEach(child => nodes(predicate, child, found)); return found; }
    if (predicate(current)) found.push(current);
    return nodes(predicate, current.props?.children ?? null, found);
  }
  function render() {
    let attempts = 0;
    do {
      assert.ok(attempts++ < 10, 'Component effects must settle');
      cursor = 0; dirty = false;
      tree = compiledModule.exports.YggdrasilInitiationForm({ locale: 'en' });
      while (effects.length) effects.shift()();
    } while (dirty);
    // A native uncontrolled file input loses its selection when unmounted.
    if (!nodes(node => node.type === 'input' && node.props.type === 'file').length) visibleFile = null;
  }
  render();
  return {
    shares, opened,
    mode(value) { nodes(node => node.props?.['data-intent'] === value)[0].props.onClick(); render(); },
    hash(value) { window.location.hash = value; listeners.get('hashchange')(); render(); },
    attach(file) {
      const input = nodes(node => node.type === 'input' && node.props.type === 'file')[0];
      assert.ok(input, 'Answers file input is visible');
      const target = { files: file ? [file] : [], value: file?.name || '' };
      input.props.onChange({ target });
      visibleFile = target.value ? file : null;
      render();
    },
    answers(value) { nodes(node => node.type === 'textarea' && node.props.onChange)[0].props.onChange({ target: { value } }); render(); },
    async submit() { await tree.props.onSubmit({ preventDefault() {} }); render(); },
    visibleFile: () => visibleFile,
    errors: () => nodes(node => node.props?.role === 'alert').map(node => node.props.children),
  };
}
const oldFile = { name: 'previous-answers.pdf', size: 100, type: 'application/pdf' };
const newFile = { name: 'new-answers.txt', size: 80, type: 'text/plain' };

test('a visibly selected answer file is shared only after explicit submit', async () => {
  const form = fixture(); form.mode('answers'); form.attach(oldFile);
  assert.equal(form.visibleFile(), oldFile);
  assert.deepEqual(form.shares, []); assert.deepEqual(form.opened, []);
  await form.submit(); assert.deepEqual(form.shares[0].files, [oldFile]);
});
for (const mode of ['free', 'personal', 'pdf']) test(`leaving Answers for ${mode} cannot retain a hidden attachment`, async () => {
  const form = fixture(); form.mode('answers'); form.attach(oldFile);
  form.mode(mode); form.mode('answers');
  assert.equal(form.visibleFile(), null);
  await form.submit();
  assert.deepEqual(form.shares, []); assert.deepEqual(form.opened, []);
  assert.deepEqual(form.errors(), ['Please write your answers or select a file.']);
});
for (const hash of ['#apply-free', '#request-free-initiation', '#apply-personal', '#apply-pdf']) test(`hash navigation through ${hash} clears the hidden attachment too`, async () => {
  const form = fixture({ hash: '#apply-answers' }); form.attach(oldFile);
  form.hash(hash); form.hash('#apply-answers');
  assert.equal(form.visibleFile(), null);
  await form.submit();
  assert.deepEqual(form.shares, []); assert.deepEqual(form.opened, []);
  assert.equal(form.errors().length, 1);
});
test('after a round trip only a newly selected visible file may be shared', async () => {
  const form = fixture(); form.mode('answers'); form.attach(oldFile);
  form.mode('free'); form.mode('answers'); form.attach(newFile);
  assert.equal(form.visibleFile(), newFile);
  await form.submit();
  assert.deepEqual(form.shares[0].files, [newFile]);
  assert.ok(!form.shares[0].text.includes(oldFile.name));
});
test('remaining in Answers keeps the visible selection usable', async () => {
  const form = fixture(); form.mode('answers'); form.attach(oldFile);
  form.mode('answers'); form.hash('#apply-answers');
  assert.equal(form.visibleFile(), oldFile);
  await form.submit(); assert.deepEqual(form.shares[0].files, [oldFile]);
});
test('typed answers remain visible after switching, without the previous file', async () => {
  const form = fixture(); form.mode('answers'); form.attach(oldFile); form.answers('My prepared answers');
  form.mode('personal'); form.mode('answers');
  await form.submit();
  assert.deepEqual(form.shares, []); assert.equal(form.opened.length, 1);
  const message = new URL(form.opened[0][0]).searchParams.get('text');
  assert.ok(message.includes('My prepared answers')); assert.ok(!message.includes(oldFile.name));
});
test('cancelling native sharing does not open a messenger or imply delivery', async () => {
  const form = fixture({ shareError: Object.assign(new Error('cancelled'), { name: 'AbortError' }) });
  form.mode('answers'); form.attach(newFile); await form.submit();
  assert.deepEqual(form.opened, []);
  assert.deepEqual(form.errors(), ['File sharing was cancelled; nothing was sent.']);
});
