// HTML telemetry only: parse public document responses, never private routes.
// Next App Router streams some RSC data through inline script tags. The sizes
// reported here are decoded UTF-8 bytes, not compressed network transfer bytes.

const INLINE_SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const NEXT_RSC_PUSH = /(?:self|globalThis)\.__next_f\.push\s*\(/;
// Extract only the safely JSON-encoded Flight text; never log its contents.
// The real decoded Flight size separates data growth from JS-string escaping overhead.
const NEXT_FLIGHT_TEXT = /(?:self|globalThis)\.__next_f\.push\(\s*\[\s*1\s*,\s*("(?:\\.|[^"\\])*")\s*\]\s*\)/g;

// Public component markers only: the profiler never returns Flight strings,
// HTML, user text, video metadata, request headers or server-side identifiers.
// Presence within a Flight chunk is approximate, NOT exact component ownership.
const PUBLIC_RSC_MARKERS = Object.freeze({
  carousel: "data-home-section-carousel",
  freeDiagnosis: "data-home-free-diagnosis-banner",
  conversationGuide: "data-home-conversation-guide",
  featuredWorkspace: "data-home-featured-workspace",
  personalSpace: "data-home-personal-space",
  testimonials: "data-personal-testimonials",
  moreDisclosure: "data-home-more-deferred",
  introVideo: "data-video-slot",
});

export function analyzePublicHtmlPayload(html) {
  if (typeof html !== 'string') throw new TypeError('HTML response must be a string');
  const decodedHtmlBytes = Buffer.byteLength(html, 'utf8');
  let inlineScriptBytes = 0;
  let inlineScriptCount = 0;
  let rscInlineBytes = 0;
  let rscScriptCount = 0;
  let largestInlineScriptBytes = 0;
  let largestRscScriptBytes = 0;
  let decodedFlightBytes = 0;
  let parsedFlightChunks = 0;
  let unreadableFlightChunks = 0;
  const rscSizeBands = { under1KiB: 0, from1To4KiB: 0, from4To16KiB: 0, over16KiB: 0 };
  const rscMarkerOnlyBytes = Object.fromEntries(Object.keys(PUBLIC_RSC_MARKERS).map(key => [key, 0]));
  const rscMarkerChunkCounts = Object.fromEntries(Object.keys(PUBLIC_RSC_MARKERS).map(key => [key, 0]));
  let rscMultiMarkerBytes = 0;
  let rscUnclassifiedFlightBytes = 0;
  const rscLargestFlightChunks = [];

  for (const [, attributes, script] of html.matchAll(INLINE_SCRIPT)) {
    if (/(?:^|\s)src\s*=/i.test(attributes)) continue;
    const size = Buffer.byteLength(script, 'utf8');
    inlineScriptBytes += size;
    inlineScriptCount += 1;
    largestInlineScriptBytes = Math.max(largestInlineScriptBytes, size);
    if (NEXT_RSC_PUSH.test(script)) {
      rscInlineBytes += size;
      rscScriptCount += 1;
      largestRscScriptBytes = Math.max(largestRscScriptBytes, size);
      if (size < 1024) rscSizeBands.under1KiB++;
      else if (size < 4096) rscSizeBands.from1To4KiB++;
      else if (size < 16384) rscSizeBands.from4To16KiB++;
      else rscSizeBands.over16KiB++;
      for (const [, serialized] of script.matchAll(NEXT_FLIGHT_TEXT)) {
        try {
          const flightText = JSON.parse(serialized);
          const flightBytes = Buffer.byteLength(flightText, 'utf8');
          decodedFlightBytes += flightBytes;
          parsedFlightChunks++;
          const publicMarkers = Object.entries(PUBLIC_RSC_MARKERS)
            .filter(([, marker]) => flightText.includes(marker))
            .map(([name]) => name);
          for (const marker of publicMarkers) rscMarkerChunkCounts[marker]++;
          if (publicMarkers.length === 1) rscMarkerOnlyBytes[publicMarkers[0]] += flightBytes;
          else if (publicMarkers.length > 1) rscMultiMarkerBytes += flightBytes;
          else rscUnclassifiedFlightBytes += flightBytes;
          // Only allowlisted marker names, sizes and stable ordinal are recorded.
          // Never persist a Flight fragment or substring, even in CI artifacts.
          rscLargestFlightChunks.push({ ordinal: parsedFlightChunks, bytes: flightBytes, publicMarkers });
          rscLargestFlightChunks.sort((a, b) => b.bytes - a.bytes || a.ordinal - b.ordinal);
          if (rscLargestFlightChunks.length > 5) rscLargestFlightChunks.pop();
        } catch { unreadableFlightChunks++; }
      }
    }
  }
  return {
    decodedHtmlBytes,
    inlineScriptBytes,
    rscInlineBytes,
    inlineScriptCount,
    rscScriptCount,
    largestInlineScriptBytes,
    largestRscScriptBytes,
    decodedFlightBytes,
    parsedFlightChunks,
    unreadableFlightChunks,
    rscSizeBands,
    rscMarkerOnlyBytes,
    rscMarkerChunkCounts,
    rscMultiMarkerBytes,
    rscUnclassifiedFlightBytes,
    rscLargestFlightChunks,
    // Inline script body bytes are already included in the decoded HTML total.
    // Excluding those bodies separates HTML markup from hydration/LD-JSON cost.
    htmlExcludingInlineScriptBodiesBytes: decodedHtmlBytes - inlineScriptBytes,
    rscHtmlSharePct: decodedHtmlBytes ? Math.round((rscInlineBytes / decodedHtmlBytes) * 1000) / 10 : 0,
    inlineScriptSharePct: decodedHtmlBytes ? Math.round((inlineScriptBytes / decodedHtmlBytes) * 1000) / 10 : 0,
  };
}
