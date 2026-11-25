import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PORTRAIT_LIFE_AREA_ORDER,portraitLifeAreaProgress} from '../lib/assessments/portrait-sectors.js';

const score=(n=5)=>({
  mode:'directional',rawValue:n,min:0,max:10,percent:n*10,
  measuredAt:'2026-11-23T12:00:00Z',
});

test('four life areas use one cumulative measured portrait, not four duplicate profiles',()=>{
  const empty=portraitLifeAreaProgress(null);
  assert.deepEqual(PORTRAIT_LIFE_AREA_ORDER,['body','relationships','work','growth']);
  assert.deepEqual(empty.map(a=>a.key),PORTRAIT_LIFE_AREA_ORDER);
  assert.ok(empty.every(a=>a.hasResults===false));
  for(const a of empty)for(const locale of ['en','ru','es'])
    assert.ok(a.shortLabel[locale],a.key+' '+locale);
  const filled=portraitLifeAreaProgress({axes:{
    stress:score(6),
    relationships:{mode:'descriptive',rawValue:3,min:1,max:5,percent:null},
    focus:score(5),
    meaning:score(8),
  }});
  assert.deepEqual(filled.map(a=>a.hasResults),[true,true,true,true]);
});

test('invalid, unreviewed, out-of-range and unmeasured values never mark an area complete',()=>{
  const result=portraitLifeAreaProgress({axes:{
    stress:{...score(4),rawValue:Infinity},
    anxiety:{...score(5),percent:120},
    relationships:{...score(5),mode:'unreviewed'},
    clarity:{...score(5),max:0},
    meaning:{...score(6),rawValue:-1},
  },staleAxes:{energy:score(9)}});
  assert.ok(result.every(a=>a.hasResults===false));
  assert.equal(portraitLifeAreaProgress({axes:{stress:score()}}).filter(a=>a.hasResults).length,1);
});

test('authenticated cabinet links missing area to existing tests; legacy reports remain untouched',()=>{
  const source=readFileSync(new URL('../components/app/profile-domains.jsx',import.meta.url),'utf8');
  const css=readFileSync(new URL('../components/app/profile-domains.css',import.meta.url),'utf8');
  assert.match(source,/portraitLifeAreaProgress\(buildPsychPortrait\(results\)\)/);
  assert.match(source,/!external && <section className="hh-profile-life-areas"/);
  assert.match(source,/data-profile-life-area=\{area\.key\}/);
  assert.match(source,/data-has-results=\{area\.hasResults\}/);
  assert.match(source,/\/personality-profiles/);
  assert.match(source,/\/app\/portfolio/);
  assert.match(css,/@media\(max-width:620px\)[\s\S]*?hh-profile-life-area/);
  assert.doesNotMatch(source,/data-has-results=\{true\}/);
});
