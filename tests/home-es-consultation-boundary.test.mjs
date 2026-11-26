import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as publicLead from '../lib/public-lead-capture.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const consultation = () => null;
let hydrated = false;
const modules = {
  'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  react: { useEffect() {}, useState(initial) { return [hydrated ? (initial === null ? '/es' : true) : initial, () => {}]; } },
  'next/navigation': { usePathname: () => '/es' },
  'next/link': { default: () => null },
  'lucide-react': { ArrowRight: () => null },
  '@/lib/public-lead-capture': publicLead,
  '@/components/contact-channel-chooser': { ContactChannelChooser: () => null },
  '@/components/consultation-choice-capture': { ConsultationChoiceCapture: consultation },
  '@/components/commerce/consultation-cart-entry': { ConsultationCartEntry: () => null },
};
function load(path) {
  const compiled = ts.transpileModule(read(path), { fileName: path, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, require(name) { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; } });
  return exports;
}

test('Spanish Home retains the same consultation choice before and after hydration', () => {
  assert.equal(publicLead.classifyPublicLead('/es'), null);
  const original = load('components/public-consultation-cta.tsx').PublicConsultationCta;
  assert.ok(existsSync(new URL('../components/home-spanish-consultation-cta.tsx', import.meta.url)), 'Home-specific boundary exists');
  const replacement = load('components/home-spanish-consultation-cta.tsx').HomeSpanishConsultationCta;
  hydrated = false;
  assert.equal(original({ locale: 'es' }), null);
  assert.equal(replacement({ locale: 'es' }), null);
  hydrated = true;
  const before = original({ locale: 'es' });
  const after = replacement({ locale: 'es' });
  assert.equal(before.type, consultation);
  assert.equal(after.type, consultation);
  assert.equal(JSON.stringify(after.props), JSON.stringify(before.props));
});
