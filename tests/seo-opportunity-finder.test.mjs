import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyQuery, opportunityFilters, canonicalOpportunityPath, buildOpportunityReport, selectOpportunities } from '../lib/seo/opportunity-finder.mjs';
import { opportunityDateRanges, readSearchOpportunities } from '../lib/seo/admin-dashboard-data.mjs';
import { readFileSync } from 'node:fs';
const site='https://holistichouse.vercel.app';
const en='/en/academy/reiki',en2='/en/services/reiki',ru='/ru/academy/reiki',es='/es/academy/reiki';
const allowlist=new Set([en,en2,ru,es,'/en/app/private','/en/academy/reiki/daybook']);
const row=(q,p,impressions=80,clicks=0,position=7)=>({keys:[q,site+p],impressions,clicks,position});
test('all original categories plus HH-specific free, initiation, consultation and analytical filters',()=>{
 assert.equal(opportunityFilters.length,31);
 assert.equal(new Set(opportunityFilters.map(f=>f.id)).size,31);
 for(const f of opportunityFilters)assert.ok(f.en&&f.ru&&f.es);
});
test('multilingual questions, unicode boundaries, commercial terms and word counts',()=>{
 for(const [q,tags] of [
 ['how much does reiki training cost',['questions','pricing','learning','long4']],
 ['Как пройти бесплатную инициацию Рейки онлайн',['questions','how_to','free','initiation','availability','long4']],
 ['¿Cuánto cuesta el curso de Reiki?',['questions','pricing','learning','initiation','long4']],
 ['покажи мне разницу между двумя методами',['ai_style','comparison']],
 ['reiki vs guided imagery',['comparison','long4']],
 ['beautiful appalachian forest',['long4'].filter(()=>false)],
 ['что такое рейки',['questions','definition']],
 ['reiki for a very long and detailed question about learning online',['long4','long8','long10']],
 ])for(const tag of tags)assert.ok(classifyQuery(q).includes(tag),q+' missing '+tag);
 assert.ok(!classifyQuery('appalachian').includes('tools'));
 assert.ok(!classifyQuery('скамейка').includes('questions'));
 assert.ok(!classifyQuery('definitely carefree').includes('free'));
});
test('strict sitemap allowlist and privacy denylist',()=>{
 assert.equal(canonicalOpportunityPath(site+en,allowlist),en);
 for(const url of [site+'/en/app/private',site+'/en/academy/reiki/daybook',site+en+'?user=1',site+en+'#part',site+'/en/not-in-sitemap','https://example.com'+en,'/en/academy/reiki'])assert.equal(canonicalOpportunityPath(url,allowlist),null);
});
test('bounded score, low CTR, quick wins, trends, overlap, and filtering',()=>{
 const current=[row('free reiki training',en,100),row('free reiki training',en2,40),row('precio del curso',es,30),row('как пройти обучение',ru,30)];
 const previous=[row('free reiki training',en,60,2,9),row('precio del curso',es,100,3,6)];
 const report=buildOpportunityReport({current,previous,allowlist});
 const main=report.items.find(r=>r.path===en);
 for(const tag of ['free','initiation','quick_win','low_ctr','rising','overlap','conversion'])assert.ok(main.tags.includes(tag),tag);
 assert.equal(main.action,'review_overlap');
 assert.deepEqual(main.competingPaths,[en2]);
 assert.ok(report.items.every(r=>r.score>=0&&r.score<=100));
 assert.ok(report.items.find(r=>r.path===es).tags.includes('decay'));
 assert.equal(selectOpportunities(report,{filter:'pricing',locale:'es'}).total,1);
 assert.equal(selectOpportunities(report,{locale:'ru'}).total,1);
});
test('missing prior data never interpreted as zero, private/malformed rows suppressed',()=>{
 const report=buildOpportunityReport({current:[row('free reiki',en),row('private', '/en/app/private'),row('person@example.com',en),row('bad',en,20,21),row('zero',en,0,0)],previous:[row('free reiki',en,1000)],allowlist,previousAvailable:false});
 assert.equal(report.visibleRows,1);
 assert.equal(report.items[0].priorImpressions,null);
 assert.ok(!report.items[0].tags.includes('decay'));
 assert.equal(report.discardedRows,4);
});
test('settled Google dates use Pacific time and exact non-overlapping periods',()=>{
 assert.deepEqual(opportunityDateRanges(7,new Date('2026-11-26T02:00:00Z')),{current:{startDate:'2026-11-16',endDate:'2026-11-22'},previous:{startDate:'2026-11-09',endDate:'2026-11-15'}});
 assert.throws(()=>opportunityDateRanges(8));
});
test('no credentials means explicit disconnected, not fabricated rows',async()=>{
 assert.deepEqual(await readSearchOpportunities(28,{}),{status:'not_connected'});
});
test('owner dashboard authorizes before loading and no public bridge contains raw opportunity payload',()=>{
 const page=readFileSync(new URL('../app/admin/seo/page.jsx',import.meta.url),'utf8');
 assert.ok(page.indexOf('await requireAdminRequest()')<page.indexOf('readSearchOpportunities(days)'));
 assert.match(page,/params\?\.opportunities === "1"/);
 assert.match(page,/index: false/);
 const bridge=readFileSync(new URL('../app/api/internal/seo-monitor-daily/route.js',import.meta.url),'utf8');
 assert.doesNotMatch(bridge,/readSearchOpportunities|opportunity-finder/);
});
