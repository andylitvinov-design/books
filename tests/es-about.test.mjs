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
  assert.match(page, /getPublishedSiteVideo\('about-intro:es'\)/);
  assert.doesNotMatch(page, /getPublishedSiteVideos\(\)/);
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
  const page = source('app/es/about/page.tsx'); for (const value of ['about-biography', 'PersonalTestimonials', 'variant="about"', 'personal-consultation-title', 'about-client-cabinet', 'canonical:', "es: '/es/about'", '/es/books', '/es/homeopathy', '/es/services', '/es/client']) assert.ok(page.includes(value), value);
  assert.doesNotMatch(page, /Los enlaces marcados con EN|href="\/en\/client"/);
  const form = source('components/personal-consultation-form.tsx');
  const chooser = source('components/consultation-choice-capture.tsx');
  assert.match(form, /service \? "service" : "personal"/);
  for (const phrase of ['Evaluación gratuita mediante dibujo', 'Situación personal', 'Evaluación gratuita por dibujo + informe', 'Iniciar evaluación gratuita', 'Solicitud de sesión personal', 'Solo se envía cuando confirmas Enviar', 't.me/AndyTherapist']) assert.ok(chooser.includes(phrase), phrase);
  assert.match(source('app/sitemap.ts'), /\/es\/about/);
});
test('Public ES routing does not enable unsupported private-cabinet locales', () => {
  const navigation = source('components/site-navigation.tsx'); assert.match(navigation, /hasSpanishCounterpart/); assert.match(navigation, /if \(next === 'es'\) return/);
  assert.match(source('components/mobile-bottom-navigation.tsx'), /getCompactNavigation/); assert.match(source('middleware.ts'), /requestHeaders.set\('x-public-page-locale', pageLocale\)/); assert.match(source('app/layout.tsx'), /<html lang=\{lang\}>/); assert.match(source('lib/ui-locale.js'), /return value === 'ru' \|\| value === 'en'/);
  assert.match(source('app/es/client/page.tsx'), /locale="en" displayLocale="es"/);
});

test('Spanish preview is the exact small frame extracted from the archived Spanish master', () => {
  const poster = readFileSync(new URL('../public/images/holistic-house/video-posters/psychic-alchemy-es-v1.webp', import.meta.url));
  assert.ok(poster.length < 100000);
  assert.equal(createHash('sha256').update(poster).digest('hex'), '53646820605fbd228ec1511b11f9701cbba6127b8b79fb7863a101ee7ad5347c');
  assert.doesNotMatch(source('components/site-video-player.tsx'), /Expires=|Signature=|\.mp4\?/);
});

test('ES About checks exact archived identities without relaxing Spanish UI or original audio', () => {
  const browser = source('scripts/verify-es-about.mjs');
  const testimonials = source('components/personal-testimonials.tsx');
  const archived = testimonials.match(/locallyArchivedVideoPosterIds = new Set\(\[([\s\S]*?)\]\)/);
  const expected = browser.match(/const aboutTestimonialIds = (\[[^\n]+\]);/);
  assert.ok(archived);
  assert.ok(expected, 'ES browser must identify exact reviewed cards');
  const archivedIds = [...archived[1].matchAll(/"([A-Za-z0-9_-]{11})"/g)].map(match => match[1]).sort();
  assert.deepEqual(JSON.parse(expected[1]).sort(), archivedIds);
  assert.doesNotMatch(browser, /\.about-video-grid/);
  assert.ok(browser.includes("assert.doesNotMatch(await page.locator('main').innerText(), /[\\u0400-\\u04ff]/)"));
  assert.ok(browser.includes("getByText('Ruso · RU', { exact: true })"));
  assert.ok(browser.includes("getByText('Inglés · EN', { exact: true })"));
  const labels = testimonials.match(/const russianTestimonialTitlesEs:[^=]+ = \{([\s\S]*?)\n\};/);
  assert.ok(labels, 'Russian originals need translated Spanish display labels');
  assert.doesNotMatch(labels[1], /[\u0400-\u04ff]/);
  const ru = testimonials.match(/  ru: \[([\s\S]*?)\],\n  en: \[/)[1];
  const ruIds = [...ru.matchAll(/id: "([A-Za-z0-9_-]{11})"/g)].map(match => match[1]);
  assert.equal(ruIds.length, 6);
  for (const id of ruIds) assert.ok(labels[1].includes(id), id);
  assert.ok(testimonials.includes('locale === "es" && item.language === "ru"'));
  assert.ok(testimonials.includes('title: russianTestimonialTitlesEs[item.id] ?? item.title'));
  assert.ok(testimonials.includes('video={{ youtubeId: item.id, language: item.language, title: item.title }}'));
  assert.ok(testimonials.includes('textLanguage={locale === "es" ? "es" : item.language}'));
  assert.ok(source('app/es/about/page.tsx').includes('locale="es" variant="about"'));
  assert.equal((browser.match(/intro\.locator\('\.site-video-watch-link'\)\)\.toHaveCount\(0\)/g) || []).length, 2);
  assert.ok(browser.includes("'https://app.heygen.com/embeds/2c251709aba74fd96ae8be43257a080b'"));
});

test('ES testimonial title projection preserves every original identity and audio language', () => {
  const testimonials = source('components/personal-testimonials.tsx');
  const labels = testimonials.match(/const russianTestimonialTitlesEs:[^=]+ = \{([\s\S]*?)\n\};/);
  assert.ok(labels, 'Spanish labels must exist for the Russian archive');
  const translations = Object.fromEntries([...labels[1].matchAll(/"?([A-Za-z0-9_-]{11})"?: "([^"]+)"/g)].map(match => [match[1], match[2]]));
  const ru = testimonials.match(/  ru: \[([\s\S]*?)\],\n  en: \[/)[1];
  const originals = [...ru.matchAll(/id: "([^"]+)", title: "([^"]+)", language: "(ru)"/g)].map(match => ({id:match[1],title:match[2],language:match[3]}));
  assert.equal(originals.length, 6);
  const projection = testimonials.match(/\) => (items\.map\(\(item\) => locale === "es"[\s\S]*?: item\))\.map/);
  assert.ok(projection, 'Actual rendering must use the Spanish label projection');
  // Execute only the reviewed pure map expression, never the component or its imports.
  const translate = new Function('items', 'locale', 'russianTestimonialTitlesEs', 'return ' + projection[1]);
  for (const locale of ['ru', 'en']) assert.deepEqual(translate(originals, locale, translations), originals);
  const spanish = translate(originals, 'es', translations);
  assert.deepEqual(spanish.map(({id,language}) => ({id,language})), originals.map(({id,language}) => ({id,language})));
  for (const item of spanish) {
    assert.equal(item.title, translations[item.id]);
    assert.doesNotMatch(item.title, /[\u0400-\u04ff]/);
    assert.match(item.title, /testimonio/);
  }
  assert.ok(testimonials.includes('locale === "es" ? "Ruso · RU"'));
});


