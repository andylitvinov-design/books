import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
// Execute the real media-selection declarations, not a copied implementation or
// a literal declaration shape that changes when other videos gain embed support.
function selectedMedia(player, video) {
  const ast = ts.createSourceFile('site-video-player.tsx', player, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set(['existingYouTubeMirrors', 'mirrorId', 'playbackYouTubeId', 'playerParams', 'embedUrl']);
  const declarations = new Map();
  const iframeSources = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && names.has(node.name.text)) {
      assert.ok(!declarations.has(node.name.text), `Unique media declaration: ${node.name.text}`);
      assert.ok(node.initializer, `Media initializer: ${node.name.text}`);
      declarations.set(node.name.text, `const ${node.name.text} = ${node.initializer.getText(ast)};`);
    }
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'iframe') {
      const src = node.attributes.properties.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(ast) === 'src');
      iframeSources.push(src?.initializer?.getText(ast));
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  for (const name of ['existingYouTubeMirrors', 'mirrorId', 'playbackYouTubeId', 'embedUrl']) assert.ok(declarations.has(name), `Required media declaration: ${name}`);
  assert.deepEqual(iframeSources, ['{embedUrl}'], 'Playback iframe consumes the selected media URL');
  const code = [...declarations.values()].join('\n') + '\n({ mirrorId, playbackYouTubeId, embedUrl });';
  return runInNewContext(code, { video, locale: 'es', URLSearchParams }, { timeout: 1000 });
}
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
  const { existingAboutIntroVideo, existingAboutIntroVideoRu, existingAboutIntroVideoEs, builtInSiteVideoRecords } = await import('../lib/site-videos/defaults.js');
  const { aboutIntroEs } = await loadData('data/about-es.ts');
  assert.equal(existingAboutIntroVideoEs.transcript, aboutIntroEs.transcript);
  assert.equal(existingAboutIntroVideoEs.language, 'es');
  assert.equal(existingAboutIntroVideoEs.durationSeconds, 31);
  assert.equal(existingAboutIntroVideoEs.heygenId, '2c251709aba74fd96ae8be43257a080b');
  assert.notEqual(existingAboutIntroVideoEs.heygenId, existingAboutIntroVideo.heygenId);
  assert.notEqual(existingAboutIntroVideoEs.heygenId, existingAboutIntroVideoRu.heygenId);
  assert.equal(existingAboutIntroVideoEs.youtubeId, '');
  const publication = builtInSiteVideoRecords().find(record => record.key === 'about-intro:es');
  assert.equal(publication.published.heygenId, existingAboutIntroVideoEs.heygenId);
  assert.equal(publication.published.language, 'es');
  assert.equal(publication.published.status, 'published');
  const player = source('components/site-video-player.tsx');
  assert.ok(player.includes('video.language !== "es"'));
  // Other videos may use direct links or approved mirrors. Spanish keeps its source.
  for (const text of ['Audio en inglés','Audio en ruso','lang={textLanguage}','psychic-alchemy-es-v1.webp']) assert.ok(player.includes(text), text);
  const media = selectedMedia(player, publication.published);
  assert.equal(media.mirrorId, undefined, 'Spanish About must not inherit an unrelated YouTube mirror');
  assert.equal(media.playbackYouTubeId, '', 'Spanish About keeps its original source');
  assert.equal(media.embedUrl, `https://app.heygen.com/embeds/${existingAboutIntroVideoEs.heygenId}`);
});
test('ES About retains all sections, real translated destinations, form and SEO', () => {
  const page = source('app/es/about/page.tsx'); for (const value of ['about-biography', 'about-testimonials', 'about-review-archive', 'personal-consultation-title', 'about-client-cabinet', 'canonical:', "es: '/es/about'", '/es/books', '/es/homeopathy', '/es/services', '/es/client']) assert.ok(page.includes(value), value);
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
