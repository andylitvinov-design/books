import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { auditPublicSeoHtml, auditLiveSeo, auditLiveSitemap, auditLiveRobots, isPrivateSeoPath, parsePublicSeoHtml } from '../scripts/verify-seo.mjs';
import { getPrioritySitemapEntries } from '../data/seo-priority-paths.js';
import { getRobotsPolicy } from '../data/seo.js';

const origin = 'https://holistichouse.vercel.app';
const entries = getPrioritySitemapEntries(origin);
function fixture(entry = entries[0]) {
  return `<!doctype html><html><head><title>Public ${entry.url} &amp; practice</title>
  <meta content='A useful public description.' name='description'>
  <link href="${entry.url}" rel="canonical">
  ${Object.entries(entry.alternates.languages).map(([locale, href]) => `<link rel=alternate hreflang='${locale}' href="${href}">`).join('\n')}
  <script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [{ '@type': 'WebSite' }, { '@type': 'WebPage' }, { '@type': 'BreadcrumbList' }] })}</script>
  </head><body><h1>Useful <span>public</span> page</h1></body></html>`;
}
const sitemap = () => `<urlset>${entries.map((entry) => `<url><loc>${entry.url}</loc>${Object.entries(entry.alternates.languages).map(([locale, href]) => `<xhtml:link rel="alternate" hreflang="${locale}" href="${href}"/>`).join('')}</url>`).join('')}</urlset>`;
const robots = () => `User-agent: *\nAllow: /\n${getRobotsPolicy(origin).rules.disallow.map((path) => 'Disallow: ' + path).join('\n')}\nSitemap: ${origin}/sitemap.xml\n`;
const audit = (html, extras = {}, entry = entries[0]) => auditPublicSeoHtml({ html, url: entry.url, languages: entry.alternates.languages, ...extras });
function mockFetch(overrides = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (overrides[url]) return overrides[url];
    if (url === origin + '/sitemap.xml') return new Response(sitemap(), { headers: { 'content-type': 'application/xml' } });
    if (url === origin + '/robots.txt') return new Response(robots(), { headers: { 'content-type': 'text/plain' } });
    const entry = entries.find((item) => item.url === url);
    assert.ok(entry, 'Only expected public paths may be read');
    return new Response(fixture(entry), { headers: { 'content-type': 'text/html; charset=utf-8' } });
  };
  return { calls, fetchImpl };
}

