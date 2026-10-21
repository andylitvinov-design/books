#!/usr/bin/env node
// Public-only time-to-first-byte measurement; does not request private URLs,
// send cookies, assert a made-up speed target or equate TTFB with Core Web Vitals.
// Usage: node scripts/measure-hh-public-ttfb.mjs https://holistichouse.vercel.app
import { performance } from 'node:perf_hooks';
import { analyzePublicHtmlPayload } from './hh-public-html-metrics.mjs';

const base = new URL(process.argv[2] || 'https://holistichouse.vercel.app');
if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password) {
  throw new Error('Provide an HTTP(S) public site origin');
}

const samples = Number(process.env.TTFB_SAMPLES || '7');
if (!Number.isSafeInteger(samples) || samples < 3 || samples > 20) {
  throw new Error('TTFB_SAMPLES must be an integer from 3 to 20');
}
const htmlWarnBytes = 1024 * Number(process.env.HH_HTML_WARN_KIB || '120');
const inlineWarnBytes = 1024 * Number(process.env.HH_INLINE_WARN_KIB || '60');
if (![htmlWarnBytes, inlineWarnBytes].every(v => Number.isSafeInteger(v) && v > 0)) {
  throw new Error('HTML size warning budgets must be positive whole KiB values');
}
const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

// Measure actual canonical documents: legacy /?lang=ru is a 308 redirect.
for (const suffix of ['/', '/ru', '/es']) {
  const url = new URL(suffix, base);
  const measurements = [];
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    const response = await fetch(url, {
      headers: { accept: 'text/html', 'user-agent': 'HolisticHouse-TTFB-Audit/1.0' },
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });
    const ttfbMs = Math.round(performance.now() - start);
    const htmlPayload = analyzePublicHtmlPayload(await response.text());
    if (response.status !== 200) throw new Error(`Canonical public page ${url.pathname} returned HTTP ${response.status}`);
    measurements.push({
      ttfbMs,
      vercelCache: response.headers.get('x-vercel-cache') ?? 'unknown',
      cacheControl: response.headers.get('cache-control') ?? 'unspecified',
      ...htmlPayload,
    });
  }
  const warm = measurements.slice(1).map(v => v.ttfbMs);
  const warmedHtml = measurements.slice(1).map(v => v.decodedHtmlBytes);
  const warmedInline = measurements.slice(1).map(v => v.inlineScriptBytes);
  const warmedRsc = measurements.slice(1).map(v => v.rscInlineBytes);
  const warmedFlight = measurements.slice(1).map(v => v.decodedFlightBytes);
  const warmedHtmlWithoutInlineScripts = measurements.slice(1).map(v => v.htmlExcludingInlineScriptBodiesBytes);
  const medianHtmlBytes = Math.round(median(warmedHtml));
  const medianInlineBytes = Math.round(median(warmedInline));
  const medianRscBytes = Math.round(median(warmedRsc));
  const medianFlightBytes = Math.round(median(warmedFlight));
  const medianMarkupBytes = Math.round(median(warmedHtmlWithoutInlineScripts));
  const budgetWarnings = [];
  if (medianHtmlBytes > htmlWarnBytes) budgetWarnings.push(`decoded HTML above ${htmlWarnBytes} bytes`);
  if (medianInlineBytes > inlineWarnBytes) budgetWarnings.push(`inline scripts above ${inlineWarnBytes} bytes`);
  if (process.env.GITHUB_ACTIONS === 'true') {
    for (const warning of budgetWarnings) console.error(`::warning title=Public HTML payload::${url.pathname}: ${warning}`);
  }
  console.log(JSON.stringify({
    page: url.toString(), firstRequestTtfbMs: measurements[0].ttfbMs,
    warmTtfbMedianMs: Math.round(median(warm)),
    warmTtfbMaximumMs: Math.max(...warm),
    medianDecodedHtmlBytes: medianHtmlBytes,
    medianInlineScriptBytes: medianInlineBytes,
    medianRscInlineBytes: medianRscBytes,
    medianDecodedFlightBytes: medianFlightBytes,
    medianFlightEncodingOverheadBytes: medianRscBytes - medianFlightBytes,
    rscScriptSizeBands: measurements[measurements.length - 1].rscSizeBands,
    flightChunksParsed: measurements[measurements.length - 1].parsedFlightChunks,
    medianHtmlExcludingInlineScriptBodiesBytes: medianMarkupBytes,
    medianRscHtmlSharePct: Math.round((medianRscBytes / medianHtmlBytes) * 1000) / 10,
    htmlWarnBytes, inlineWarnBytes, budgetWarnings,
    samples: measurements,
    note: 'TTFB is header latency only. HTML size is decoded UTF-8, not compressed transfer bytes. Next RSC scripts include JavaScript escaping/overhead; decoded Flight counts only confidently parsed [1, string] chunks, and is not a full semantic component attribution. No Flight content is logged. Not a browser LCP measurement.',
  }, null, 2));
}
