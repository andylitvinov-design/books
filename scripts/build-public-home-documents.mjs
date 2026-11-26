import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import Beasties from 'beasties';
import { parse, serialize } from 'parse5';

const locales = { en: '/', ru: '/ru', es: '/es' };
const digest = source => 'sha256-' + createHash('sha256').update(source).digest('base64');
// Apply the full cascade in one frame, not once per arriving stylesheet.
// A failed sheet must not strand the remaining styles in print mode.
const restoreStyles = "addEventListener('DOMContentLoaded',()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{const links=[...document.querySelectorAll('link[data-home-full-style]')];const activate=()=>links.forEach(link=>{link.media='all'});Promise.all(links.map(link=>new Promise(resolve=>{if(link.sheet){resolve();return}link.addEventListener('load',resolve,{once:true});link.addEventListener('error',resolve,{once:true});if(link.sheet)resolve()}))).then(activate);setTimeout(activate,2500)})),{once:true});";

function* descendants(root) {
  yield root;
  for (const child of root.childNodes ?? []) yield* descendants(child);
  if (root.content) yield* descendants(root.content);
}

// Only the disposable extraction input is narrowed. The actual React HTML,
// attributes, below-fold sections and complete stylesheets remain untouched.
// Keep each lower section's outer box for layout/sibling selector matching;
// do not remove a nested stylesheet or style element from the extraction input.
function firstScreenCssInput(source) {
  const document = parse(source);
  // Keep original inline styles in the real response only. The extractor is
  // for external sheets: copying existing style elements would duplicate CSS
  // and potentially move their cascade position. They are not DOM targets.
  for (const node of [...descendants(document)]) {
    if (node.tagName === 'style' && node.parentNode) {
      node.parentNode.childNodes = node.parentNode.childNodes.filter(child => child !== node);
    }
  }
  const belowFoldClasses = new Set(['service-home-about', 'service-home-library', 'service-home-footer']);
  for (const node of [...descendants(document)]) {
    const attrs = Object.fromEntries((node.attrs ?? []).map(({name, value}) => [name, value]));
    const isBelowFold = (attrs.class || '').split(/\s+/).some(name => belowFoldClasses.has(name)) ||
      'data-home-video-below-fold' in attrs || 'data-home-deferred-sections' in attrs;
    // Hidden React stream containers, inert templates and closed disclosure
    // contents are not part of the initial paint. Keep the visible summary
    // and outer container, and leave their real markup and full CSS intact.
    const isHidden = 'hidden' in attrs || node.tagName === 'template';
    if (node.tagName === 'details' && !('open' in attrs)) {
      const children = node.childNodes ?? [];
      if (!children.some(child => [...descendants(child)].some(n => n.tagName === 'link' || n.tagName === 'style'))) {
        node.childNodes = children.filter(child => child.tagName === 'summary');
      }
    }
    if ((!isBelowFold && !isHidden) || !node.childNodes?.length) continue;
    if ([...descendants(node)].some(child => child.tagName === 'style' || child.tagName === 'link')) continue;
    node.childNodes = [];
  }
  return serialize(document);
}

function localAsset(href, kind, origin) {
  const url = new URL(href, origin);
  const prefix = kind === 'css' ? '/_next/static/css/' : '/_next/static/chunks/';
  const path = decodeURIComponent(url.pathname);
  if (url.origin !== origin || !path.startsWith(prefix) || !path.endsWith('.' + kind) ||
      path.includes('..') || !/^\/_next\/static\/[\w./+\[\]-]+$/.test(path)) {
    throw new Error('Unexpected public build asset ' + href);
  }
  return path;
}

