import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
async function loadData(path) {
  const { outputText } = ts.transpileModule(source(path), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
  return import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
}

test('Spanish biography preserves every English section, paragraph and experience entry', async () => {
  const { aboutBiography } = await loadData('data/about-biography.ts');
  const { aboutEs, aboutIntroEs } = await loadData('data/about-es.ts');
  assert.equal(aboutEs.intro.length, aboutBiography.en.intro.length);
  assert.equal(aboutEs.sections.length, aboutBiography.en.sections.length);
  for (let i = 0; i < aboutEs.sections.length; i++) {
    assert.equal(aboutEs.sections[i].items?.length, aboutBiography.en.sections[i].items?.length);
    assert.equal(aboutEs.sections[i].paragraphs?.length, aboutBiography.en.sections[i].paragraphs?.length);
  }
  for (const year of ['2002', '2004', '2011']) assert.ok(JSON.stringify(aboutEs).includes(year));
  assert.equal(aboutIntroEs.transcript.split('\n\n').length, 4);
  assert.match(aboutIntroEs.transcript, /homeopatía.*constelaciones sistémicas.*hipnoterapia/s);
  assert.doesNotMatch(JSON.stringify(aboutEs), /[\u0400-\u04ff]/);
});

test('ES translation reuses only the currently published approved EN source without claiming Spanish audio', () => {
  const page = source('app/es/about/page.tsx');
  assert.match(page, /getPublishedSiteVideos\(\)/);
  assert.match(page, /englishIntro\?\.heygenId === existingAboutIntroVideo.heygenId/);
  assert.match(page, /textLanguage="es"/);
  assert.doesNotMatch(page, /language:\s*['"]es['"]|create_video|saveSiteVideoAction|\/es\/(client|homeopathy|services)/);
  const player = source('components/site-video-player.tsx');
  assert.match(player, /Audio en inglés/);
  assert.match(player, /Audio en ruso/);
  assert.match(player, /cc_lang_pref: video.language/);
  assert.match(player, /lang=\{textLanguage\}/);
});

test('ES page has complete consultation, testimonials, archive, client entry and SEO copy', () => {
  const page = source('app/es/about/page.tsx');
  for (const value of ['about-biography', 'about-testimonials', 'about-review-archive', 'personal-consultation-title', 'about-client-cabinet', 'canonical:', "es: '/es/about'"]) assert.ok(page.includes(value), value);
  const form = source('components/personal-consultation-form.tsx');
  for (const value of ['Solicitar una consulta personal', 'Solicitud de consulta personal', 'Nombre:', 'Contacto preferido:', 'Lo que me gustaría explorar:', 'Escribe tu nombre.', 'Cuéntame qué te gustaría trabajar.']) assert.ok(form.includes(value), value);
  assert.match(source('app/sitemap.ts'), /\/es\/about/);
});

test('ES routing stays scoped, keeps native EN/RU preferences and has server-rendered language', () => {
  const navigation = source('components/site-navigation.tsx');
  assert.match(navigation, /aboutPath \? \["ru", "en", "es"\]/);
  assert.match(navigation, /if \(nextLocale === "es"\) return/);
  assert.match(source('components/mobile-bottom-navigation.tsx'), /Sobre mí/);
  assert.match(source('middleware.ts'), /requestHeaders.set\('x-public-page-locale', pageLocale\)/);
  assert.match(source('app/layout.tsx'), /<html lang=\{lang\}>/);
  assert.match(source('lib/ui-locale.js'), /return value === 'ru' \|\| value === 'en'/);
});
