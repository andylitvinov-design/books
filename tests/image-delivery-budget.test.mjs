import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const manifest = JSON.parse(readFileSync('data/academy/reiki-photo-assets.json', 'utf8'));
const source = readFileSync('lib/academy/reiki-photo.ts', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
const compiledModule = { exports: {} };
new Function('require', 'module', 'exports', code)(name => name.endsWith('reiki-photo-assets.json') ? manifest : require(name), compiledModule, compiledModule.exports);
const { reikiPhotoUrl } = compiledModule.exports;

test('all 36 reachable source photographs resolve to static same-origin originals', () => {
  assert.equal(manifest.assets.length, 36);
  assert.equal(new Set(manifest.assets.map(x => x.source)).size, 36);
  for (const a of manifest.assets) {
    assert.match(a.path, /^\/(?:images\/reiki-originals|academy\/reiki-yggdrasil\/source)\//);
    assert.equal(reikiPhotoUrl(a.source), a.path);
    assert.equal(reikiPhotoUrl(a.source.replace('https://', 'https://www.'), 640), a.path);
    assert.equal(reikiPhotoUrl(new URL(a.source).href, 1200), a.path);
  }
});

test('new original copies are byte-identical and bounded', () => {
  const files = manifest.assets.filter(x => !x.existingAsset);
  assert.equal(files.length, 26);
  assert.equal(files.reduce((n,x) => n+x.bytes,0), 2523291);
  for (const a of files) {
    const b = readFileSync('public'+a.path);
    assert.equal(b.length, a.bytes);
    assert.equal(createHash('sha256').update(b).digest('hex'), a.sha256);
    assert.ok(a.width > 0 && a.height > 0);
    assert.ok(a.bytes <= 202672);
    assert.equal(a.originalBytesPreserved,true);
  }
});

test('unmapped PsiTrends sources fail visibly instead of reintroducing a proxy or hotlink', () => {
  assert.throws(() => reikiPhotoUrl('https://psitrends.com/images/not-in-manifest.jpg'), /Missing verified/);
  assert.throws(() => reikiPhotoUrl(manifest.assets[0].source+'?changed=1'), /Missing verified/);
  for (const src of ['/images/unchanged.webp', 'https://i.ytimg.com/vi/id/default.jpg', 'https://psitrends.com.evil.example/images/test.jpg']) assert.equal(reikiPhotoUrl(src),src);
  assert.doesNotMatch(source, /\/_next\/image|\/_vercel\/image|fetch\(/);
});

test('global optimizer remains enabled for existing book redirects', () => {
  const config = readFileSync('next.config.ts','utf8');
  assert.doesNotMatch(config,/images:\s*\{\s*unoptimized:\s*true/);
  assert.ok(readFileSync('components/book-catalog.tsx','utf8').includes('bookCoverArtworkUrl(book.id, "/media/" + book.mediaSeries'));
  const catalog = readFileSync('components/book-catalog.tsx', 'utf8');
  assert.match(catalog, /<Image\s+unoptimized\s+alt=[\s\S]*?src="\/images\/holistic-house\/books-library\.webp"/);
  const covers = catalog.split('visibleBooks.map((book, index) =>')[1];
  assert.ok(covers, 'Keep dynamic book cover loop');
  assert.match(covers, /unoptimized=\{hasBookCoverArtwork\(book\.id\)\}/, 'Only pinned prebuilt book covers bypass runtime transforms');
  assert.match(config,/hostname: "psitrends.com", pathname: "\/images\/\*\*"/);
  assert.match(config,/outputFileTracingIncludes/);
});

test('Next image rendering preserves layout and avoids optimizer src/srcset', () => {
  const { getImageProps } = require('next/image');
  for (const src of ['/images/holistic-house/andy-about.png', ...manifest.assets.map(x=>x.path)]) {
    const { props } = getImageProps({src,width:640,height:480,alt:'Original course photograph',unoptimized:true,loading:'lazy'});
    assert.equal(props.src,src);assert.equal(props.srcSet,undefined);
    assert.equal(props.width,640);assert.equal(props.height,480);assert.equal(props.alt,'Original course photograph');assert.equal(props.loading,'lazy');
  }
});

test('existing local mappings have exact tracked bytes when materialized', () => {
  for(const a of manifest.assets.filter(x=>x.existingAsset)) {
    assert.ok(existsSync('public'+a.path), 'Missing existing source asset '+a.path);
    const b=readFileSync('public'+a.path);
    assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),a.gitBlobSha);
  }
});
