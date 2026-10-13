#!/usr/bin/env node
// Public-only time-to-first-byte measurement; does not request private URLs,
// send cookies, assert a made-up speed target or equate TTFB with Core Web Vitals.
// Usage: node scripts/measure-hh-public-ttfb.mjs https://holistichouse.vercel.app
import { performance } from 'node:perf_hooks';

const base = new URL(process.argv[2] || 'https://holistichouse.vercel.app');
if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password) {
  throw new Error('Provide an HTTP(S) public site origin');
}

const samples = Number(process.env.TTFB_SAMPLES || '7');
if (!Number.isSafeInteger(samples) || samples < 3 || samples > 20) {
  throw new Error('TTFB_SAMPLES must be an integer from 3 to 20');
}
const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

for (const suffix of ['/?lang=en', '/?lang=ru']) {
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
    await response.arrayBuffer();
    if (!response.ok) throw new Error(`Public page ${url.pathname + url.search} returned HTTP ${response.status}`);
    measurements.push({
      ttfbMs,
      vercelCache: response.headers.get('x-vercel-cache') ?? 'unknown',
      cacheControl: response.headers.get('cache-control') ?? 'unspecified',
    });
  }
  const warm = measurements.slice(1).map(v => v.ttfbMs);
  console.log(JSON.stringify({
    page: url.toString(), firstRequestTtfbMs: measurements[0].ttfbMs,
    warmTtfbMedianMs: Math.round(median(warm)),
    warmTtfbMaximumMs: Math.max(...warm),
    samples: measurements, note: 'Server header latency only; not full browser paint/load time',
  }, null, 2));
}
