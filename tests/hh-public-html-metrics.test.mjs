import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzePublicHtmlPayload } from '../scripts/hh-public-html-metrics.mjs';

test('counts decoded HTML and RSC pushes without double-counting external scripts', () => {
  const rsc = 'self.__next_f.push([1,"данные"]);';
  const ldJson = '{"@context":"https://schema.org"}';
  const html = '<html><head><script src="/app.js"></script><script nonce="a">' + rsc +
    '</script><script type="application/ld+json">' + ldJson + '</script></head><body>Текст</body></html>';
  const data = analyzePublicHtmlPayload(html);
  assert.equal(data.decodedHtmlBytes, Buffer.byteLength(html, 'utf8'));
  assert.equal(data.inlineScriptBytes, Buffer.byteLength(rsc, 'utf8') + Buffer.byteLength(ldJson, 'utf8'));
  assert.equal(data.rscInlineBytes, Buffer.byteLength(rsc, 'utf8'));
  assert.equal(data.inlineScriptCount, 2);
  assert.equal(data.rscScriptCount, 1);
  assert.equal(data.largestInlineScriptBytes, Math.max(Buffer.byteLength(rsc), Buffer.byteLength(ldJson)));
  assert.ok(data.inlineScriptSharePct > 0 && data.inlineScriptSharePct < 100);
});

test('handles documents without scripts and rejects non-HTML inputs', () => {
  const data = analyzePublicHtmlPayload('<!doctype html><main>ok</main>');
  assert.equal(data.inlineScriptCount, 0);
  assert.equal(data.rscInlineBytes, 0);
  assert.equal(data.inlineScriptSharePct, 0);
  assert.throws(() => analyzePublicHtmlPayload(null), TypeError);
});
