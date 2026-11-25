// Public-only nightly link and image audit. No authentication or private routes.
// All HTML pages come from the canonical sitemap; avoid calling image optimizers.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const origin = (process.env.HH_SEO_AUDIT_ORIGIN || 'https://holistichouse.vercel.app').replace(/\/$/, '');
const maxPages = Number(process.argv.find(a => a.startsWith('--sample='))?.split('=')[1] || 0);
const banned = /^\/(?:api|admin|document-preview|(?:en|ru|es)\/(?:app|client|report|prescriptions))(?:\/|$)/;
const attrs = (tag,name) => {
  const match = tag.match(new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27|([^\\s>]+))','i'));
  return (match?.[1] || match?.[2] || match?.[3] || '').replace(/&amp;/g,'&');
};
const result = { checkedAt: new Date().toISOString(), origin, pages: 0, images: 0, internalLinks: 0,
  externalLinks: 0, errorCount: 0, rateLimited: 0, networkUnverified: 0,
  warnings: [], errors: [], status: 'pending' };
const errors = result.errors, images = new Set(), links = new Set(), external = new Set();
function issue(kind,url,status) {
  if (errors.length < 100) errors.push({ kind, url: new URL(url).origin+new URL(url).pathname, status });
}
const privateOrInternal = url => url.origin === origin && banned.test(url.pathname);
function collect(html, pageUrl) {
  // Ignore Next.js script payloads. Never extract private-client links.
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'');
  for (const tag of markup.match(/<img\b[^>]*>/gi) || []) {
    const raw = attrs(tag,'src');
    if (!raw || /^(?:data:|blob:)/i.test(raw)) continue;
    try {
      let u = new URL(raw,pageUrl);
      if(u.origin === origin && u.pathname === '/_next/image') {
        // Do not trigger billed Vercel image transformations.
        const source = u.searchParams.get('url');
        if(!source) continue;
        u = new URL(source,origin);
      }
      if (!['https:','http:'].includes(u.protocol) || privateOrInternal(u)) continue;
      u.hash=''; u.search='';
      images.add(u.href);
    } catch { /* malformed markup does not justify stopping the audit */ }
  }
  for (const tag of markup.match(/<a\b[^>]*>/gi) || []) {
    const raw = attrs(tag,'href');
    if (!raw || raw.startsWith('#') || /^(?:mailto:|tel:|javascript:|blob:)/i.test(raw)) continue;
    try {
      const u=new URL(raw,pageUrl);
      if (!['https:','http:'].includes(u.protocol) || privateOrInternal(u)) continue;
      u.hash=''; u.search='';
      (u.origin === origin ? links : external).add(u.href);
    } catch { }
  }
}
async function request(url,method='HEAD',follow=false) {
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),18000);
  try { return await fetch(url,{ method, redirect:follow ? 'follow' : 'manual',signal:controller.signal,
    headers: { 'User-Agent':'HolisticHouse-PublicLinkAudit/1.0', 'Accept':'text/html,*/*;q=0.8' } }); }
  finally { clearTimeout(timeout); }
}
async function requestWithRetry(url, method = 'HEAD', follow = true) {
  // Retest transient upstream transport/5xx errors only; never retry 404 or 429.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await request(url, method, follow);
      if (![502,503,504].includes(response.status) || attempt === 2) return response;
      await response.body?.cancel();
    } catch (error) {
      if (attempt === 2) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 500));
  }
  throw new Error('retry exhausted');
}
function uncertain(type, url, detail) {
  const u = new URL(url);
  result.networkUnverified++;
  if (result.warnings.length < 100) result.warnings.push(type + ' INCONCLUSIVE: ' + u.origin + u.pathname + ' ' + detail);
}
async function pool(items,fn,concurrency=2) {
  let i=0;
  async function worker() {while(i<items.length) {
    const value=items[i++];
    try{await fn(value);}catch(error){issue('network',value,String(error?.message||error).slice(0,80));}
    await new Promise(resolve=>setTimeout(resolve,120));
  }}
  await Promise.all(Array.from({length:concurrency},worker));
}
const sitemap=await request(origin+'/sitemap.xml','GET');
assert.equal(sitemap.status,200,'Public sitemap must return HTTP 200');
const xml=await sitemap.text();
const list=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1].replace(/&amp;/g,'&'))
  .filter(href => {try{const u=new URL(href); return u.origin===origin && !banned.test(u.pathname)}catch{return false}});
const pages=maxPages ? list.slice(0,maxPages) : list;
assert.ok(pages.length>=1,'No public URLs found in sitemap');
const known=new Set(list);
await pool(pages,async url=>{
  const response=await request(url,'GET');
  result.pages++;
  if(response.status===429) result.rateLimited++;
  if(response.status!==200) {issue('page',url,response.status);return;}
  const html=await response.text();
  if (/<h1[^>]*>\s*(?:Page not found|Страница не найдена|Página no encontrada|Книга не найдена|Remedy not found)\s*<\/h1>/i.test(html)) {
    issue('soft-404',url,'HTML not-found heading');
  }
  collect(html,url);
});
const check = async (url,type)=>{
  const u = new URL(url), remote = u.origin !== origin;
  let response;
  try { response = await requestWithRetry(url,'HEAD',true); }
  catch(error) {
    // The site redirects /media/* to pinned GitHub Raw; a fetch failure is not
    // proof the original image is absent. Keep an explicit inconclusive warning.
    if (remote || u.pathname.startsWith('/media/')) uncertain(type,url,String(error?.message||error).slice(0,80));
    else issue('network',url,String(error?.message||error).slice(0,80));
    return;
  }
  if (response.status === 429 && !remote) {
    result.rateLimited++;
    issue(type,url,429);
    return;
  }
  if (response.status === 404 || response.status === 410) {
    if (remote) {
      // Some providers reject HEAD even when GET is valid. Verify before
      // marking an external resource broken; never download paid image variants.
      try {
        const checkGet = await requestWithRetry(url,'GET',true);
        await checkGet.body?.cancel();
        if (checkGet.ok) { uncertain(type,url,'HEAD '+response.status+' but GET '+checkGet.status); return; }
        if (checkGet.status !== 404 && checkGet.status !== 410) {
          uncertain(type,url,'HEAD '+response.status+' / GET '+checkGet.status); return;
        }
      } catch(error) { uncertain(type,url,'GET confirmation failed: '+String(error?.message||error).slice(0,80)); return; }
    }
    issue(type,url,response.status);
    return;
  }
  if (response.status >= 400) {
    if (remote) uncertain(type,url,'HEAD inconclusive '+response.status);
    else issue(type,url,response.status);
  }
};
result.images=images.size; result.internalLinks=links.size; result.externalLinks=external.size;
const checkedLocal=new Set(pages);
await pool([...images],async url=>check(url,'image'),2);
await pool([...links].filter(url=>!checkedLocal.has(url) && !known.has(url)),
  async url=>check(url,'internal-link'),2);
await pool([...external],async url=>check(url,'external-link'),1);
result.errorCount=errors.length;
result.status=errors.length ? 'failed' : result.warnings.length ? 'passed_with_warnings' : 'passed';
await mkdir('artifacts',{recursive:true});
await writeFile('artifacts/seo-nightly-links.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,errors:errors.slice(0,30),warnings:result.warnings.slice(0,5)}));
if (errors.length) process.exitCode=1;
