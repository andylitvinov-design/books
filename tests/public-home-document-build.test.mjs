import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import test from 'node:test';
import { compilePublicDocument } from '../scripts/build-public-home-documents.mjs';

const nonce = 'a'.repeat(32);
const csp = "default-src 'self'; script-src 'self' 'nonce-" + nonce + "' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
const source = '<!DOCTYPE html><html lang="en"><head>' +
  '<link rel="preload" as="image" fetchpriority="high" href="/images/holistic-house/hero.webp">' +
  '<link rel="stylesheet" href="/_next/static/css/home.css?dpl=fixture">' +
  '<script src="/_next/static/chunks/app.js" nonce="' + nonce + '" async></script>' +
  '</head><body><section data-home-dialogue-entry><h1 class="mast">Home</h1></section>' +
  '<script nonce="' + nonce + '">self.initial="' + nonce + '"</script></body></html>';
const hash = bytes => 'sha256-' + createHash('sha256').update(bytes).digest('base64');

test('the build pins only authorized scripts, preserves the public React document and defers complete styles', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'public-home-'));
  try {
    await mkdir(join(dir, 'static/css'), {recursive: true});
    await mkdir(join(dir, 'static/chunks'), {recursive: true});
    await writeFile(join(dir, 'static/css/home.css'), '.mast{color:green}.admin-editor{color:red}');
    await writeFile(join(dir, 'static/chunks/app.js'), 'self.started=true');
    const options = {source, csp, locale: 'en', origin: 'http://127.0.0.1:8765', buildDir: dir, buildId: 'exact-build'};
    const result = await compilePublicDocument(options);
    assert.equal(result.buildId, 'exact-build');
    assert.equal(gunzipSync(Buffer.from(result.gzip, 'base64')).toString(), result.html);
    assert.equal(result.portrait, '/images/holistic-house/hero.webp');
    assert.ok(result.html.includes('integrity="' + hash('self.started=true') + '"'));
    assert.ok(result.policy.includes("'" + hash('self.initial=""') + "'"));
    assert.ok(result.policy.includes("object-src 'none'; base-uri 'none'; frame-ancestors 'none'"));
    assert.ok(!result.html.includes(nonce) && !result.policy.includes(nonce));
    assert.match(result.html, /<style>[^<]*\.mast\{/);
    assert.doesNotMatch(result.html, /\.admin-editor/);
    assert.match(result.html, /<noscript><link rel="stylesheet"/);
    assert.match(result.html, /data-home-full-style/);
    await assert.rejects(compilePublicDocument({...options, locale: 'es'}), /public production home/);
    await assert.rejects(compilePublicDocument({...options, source: source.replace('</body>', '<template data-dgst="fixture"></template></body>')}), /failed React boundary/);
    await assert.rejects(compilePublicDocument({...options, source: source.replace('</head>', '<link rel="stylesheet" href="/_next/static/css/missing.css"></head>')}), /ENOENT/);
    await assert.rejects(compilePublicDocument({...options, source: source.replace('<script nonce=', '<script data-untrusted=')}), /outside the server nonce policy/);
    await assert.rejects(compilePublicDocument({...options, source: source.replace('/_next/static/chunks/app.js', '/api/client')}), /Unexpected public build asset/);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
});
