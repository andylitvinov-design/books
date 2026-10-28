import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const panel = readFileSync(new URL('../components/home-personal-space.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../components/home-personal-space.module.css', import.meta.url), 'utf8');

test('My space provides profile building and development plan for guests and signed-in people in EN/RU/ES', () => {
  for (const label of ['Create my profile', 'My development plan', 'Создать мой профиль', 'Моя программа развития', 'Crear mi perfil', 'Mi plan de desarrollo']) {
    assert.ok(panel.includes(label), label);
  }
  assert.match(panel, /href: root \+ "\/portrait"/);
  assert.match(panel, /href: root \+ "\/portfolio#hh-development-program"/);
  assert.match(panel, /data-space-link="profile"/);
  assert.match(panel, /data-space-link="plan"/);
  assert.match(panel, /personalActions\.map\(/);
  assert.match(panel, /data-space-link=\{id\}/);
});

test('My space reaches established sections without inventing a duplicate private flow', () => {
  for (const fragment of [
    '/explore/energy', '/explore/love', '/explore/business',
    '/coaching', '/temple-support', '/masters', '/pro#profi-learning',
    '/client/tests', '/academy', '/services/free-situation-review',
    '/practice?panel=services', '/practice?panel=materials&materialTab=courses'
  ]) {
    assert.ok(panel.includes(fragment), fragment);
  }
  for (const label of ['Coaching sessions', 'Temple & Dao insights',
    'Коучинг-сессии', 'Храмовые и даосские подсказки',
    'Sesiones de coaching', 'Guía del templo y del Dao']) {
    assert.ok(panel.includes(label), label);
  }
  // The former books entry now reaches the approved support hub through its legacy redirect.
  assert.match(panel, /id: "temple", href: "\/" \+ activeLocale \+ "\/temple-support", label: t\.temple/);
  const legacySupport = readFileSync(new URL('../app/[locale]/temple-support/page.tsx', import.meta.url), 'utf8');
  assert.match(legacySupport, /if \(!isPublicLocale\(locale\)\) notFound\(\)/);
  assert.match(legacySupport, /permanentRedirect\("\/" \+ locale \+ "\/holistic-support"\)/);
  assert.match(panel, /status === "guest" \|\| \(status === "ready" && summary\)/);
  assert.match(panel, /onClick=\{closePanel\}/);
  assert.match(panel, /summary\.professional \?/);
  assert.doesNotMatch(panel, /localStorage|sessionStorage|dangerouslySetInnerHTML/);
});

test('My space topic rows are mobile-safe and keyboard accessible', () => {
  assert.match(css, /\.exploreTopics \{ grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /\.exploreGuides \{ grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /@media \(max-width: 350px\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /focus-visible/);
});
