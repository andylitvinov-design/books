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
  assert.equal(data.largestRscScriptBytes, Buffer.byteLength(rsc, 'utf8'));
  assert.equal(data.parsedFlightChunks, 1);
  assert.equal(data.unreadableFlightChunks, 0);
  assert.equal(data.decodedFlightBytes, Buffer.byteLength('данные', 'utf8'));
  assert.deepEqual(data.rscSizeBands, { under1KiB: 1, from1To4KiB: 0, from4To16KiB: 0, over16KiB: 0 });
  assert.equal(data.htmlExcludingInlineScriptBodiesBytes, data.decodedHtmlBytes - data.inlineScriptBytes);
  assert.ok(data.rscHtmlSharePct > 0 && data.rscHtmlSharePct <= data.inlineScriptSharePct);
  assert.equal(data.inlineScriptCount, 2);
  assert.equal(data.rscScriptCount, 1);
  assert.equal(data.largestInlineScriptBytes, Math.max(Buffer.byteLength(rsc), Buffer.byteLength(ldJson)));
  assert.ok(data.inlineScriptSharePct > 0 && data.inlineScriptSharePct < 100);
});

test('handles documents without scripts and rejects non-HTML inputs', () => {
  const data = analyzePublicHtmlPayload('<!doctype html><main>ok</main>');
  assert.equal(data.inlineScriptCount, 0);
  assert.equal(data.rscInlineBytes, 0);
  assert.equal(data.rscHtmlSharePct, 0);
  assert.equal(data.largestRscScriptBytes, 0);
  assert.equal(data.decodedFlightBytes, 0);
  assert.equal(data.parsedFlightChunks, 0);
  assert.equal(data.unreadableFlightChunks, 0);
  assert.equal(data.htmlExcludingInlineScriptBodiesBytes, data.decodedHtmlBytes);
  assert.equal(data.inlineScriptSharePct, 0);
  assert.throws(() => analyzePublicHtmlPayload(null), TypeError);
});

test('measures escaped Flight payload without storing user-facing text', () => {
  const raw = 'hello ' + String.fromCharCode(10) + 'world · «тест»';
  const serialized = JSON.stringify(raw);
  const script = 'self.__next_f.push([1,' + serialized + ']);';
  const data = analyzePublicHtmlPayload('<script nonce="redacted">' + script + '</script>');
  assert.equal(data.parsedFlightChunks, 1);
  assert.equal(data.decodedFlightBytes, Buffer.byteLength(raw, 'utf8'));
  assert.equal(data.unreadableFlightChunks, 0);
  assert.ok(data.rscInlineBytes >= data.decodedFlightBytes);
  assert.equal(Object.hasOwn(data, 'flightText'), false);
});

test('classifies large RSC chunks without returning their private contents', () => {
  const long = 'x'.repeat(17000);
  const html = '<script>self.__next_f.push([1,' + JSON.stringify(long) + '])</script>';
  const data = analyzePublicHtmlPayload(html);
  assert.equal(data.parsedFlightChunks, 1);
  assert.equal(data.decodedFlightBytes, 17000);
  assert.equal(data.rscSizeBands.over16KiB, 1);
  assert.equal(JSON.stringify(data).includes(long.slice(0, 400)), false);
});
