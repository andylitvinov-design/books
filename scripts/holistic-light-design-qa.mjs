#!/usr/bin/env node
/**
 * Holistic Light Design Bible: read-only *guest public* DOM/style audit.
 * Reuses the existing safe Playwright capture (no second browser system).
 * Objective checks cannot prove subjective pixel fidelity or user E2E.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { capturePublicPage, parseCaptureArgs } from './capture-public-ui-reference.mjs';

export const DESIGN_CASES = Object.freeze([
  { route: '/ru/meditations', width: 390, browser: 'chromium', variant: 'catalog' },
  { route: '/ru/holistic-support/mandala', width: 390, browser: 'chromium', variant: 'video-studio' },
  { route: '/ru/holistic-support/mobile', width: 390, browser: 'chromium', variant: 'support' },
  { route: '/ru/practice', width: 390, browser: 'chromium', variant: 'practice' },
  { route: '/en/holistic-support/mandala', width: 390, browser: 'chromium', variant: 'video-studio' },
  { route: '/es/holistic-support/mandala', width: 390, browser: 'chromium', variant: 'video-studio' },
  { route: '/ru/holistic-support/mandala', width: 320, browser: 'webkit', variant: 'video-studio' },
]);

const RGB = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/i;
function parseColor(input) {
  const match = typeof input === 'string' && input.match(RGB);
  if (!match) return null;
  const channels = match.slice(1, 4).map(Number);
  if (channels.some(channel => channel > 255)) return null;
  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  if (alpha < 0 || alpha > 1) return null;
  return { channels, alpha };
}
function luminance(rgb) {
  return rgb.channels.reduce((sum, channel, i) => {
    const v = channel / 255;
    const linear = v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    return sum + linear * [.2126, .7152, .0722][i];
  }, 0);
}
export function solidContrast(foreground, background) {
  const fg = parseColor(foreground), bg = parseColor(background);
  // Alpha and gradients need actual rendered-backdrop inspection.
  if (!fg || !bg || fg.alpha !== 1 || bg.alpha !== 1) return null;
  const x = luminance(fg), y = luminance(bg);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
function greenWash(color) {
  const c = parseColor(color);
  if (!c || c.alpha !== 1 || luminance(c) < .62) return false;
  const [r, g, b] = c.channels;
  return g > r + 9 && g > b + 9;
}
const fmt = item => ({
  tag: item.tag, label: String(item.label || '').slice(0, 55),
  width: Math.round(item.box?.w || 0), height: Math.round(item.box?.h || 0),
  y: Math.round(item.box?.y || 0),
});
export function auditDesignSnapshot(snapshot, { route, variant = 'holistic-light', width } = {}) {
  const critical = [], warnings = [];
  const observedRoute = snapshot?.route || snapshot?.pathname;
  const viewport = snapshot?.viewport || {};
  const landmarks = Array.isArray(snapshot?.landmarks) ? snapshot.landmarks : [];
  const expectedWidth = width || viewport.width;
  if (!route || observedRoute !== route || snapshot.pathname !== route) {
    critical.push({ code: 'VIEW_IDENTITY', reason: 'Snapshot route differs from canonical expected public page' });
  }
  if (!Number.isFinite(viewport.width) || viewport.width !== expectedWidth) {
    critical.push({ code: 'VIEWPORT', reason: 'Observed width differs from requested screenshot width' });
  }
  if (!Number.isFinite(viewport.scrollWidth)) {
    critical.push({ code: 'GEOMETRY_MISSING', reason: 'Document scroll width was not measured' });
  } else if (viewport.scrollWidth > viewport.width + 2) {
    critical.push({
      code: 'HORIZONTAL_OVERFLOW',
      reason: 'Document exceeds mobile width by ' + Math.round(viewport.scrollWidth - viewport.width) + 'px',
    });
  }
  const h1s = landmarks.filter(x => x.tag === 'h1');
  if (h1s.length !== 1) warnings.push({
    code: 'H1_COUNT', reason: 'Visible h1 landmarks: ' + h1s.length + ' (check editorial route exceptions)',
  });
  const tappables = landmarks.filter(x => (x.tag === 'button' || x.tag === 'a') && x.box?.w > 0 && x.box?.h > 0);
  const smallTaps = tappables.filter(x => x.box.w < 44 || x.box.h < 44);
  if (smallTaps.length) warnings.push({
    code: 'SMALL_TAP_TARGETS',
    reason: smallTaps.length + ' of ' + tappables.length + ' sampled visible links/buttons under 44x44px',
    examples: smallTaps.slice(0, 8).map(fmt),
  });
  const compactText = landmarks.filter(x => (x.tag === 'h2' || x.tag === 'h1') &&
    Number.parseFloat(x.style?.fontSize || '0') < 22);
  if (compactText.length) warnings.push({
    code: 'SMALL_HEADINGS', reason: compactText.length + ' visible headings under 22px',
    examples: compactText.slice(0, 5).map(fmt),
  });
  const contrastFailures = tappables.filter(x => {
    const contrast = solidContrast(x.style?.color, x.style?.background);
    return contrast !== null && contrast < 4.5 && String(x.label || '').length > 0;
  });
  if (contrastFailures.length) critical.push({
    code: 'SOLID_CONTROL_CONTRAST',
    reason: contrastFailures.length + ' controls with definite solid-text contrast under 4.5:1',
    examples: contrastFailures.slice(0, 5).map(fmt),
  });
  const neutralSurfaces = landmarks.filter(x =>
    (x.tag === 'main' || x.tag === 'section' || x.tag === 'article') &&
    x.box?.w >= expectedWidth * .65 && x.box?.h >= 140);
  const tinted = neutralSurfaces.filter(x => greenWash(x.style?.background));
  if (tinted.length >= 2 && !['my-course-teal', 'business-wood'].includes(variant)) {
    warnings.push({
      code: 'SAGE_GREEN_WASH',
      reason: tinted.length + ' large light surfaces have a green cast; inspect screenshot, do not auto-recolor',
      examples: tinted.slice(0, 5).map(fmt),
    });
  }
  if (Array.isArray(snapshot.pageErrors) && snapshot.pageErrors.length) warnings.push({
    code: 'PUBLIC_PAGE_ERRORS', reason: snapshot.pageErrors.length + ' browser runtime error(s); investigate separately',
    examples: snapshot.pageErrors.slice(0, 3).map(x => String(x).slice(0, 180)),
  });
  if (!tappables.some(x => x.box.y >= -10 && x.box.y < (viewport.height || 844) &&
    x.box.w >= 70 && x.box.h >= 44)) warnings.push({
      code: 'NO_FIRST_SCREEN_ACTION', reason: 'No clear >=44px first-viewport action in sampled DOM; review CTA placement',
    });
  return {
    schema: 'hh.design-bible-qa.v1',
    route, variant, width: expectedWidth,
    evidence: 'isolated public guest DOM/styles; subjective look, pixel fidelity and real E2E require HUMAN REVIEW',
    status: critical.length ? 'CRITICAL' : 'REVIEW_REQUIRED',
    critical, warnings,
    metrics: {
      h1Count: h1s.length,
      sampledControls: tappables.length,
      smallTapTargets: smallTaps.length,
      sampledLargeGreenSurfaces: tinted.length,
      viewportWidth: viewport.width,
      documentScrollWidth: viewport.scrollWidth,
    },
  };
}
const captureName = ({ route, browser, width }) =>
  browser + '-' + width + '-' + route.replaceAll('/', '-').replace(/^-+/, '');
function parseArgs(args) {
  const opts = { origin: 'https://holistichouse.vercel.app', out: 'artifacts/holistic-light-design-qa' };
  for (let i = 0; i < args.length; i++) {
    const [flag, inline] = args[i].split('=', 2);
    if (flag !== '--origin' && flag !== '--out') throw new Error('Only --origin and --out are supported');
    const value = inline ?? args[++i];
    if (!value || value.startsWith('--')) throw new Error('Missing value for ' + flag);
    opts[flag.slice(2)] = value;
  }
  // The existing capture strictly restricts origin and protects private/token pages.
  parseCaptureArgs(['--origin', opts.origin, '--route', DESIGN_CASES[0].route]);
  return opts;
}
export async function runDesignAudit(options) {
  await mkdir(options.out, { recursive: true });
  const reports = [];
  for (const spec of DESIGN_CASES) {
    try {
      const opts = parseCaptureArgs([
        '--origin', options.origin, '--route', spec.route,
        '--width', String(spec.width), '--height', '844',
        '--browser', spec.browser, '--out', options.out,
      ]);
      await capturePublicPage(opts);
      const filename = captureName(spec);
      const snapshot = JSON.parse(await readFile(join(opts.out, filename + '.json'), 'utf8'));
      const audit = auditDesignSnapshot(snapshot, spec);
      await writeFile(join(opts.out, filename + '-design-qa.json'), JSON.stringify(audit, null, 2) + '\n');
      reports.push(audit);
      console.log(audit.status + ' ' + spec.route + ' ' + spec.browser + '/' + spec.width +
        ' critical=' + audit.critical.length + ' advisory=' + audit.warnings.length);
    } catch (error) {
      const audit = {
        schema: 'hh.design-bible-qa.v1', route: spec.route, variant: spec.variant, width: spec.width,
        status: 'CRITICAL', critical: [{ code: 'CAPTURE_FAILED', reason: String(error?.message || error).slice(0, 300) }],
        warnings: [], evidence: 'capture failed; not a design pass',
      };
      reports.push(audit);
      console.error('CAPTURE_FAILED ' + spec.route + ' ' + spec.browser + '/' + spec.width + ': ' +
        audit.critical[0].reason);
    }
  }
  const summary = {
    schema: 'hh.design-bible-qa-batch.v1',
    origin: options.origin,
    generatedAt: new Date().toISOString(),
    publicGuestOnly: true, notAVisualApproval: true,
    examined: reports.length, criticalCases: reports.filter(x => x.critical.length).length,
    warningCases: reports.filter(x => x.warnings.length).length,
    reports,
  };
  await writeFile(join(options.out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  return summary;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await runDesignAudit(parseArgs(process.argv.slice(2)));
    if (result.criticalCases) process.exitCode = 1;
    console.log('Holistic Light QA: ' + result.examined + ' guest captures; ' +
      result.criticalCases + ' critical; ' + result.warningCases + ' advisory. Visual approval requires review.');
  } catch (error) {
    console.error('Design Bible audit failed: ' + error.message);
    process.exitCode = 2;
  }
}
