import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createHash } from 'node:crypto';
const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
async function loadData(path) { const { outputText } = ts.transpileModule(source(path), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }); return import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64')); }
test('Spanish biography preserves every English section, paragraph and experience entry', async () => {
  const { aboutBiography } = await loadData('data/about-biography.ts'); const { aboutEs, aboutIntroEs } = await loadData('data/about-es.ts');
  assert.equal(aboutEs.intro.length, aboutBiography.en.intro.length); assert.equal(aboutEs.sections.length, aboutBiography.en.sections.length);
  for (let i = 0; i < aboutEs.sections.length; i++) { assert.equal(aboutEs.sections[i].items?.length, aboutBiography.en.sections[i].items?.length); assert.equal(aboutEs.sections[i].paragraphs?.length, aboutBiography.en.sections[i].paragraphs?.length); }
  for (const year of ['2002', '2004', '2011']) assert.ok(JSON.stringify(aboutEs).includes(year));
  assert.equal(aboutIntroEs.transcript.split('\n\n').length, 4); assert.match(aboutIntroEs.transcript, /homeopatía.*constelaciones sistémicas.*hipnoterapia/s); assert.doesNotMatch(JSON.stringify(aboutEs), /[\u0400-\u04ff]/);
});
test('Spanish About uses its independent published Spanish audio, not an English fallback', async () => {
  const page = source('app/es/about/page.tsx');
  assert.match(page, /getPublishedSiteVideos\(\)/);
  assert.ok(page.includes("published['about-intro:es']"));
  assert.doesNotMatch(page, /englishIntro|about-intro:en|create_video|saveSiteVideoAction/);
  const { existingAboutIntroVideoEs } = await import('../lib/site-videos/defaults.js');
  const { aboutIntroEs } = await loadData('data/about-es.ts');
  assert.equal(existingAboutIntroVideoEs.transcript, aboutIntroEs.transcript);
  assert.equal(existingAboutIntroVideoEs.language, 'es');
  assert.equal(existingAboutIntroVideoEs.durationSeconds, 31);
  const player = source('components/site-video-player.tsx');
  assert.ok(player.includes('video.language !== "es"'));
  for (const text of ['Audio en inglés','Audio en ruso','cc_lang_pref: video.language','lang={textLanguage}','psychic-alchemy-es-v1.webp']) assert.ok(player.includes(text));
});
test('ES About retains all sections, real translated destinations, form and SEO', () => {
  const page = source('app/es/about/page.tsx'); for (const value of ['about-biography', 'about-testimonials', 'about-review-archive', 'personal-consultation-title', 'about-client-cabinet', 'canonical:', "es: '/es/about'", '/es/books', '/es/homeopathy', '/es/services', '/es/client']) assert.ok(page.includes(value), value);
  assert.doesNotMatch(page, /Los enlaces marcados con EN|href="\/en\/client"/);
  const form = source('components/personal-consultation-form.tsx'); for (const value of ['Continuar en WhatsApp', 'Solicitud de consulta personal', 'Nombre:', 'Contacto preferido:', 'Lo que me gustaría explorar:', 'Escribe tu nombre.', 'Cuéntame qué te gustaría trabajar.', 't.me/AndyTherapist']) assert.ok(form.includes(value), value);
  assert.match(source('app/sitemap.ts'), /\/es\/about/);
});
test('Public ES routing does not enable unsupported private-cabinet locales', () => {
  const navigation = source('components/site-navigation.tsx'); assert.match(navigation, /hasSpanishCounterpart/); assert.match(navigation, /if \(next === 'es'\) return/);
  assert.match(source('components/mobile-bottom-navigation.tsx'), /getSiteNavigation/); assert.match(source('middleware.ts'), /requestHeaders.set\('x-public-page-locale', pageLocale\)/); assert.match(source('app/layout.tsx'), /<html lang=\{lang\}>/); assert.match(source('lib/ui-locale.js'), /return value === 'ru' \|\| value === 'en'/);
  assert.match(source('app/es/client/page.tsx'), /locale="en" displayLocale="es"/);
});

test('Spanish preview is the exact small frame extracted from the archived Spanish master', () => {
  const poster = readFileSync(new URL('../public/images/holistic-house/video-posters/psychic-alchemy-es-v1.webp', import.meta.url));
  assert.ok(poster.length < 100000);
  assert.equal(createHash('sha256').update(poster).digest('hex'), '53646820605fbd228ec1511b11f9701cbba6127b8b79fb7863a101ee7ad5347c');
  assert.doesNotMatch(source('components/site-video-player.tsx'), /Expires=|Signature=|\.mp4\?/);
});
