// HTML telemetry only: parse public document responses, never private routes.
// Next App Router streams some RSC data through inline script tags. The sizes
// reported here are decoded UTF-8 bytes, not compressed network transfer bytes.

const INLINE_SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const NEXT_RSC_PUSH = /(?:self|globalThis)\.__next_f\.push\s*\(/;

export function analyzePublicHtmlPayload(html) {
  if (typeof html !== 'string') throw new TypeError('HTML response must be a string');
  const decodedHtmlBytes = Buffer.byteLength(html, 'utf8');
  let inlineScriptBytes = 0;
  let inlineScriptCount = 0;
  let rscInlineBytes = 0;
  let rscScriptCount = 0;
  let largestInlineScriptBytes = 0;

  for (const [, attributes, script] of html.matchAll(INLINE_SCRIPT)) {
    if (/(?:^|\s)src\s*=/i.test(attributes)) continue;
    const size = Buffer.byteLength(script, 'utf8');
    inlineScriptBytes += size;
    inlineScriptCount += 1;
    largestInlineScriptBytes = Math.max(largestInlineScriptBytes, size);
    if (NEXT_RSC_PUSH.test(script)) {
      rscInlineBytes += size;
      rscScriptCount += 1;
    }
  }
  return {
    decodedHtmlBytes,
    inlineScriptBytes,
    rscInlineBytes,
    inlineScriptCount,
    rscScriptCount,
    largestInlineScriptBytes,
    inlineScriptSharePct: decodedHtmlBytes ? Math.round((inlineScriptBytes / decodedHtmlBytes) * 1000) / 10 : 0,
  };
}