test('synthetic fixtures: all 15 public locale HTML contracts pass', () => {
  for (const entry of entries) assert.deepEqual(audit(fixture(entry), {}, entry).failures, []);
});
test('metadata reader ignores script payloads/comments and handles attributes/entities', () => {
  const extra = `<script>const x = '<title>fake</title><link rel="canonical" href="https://evil.invalid"><h1>fake</h1>';</script><!-- <h1>fake</h1> -->`;
  const parsed = parsePublicSeoHtml(fixture().replace('</body>', extra + '</body>'));
  assert.equal(parsed.h1[0], 'Useful public page');
  assert.equal(parsed.titles.length, 1);
  assert.match(parsed.titles[0], / & practice$/);
  assert.equal(parsed.canonical.length, 1);
  assert.equal(audit(fixture().replace('</body>', extra + '</body>')).ok, true);
});
for (const [name, transform, expected] of [
  ['missing canonical', (s) => s.replace(/<link href="[^"]+" rel="canonical">/, ''), /self-canonical/],
  ['relative canonical', (s) => s.replace(`href="${entries[0].url}" rel="canonical"`, 'href="/en/about" rel="canonical"'), /self-canonical/],
  ['duplicate canonical', (s) => s.replace('</head>', `<link rel=canonical href="${entries[0].url}"></head>`), /self-canonical/],
  ['missing language', (s) => s.replace(/<link rel=alternate hreflang='es'[^>]*>/, ''), /es hreflang/],
  ['wrong language target', (s) => s.replace("hreflang='es'", "hreflang='ru'"), /hreflang/],
  ['wrong x-default', (s) => s.replace('</head>', '<link rel=alternate hreflang=x-default href="https://example.com/"></head>'), /x-default/],
  ['missing title', (s) => s.replace(/<title>.*?<\/title>/, ''), /titles/],
  ['empty description', (s) => s.replace('A useful public description.', ' '), /descriptions/],
  ['duplicate heading', (s) => s.replace('</body>', '<h1>Other</h1></body>'), /h1/],
  ['soft 404', (s) => s.replace('Useful <span>public</span> page', 'Page not found'), /soft 404/],
  ['meta noindex', (s) => s.replace('</head>', '<meta name=robots content="noindex, follow"></head>'), /noindex/],
  ['Googlebot none', (s) => s.replace('</head>', '<meta name=googlebot content=none></head>'), /noindex/],
  ['broken JSON-LD', (s) => s.replace('"@context":', 'BROKEN:'), /Invalid JSON-LD/],
  ['missing WebSite', (s) => s.replace('WebSite', 'Thing'), /WebSite/],
]) test(`synthetic fixture rejects ${name}`, () => {
  const report = audit(transform(fixture()));
  assert.equal(report.ok, false);
  assert.match(report.failures.join('\n'), expected);
});
test('quoted greater-than attributes cannot hide noindex or canonical tags', () => {
  const html = fixture().replace('</head>', '<meta data-note="x > y" name="robots" content="noindex"></head>');
  assert.equal(audit(html).ok, false);
  assert.equal(audit(fixture().replace('rel="canonical"', 'data-note="x > y" rel="canonical"')).ok, true);
});
test('inert template metadata and JSON-LD cannot satisfy public HTML contracts', () => {
  assert.equal(audit('<template>' + fixture() + '</template>').ok, false);
  assert.equal(audit('<template><template>' + fixture() + '</template></template>').ok, false);
  assert.equal(audit(fixture().replace('</body>', '<template><meta name=robots content=noindex><h1>fake</h1></template></body>')).ok, true);
});
test('script template strings do not create inert markup boundaries', () => {
  assert.equal(audit(fixture().replace('</head>', '<script>const value = "<template>";</script></head>')).ok, true);
});
test('encoded private sitemap paths fail closed', () => {
  assert.equal(isPrivateSeoPath('/en/%63lient/example'), true);
  assert.throws(() => auditLiveSitemap(sitemap().replace('</urlset>', `<url><loc>${origin}/en/%63lient/example</loc></url></urlset>`), origin), /Private URL/);
});
test('HTTP X-Robots-Tag noindex is rejected', () => assert.equal(audit(fixture(), { xRobotsTag: 'googlebot: noindex' }).ok, false));
test('Tantra keeps its page and breadcrumb schema requirements', () => {
  const entry = entries.find((item) => item.url.includes('tantra-reiki'));
  assert.match(audit(fixture(entry).replace('BreadcrumbList', 'Thing'), {}, entry).failures.join('\n'), /BreadcrumbList/);
});
test('synthetic sitemap validates paired hreflang attributes, not detached string presence', () => {
  assert.equal(auditLiveSitemap(sitemap(), origin).priorityUrls, 15);
  assert.throws(() => auditLiveSitemap(sitemap().replace('hreflang="en"', 'hreflang="ru"'), origin), /alternate/);
});
test('all root/localized private families remain excluded', () => {
  for (const prefix of ['', '/en', '/ru', '/es']) {
    for (const route of ['api', 'admin', 'app', 'client', 'report', 'documents', 'prescriptions', 'document-preview']) {
      assert.equal(isPrivateSeoPath(`${prefix}/${route}/example`), true);
      assert.throws(() => auditLiveSitemap(sitemap().replace('</urlset>', `<url><loc>${origin}${prefix}/${route}/example</loc></url></urlset>`), origin), /Private URL/);
    }
  }
  assert.equal(isPrivateSeoPath('/en/services/free-situation-review'), false);
});
test('sitemap rejects duplicate loc, unexpected origins and query URLs', () => {
  assert.throws(() => auditLiveSitemap(sitemap().replace('</urlset>', `<url><loc>${entries[0].url}</loc></url></urlset>`), origin), /Duplicate/);
  assert.throws(() => auditLiveSitemap(sitemap().replace(entries[0].url, 'https://example.com/en/about'), origin), /origin/);
  assert.throws(() => auditLiveSitemap(sitemap().replace(entries[0].url, entries[0].url + '?filter=a'), origin), /Query/);
});
test('robots checks wildcard private protections and sitemap declaration', () => {
  assert.equal(auditLiveRobots(robots(), origin).ok, true);
  assert.throws(() => auditLiveRobots(robots().replace('User-agent: *', 'User-agent: OtherBot'), origin), /wildcard/);
  assert.throws(() => auditLiveRobots(robots().replace('Disallow: /ru/report', 'Disallow: /ru/other'), origin), /private robots/);
  assert.throws(() => auditLiveRobots(robots() + '\nDisallow: /\n', origin), /Public website blocked/);
  assert.throws(() => auditLiveRobots(robots().replace('Sitemap:', 'Other:'), origin), /sitemap declaration/);
});
test('effective robots policy rejects public blocks and private Allow overrides', () => {
  assert.throws(() => auditLiveRobots(robots() + '\nDisallow: /en\n', origin), /Public priority path blocked/);
  assert.throws(() => auditLiveRobots(robots() + '\nUser-agent: Googlebot\nDisallow: /\n', origin), /Public priority path blocked/);
  assert.throws(() => auditLiveRobots(robots() + '\nAllow: /en/client/\n', origin), /Private robots protection overridden/);
  assert.throws(() => auditLiveRobots(robots() + '\nDisallow: /en/academy/*/free-initiation$\n', origin), /Public priority path blocked/);
  assert.throws(() => auditLiveRobots(robots() + '\nUser-agent: Bingbot\nAllow: /\n', origin), /Private robots protection overridden/);
});
test('robots honors longest-path specificity and Allow tie precedence', () => {
  const priority = entries.filter((entry) => new URL(entry.url).pathname.startsWith('/en/')).map((entry) => 'Allow: ' + new URL(entry.url).pathname + '$').join('\n');
  assert.equal(auditLiveRobots(robots() + '\nDisallow: /en/\n' + priority, origin).ok, true);
  assert.throws(() => auditLiveRobots(robots() + '\nAllow: /en/client\n', origin), /Private robots protection overridden/);
});
test('mocked live flow GETs exactly 15 pages plus sitemap/robots without redirects', async () => {
  const mock = mockFetch();
  const report = await auditLiveSeo(origin, mock);
  assert.equal(report.pages.length, 15);
  assert.equal(mock.calls.length, 17);
  for (const { options } of mock.calls) {
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'manual');
    assert.ok(options.signal instanceof AbortSignal);
  }
});
test('access denial stops immediately: no retry, alternate route or private read', async () => {
  const mock = mockFetch({ [origin + '/sitemap.xml']: new Response('Forbidden', { status: 403 }) });
  await assert.rejects(auditLiveSeo(origin, mock), /Public read failed \(403\)/);
  assert.deepEqual(mock.calls.map((item) => item.url), [origin + '/sitemap.xml']);
});
test('network denial is propagated without retry', async () => {
  let calls = 0;
  await assert.rejects(auditLiveSeo(origin, { fetchImpl: async () => { calls++; throw new Error('Tunnel connection failed: 403 Forbidden'); } }), /403 Forbidden/);
  assert.equal(calls, 1);
});
test('redirects and non-HTML responses fail rather than passing page status', async () => {
  for (const response of [new Response('', { status: 307, headers: { location: '/login' } }), new Response('{}', { headers: { 'content-type': 'application/json' } })]) {
    const mock = mockFetch({ [entries[0].url]: response });
    await assert.rejects(auditLiveSeo(origin, mock), /Public read failed|content type/);
    assert.equal(mock.calls.length, 3);
  }
});
test('invalid live bases never fetch', async () => {
  for (const base of ['http://example.com', 'https://user:password@example.com', origin + '/private', origin + '?token=value']) {
    let calls = 0;
    await assert.rejects(auditLiveSeo(base, { fetchImpl: () => { calls++; } }));
    assert.equal(calls, 0);
  }
});
test('source-only CLI labels its scope and invalid CLI live input exits nonzero', () => {
  const source = spawnSync(process.execPath, ['scripts/verify-seo.mjs'], { encoding: 'utf8' });
  assert.equal(source.status, 0, source.stderr);
  assert.match(source.stdout, /source checks only/);
  assert.doesNotMatch(source.stdout, /PASS: live/);
  const invalid = spawnSync(process.execPath, ['scripts/verify-seo.mjs', '--live-base=http://example.com'], { encoding: 'utf8' });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /FAIL:/);
});
