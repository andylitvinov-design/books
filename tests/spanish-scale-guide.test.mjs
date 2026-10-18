import test from 'node:test';
import ts from 'typescript';
import { TOPIC_JOURNEYS } from '../lib/assessments/topic-journeys.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { localizeScaleGuideSpanish, SPANISH_SCALE_AXES } from '../lib/assessments/spanish-scale-guide.js';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Spanish scale copy translates the instructional text without changing any measured value',()=>{
 const original={key:'sample',version:'v1',kind:'original',timeframe:'past seven days',purpose:'English description',scales:[{key:'weekly.mood',axis:'mood',label:'Mood',axisLabel:'Mood & feelings',min:0,max:10,watch:'Notice mood',action:'One step',skill:'Optional practice',type:'descriptive',bands:{basis:'descriptive',rows:[]}}],disclaimer:'This is not a diagnosis'};
 const es=localizeScaleGuideSpanish(original);
 assert.equal(es.language,'es');assert.match(es.purpose,/Autoobservación/);assert.equal(es.scales[0].label,'Estado de ánimo y emociones');
 assert.match(es.scales[0].watch,/Observa/);assert.match(es.scales[0].action,/Anota/);assert.equal(es.scales[0].min,0);assert.equal(es.scales[0].max,10);assert.deepEqual(es.scales[0].bands,original.scales[0].bands);
 assert.equal(original.scales[0].watch,'Notice mood'); assert.equal(es.scales[0].originalLabel,'Mood');
});
test('Spanish disclosures retain screening limits and the original band values',()=>{
 const original={key:'asrs-6',kind:'instrument',timeframe:'past six months',scales:[{key:'x',axis:'focus',type:'screening_count',label:'Original score',min:0,max:6,bands:{rows:[{code:'above',from:4,to:6,label:'At/above threshold'}]}}]};
 const translated=localizeScaleGuideSpanish(original);
 assert.match(translated.disclaimer,/0–3/); assert.match(translated.disclaimer,/4–6/);assert.match(translated.disclaimer,/no es un diagnóstico/i);
 assert.equal(translated.scales[0].bands.rows[0].from,4);assert.equal(translated.scales[0].bands.rows[0].to,6);
});
test('All named axes have Spanish labels and published service pages',()=>{
 assert.equal(Object.keys(SPANISH_SCALE_AXES).length,18);
 for(const path of ['dao-health-profile','alchemy-of-soul','hypnotherapy-course']) assert.match(read('app/es/services/'+path+'/page.tsx'),/locale="es"/);
 assert.match(read('app/[locale]/explore/[theme]/page.tsx'),/\['en','ru','es'\]/);
 const sitemap = read('app/sitemap.ts');
 const statement = sitemap.match(/const topicJourneys = ([^;]+);/);
 assert.ok(statement, 'Sitemap derives localized journey URLs from the canonical topic registry');
 const compiled = ts.transpileModule('const paths = ' + statement[1] + ';', {}).outputText;
 const paths = new Function('TOPIC_JOURNEYS', compiled + '; return paths;')(TOPIC_JOURNEYS);
 assert.deepEqual(paths, ['en', 'ru', 'es'].flatMap(locale => TOPIC_JOURNEYS.map(journey => `/${locale}/explore/${journey.id}`)));
 assert.equal(paths.length, TOPIC_JOURNEYS.length * 3);
 assert.match(sitemap, /const publicPaths = [^;]*\.\.\.topicJourneys/);
});