// Capture only renderer-authorized scripts. Keep the original markup, including
// React's stream comments and Flight data. The CSS extractor sees a disposable copy.
export async function compilePublicDocument({ source, csp, origin, buildDir, buildId, locale }) {
  const nonce = csp?.match(/(?:^|;\s*)script-src\s+[^;]*?'nonce-([a-f0-9]{32})'/)?.[1];
  if (!nonce || !csp.includes("'strict-dynamic'")) throw new Error('Expected the strict renderer policy');
  const normalized = source.replaceAll(nonce, '');
  const cssInputEdits = [];
  const edits = [];
  const hashes = new Set([digest(restoreStyles)]);
  let styles = 0;
  let firstStylesheet;
  let portrait;
  let documentLocale;
  let foundHome = false;
  let foundHeading = false;
  for (const node of descendants(parse(source, { sourceCodeLocationInfo: true }))) {
    const attrs = Object.fromEntries((node.attrs ?? []).map(({name, value}) => [name, value]));
    const loc = node.sourceCodeLocation;
    if (node.tagName === 'html') documentLocale = attrs.lang;
    if (node.tagName === 'template' && 'data-dgst' in attrs) throw new Error('The renderer returned a failed React boundary');
    if (node.tagName === 'section' && 'data-home-dialogue-entry' in attrs) foundHome = true;
    if (node.tagName === 'h1') {
      if (foundHeading) throw new Error('Expected the public homepage heading');
      foundHeading = true;
    }
    if (node.tagName === 'script') {
      if (attrs.nonce !== nonce) throw new Error('Unexpected script outside the server nonce policy');
      if (attrs.src) {
        const path = localAsset(attrs.src, 'js', origin);
        const integrity = digest(await readFile(resolve(buildDir, path.slice('/_next/'.length))));
        hashes.add(integrity);
        edits.push([loc.startTag.endOffset - 1, loc.startTag.endOffset - 1, ' integrity="' + integrity + '"']);
      } else if (attrs.type !== 'application/ld+json') {
        hashes.add(digest(source.slice(loc.startTag.endOffset, loc.endTag.startOffset).replaceAll(nonce, '')));
      }
    }
    if (node.tagName !== 'link') continue;
    if (attrs.rel === 'preload' && attrs.as === 'image' && attrs.fetchpriority === 'high' &&
        /^\/images\/holistic-house\/[\w.-]+\.(?:webp|avif|png|jpg)$/.test(attrs.href)) portrait ??= attrs.href;
    if (attrs.rel === 'preload' && attrs.as === 'script') {
      // The same script is already in this head with its integrity attribute.
      edits.push([loc.startOffset, loc.endOffset, '']);
    }
    if (attrs.rel !== 'stylesheet') continue;
    firstStylesheet ??= loc.startOffset;
    const path = localAsset(attrs.href, 'css', origin);
    await access(resolve(buildDir, path.slice('/_next/'.length)));
    const originalTag = source.slice(loc.startOffset, loc.endOffset);
    // Preserve cascade order and offer the full stylesheet without JavaScript.
    edits.push([loc.startOffset, loc.endOffset, originalTag.replace('<link ', '<link media="print" fetchpriority="low" data-home-full-style="" ') + '<noscript>' + originalTag + '</noscript>']);
    const href = loc.attrs.href;
    cssInputEdits.push([href.startOffset, href.endOffset, 'href="' + path + '"']);
    styles++;
  }
  if (!Object.hasOwn(locales, locale) || documentLocale !== locale || !foundHome || !foundHeading || !styles || !source.includes('</head>') || normalized.includes(origin)) {
    throw new Error('Source is not the public production home document');
  }
  const cssParser = new Beasties({path: buildDir, publicPath: '/_next/', preload: false, pruneSource: false, reduceInlineStyles: false, logLevel: 'silent'});
  const forCss = firstScreenCssInput(applyEdits(source, cssInputEdits));
  const annotated = await cssParser.process(forCss);
  const css = [...descendants(parse(annotated))].filter(n => n.tagName === 'style').map(n => n.childNodes?.[0]?.value ?? '').join('\n');
  if (!css || /<\/style/i.test(css)) throw new Error('Invalid inline homepage styles');
  console.info('[home-critical-css] ' + locale + ': ' + Buffer.byteLength(css) + ' decoded bytes; ' + gzipSync(css, {level: 9}).length + ' gzip bytes');
  const headEnd = source.indexOf('</head>');
  // Put critical rules before every original sheet, so later state changes
  // always obey the full production cascade.
  edits.push([firstStylesheet, firstStylesheet, '<style>' + css + '</style>']);
  edits.push([headEnd, headEnd, '<script>' + restoreStyles + '</script>']);
  const policy = csp.replace("'nonce-" + nonce + "'", [...hashes].map(h => "'" + h + "'").join(' '));
  if (policy.includes(nonce) || policy.length > 12_000) throw new Error('Invalid static script policy');
  const html = applyEdits(source, edits).replaceAll(nonce, '');
  const gzip = gzipSync(html, {level: 9}).toString('base64');
  return { buildId, portrait, html, gzip, policy };
}

function applyEdits(source, edits) {
  let output = source;
  for (const [start, end, value] of edits.sort((a, b) => b[0] - a[0] || b[1] - a[1])) {
    output = output.slice(0, start) + value + output.slice(end);
  }
  return output;
}

async function prepare() {
  const directory = resolve('.home-documents');
  await mkdir(directory, {recursive: true});
  // The Next/Vercel tracer must see the exact files before the framework build.
  for (const lang of Object.keys(locales)) await writeFile(resolve(directory, lang + '.json'), 'null');
  await writeFile(resolve(directory, 'build-id'), randomUUID());
}

async function build() {
  const directory = resolve('.home-documents');
  const buildId = (await readFile(resolve(directory, 'build-id'), 'utf8')).trim();
  if ((await readFile('.next/BUILD_ID', 'utf8')).trim() !== buildId) throw new Error('Public homepage build ID mismatch');
  process.env.NODE_ENV ??= 'production';
  const {default: next} = await import('next');
  const serverApp = next({dev: false, hostname: '127.0.0.1'});
  await serverApp.prepare();
  const server = createServer(serverApp.getRequestHandler());
  try {
    await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
    const origin = 'http://127.0.0.1:' + server.address().port;
    for (const [lang, path] of Object.entries(locales)) {
      const res = await fetch(origin + path, {headers: { accept: 'text/html', 'x-hh-render-public-home': '1' }, redirect: 'error', signal: AbortSignal.timeout(30_000)});
      if (res.status !== 200 || res.headers.has('set-cookie') || !res.headers.get('content-type')?.includes('text/html')) throw new Error('Invalid guest response for ' + path);
      const document = await compilePublicDocument({source: await res.text(), csp: res.headers.get('content-security-policy'), origin, buildDir: resolve('.next'), buildId, locale: lang});
      const target = resolve(directory, lang + '.json');
      await writeFile(target + '.tmp', JSON.stringify(document));
      await rename(target + '.tmp', target);
    }
  } finally {
    await new Promise(done => server.close(done));
    await serverApp.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const run = process.argv.includes('--prepare') ? prepare : build;
  run().catch(error => { console.error(error); process.exitCode = 1; });
}
