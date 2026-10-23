import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
function load(path, source, imports) {
  const exports = {};
  const compiled = ts.transpileModule(source, { fileName: path, compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  } }).outputText;
  runInNewContext(compiled, { exports, require(name) {
    assert.ok(Object.hasOwn(imports, name), 'Unexpected public navigation dependency: ' + name);
    return imports[name];
  } }, { filename: path, timeout: 2000 });
  return exports;
}

// Execute the real environment detector and My Space exports. No window,
// network, account client, native SDK or effects are provided by this loader.
// Callers explicitly supply bounded React context and throwing private edges.
export function loadPublicNavigationSpace(imports, {
  source = read('components/home-personal-space.tsx'),
  nativeSource = read('lib/native/client.ts'),
} = {}) {
  const native = load('lib/native/client.ts', nativeSource, {});
  return load('components/home-personal-space.tsx', source, {
    ...imports, '@/lib/native/client': native,
  });
}
