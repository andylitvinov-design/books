import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import postcss from 'postcss';
import {mountHolistic, nodes, text, assertClosedHolisticChoices} from './helpers/holistic-current-source-fixture.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const css = read('app/[locale]/holistic-support/holistic-support.module.css');
const compactQuery = '(max-width:350px) and (max-height:600px)';
// Approved independent declaration contract. Neither the runtime CSS nor the
// computed source budgets define their own pass criteria.
const compactRules = {
  '.shell': {'padding-top':'0'},
  '.journeyContent': {padding:'3px 8px 6px'},
  '.journeyEyebrow': {margin:'0','font-size':'8.5px','line-height':'1.1'},
  '.journeyContent h1': {'font-size':'25px','line-height':'1'},
  '.journeyLead': {margin:'1px 0','font-size':'11px','line-height':'1.1'},
  '.journeyPrompt': {margin:'0 0 1px','font-size':'14px','line-height':'1.1'},
  '.journeyChoices': {gap:'4px'},
  '.journeyChoice': {'grid-template-columns':'66px minmax(0,1fr) 16px',gap:'6px','min-height':'80px',padding:'5px'},
  '.journeyChoicePhoto': {width:'66px',height:'66px'},
  '.journeyChoiceText': {gap:'2px',padding:'0'},
  '.journeyChoiceIcon': {width:'18px',height:'18px'},
  '.journeyChoiceIcon svg': {width:'12px',height:'12px'},
  '.journeyChoiceText strong': {'font-size':'16px','line-height':'1.05'},
  '.journeyChoiceText small': {'font-size':'10px','line-height':'1.2'},
};

const declarations = rule => Object.fromEntries(rule.nodes.map(node => {
  assert.equal(node.type,'decl','Compact scope only contains CSS declarations');
  assert.equal(node.important,undefined,'No global importance override is required');
  return [node.prop,node.value];
}));

function inspectCompact(source) {
  const parsed=postcss.parse(source);
  const compact=[];
  parsed.walkAtRules('media',node=>{if(node.params.replace(/\s/g,'').includes('max-height:600px'))compact.push(node)});
  assert.equal(compact.length,1,'Exactly one explicitly short AND narrow compact query');
  const rule=compact[0];
  assert.equal(rule.parent,parsed,'Compact mode is scoped at the stylesheet root');
  assert.equal(rule.params,compactQuery,'Both approved viewport boundaries remain exact');
  assert.deepEqual(rule.nodes.map(node=>node.selector),Object.keys(compactRules),'Exact chooser-only selector order');
  const actual=Object.fromEntries(rule.nodes.map(node=>{
    assert.equal(node.type,'rule');
    return [node.selector,declarations(node)];
  }));
  assert.deepEqual(actual,compactRules,'No text hiding, extra selector or unapproved style change');
  return {parsed,rule,actual};
}

function mediaMatches(query,{width,height,reducedMotion}) {
  return query.split(/\s+and\s+/).every(condition=>{
    const match=condition.match(/^\(\s*(max|min)-(width|height)\s*:\s*(\d+)px\s*\)$/);
    if(match) return match[1]==='max' ? ({width,height}[match[2]]<=Number(match[3])) : ({width,height}[match[2]]>=Number(match[3]));
    if(/^\(prefers-reduced-motion:\s*reduce\)$/.test(condition))return reducedMotion;
    assert.fail('Unsupported media condition in source-only proof: '+condition);
  });
}

// Active declaration stream comparison, NOT a browser layout/line-wrap engine.
function activeDeclarations(parsed,viewport) {
  const entries=[];
  const visit=node=>{
    if(node.type==='atrule') {
      assert.equal(node.name,'media');
      if(!mediaMatches(node.params,viewport))return;
    }
    if(node.type==='rule')entries.push([node.selector,node.nodes.filter(n=>n.type==='decl').map(n=>[n.prop,n.value,Boolean(n.important)])]);
    else for(const child of node.nodes ?? [])visit(child);
  };
  visit(parsed);
  return entries;
}

test('only the owner-approved max350 AND max600 chooser declarations are added',()=>{
  const {actual}=inspectCompact(css);
  assert.equal(actual['.journeyChoice']['min-height'],'80px');
  assert.ok(parseFloat(actual['.journeyChoice']['min-height'])>=44);
  assert.equal(actual['.journeyChoiceText small']['font-size'],'10px');
});

test('all ordinary viewport declaration streams remain identical, including boundary and reduced-motion cases',()=>{
  const {parsed,rule}=inspectCompact(css);
  const baseline=parsed.clone();baseline.nodes.splice(parsed.nodes.indexOf(rule),1);
  for(const reducedMotion of [false,true]) {
    for(const [width,height] of [[320,601],[320,700],[320,844],[350,601],[351,568],[360,568],[375,600],[390,844],[430,844],[768,568],[1188,844]]) {
      const viewport={width,height,reducedMotion};
      assert.equal(mediaMatches(compactQuery,viewport),false);
      assert.deepEqual(activeDeclarations(parsed,viewport),activeDeclarations(baseline,viewport),`${width}x${height}: no ordinary viewport CSS changes`);
    }
    for(const [width,height] of [[320,568],[320,600],[350,568],[350,600]]) {
      const viewport={width,height,reducedMotion};
      assert.equal(mediaMatches(compactQuery,viewport),true);
      assert.equal(activeDeclarations(parsed,viewport).length-activeDeclarations(baseline,viewport).length,14);
    }
  }
});

test('all three actual EN/RU/ES choices retain images, full titles/hints and working actions',()=>{
  for(const locale of ['en','ru','es']) {
    const fixture=mountHolistic('choices',locale);
    assertClosedHolisticChoices(fixture.tree,locale);
    const choices=nodes(fixture.tree).filter(node=>node.props['data-holistic-choose']);
    assert.deepEqual(choices.map(node=>node.props['data-holistic-choose']),['meditations','energy','dao']);
    for(const choice of choices) {
      assert.equal(nodes(choice).filter(node=>node.type==='img').length,1);
      for(const tag of ['strong','small']) {
        const labels=nodes(choice).filter(node=>node.type===tag);assert.equal(labels.length,1);
        assert.ok(text(labels[0]).length>5,'No text is abbreviated or removed for compact mode');
      }
    }
    assert.equal(choices[0].props.href,'#meditation-practices');
    assert.equal(choices[1].props.href,'/'+locale+'/services/remote-energy-support');
    choices[2].props.onClick();fixture.flush();
    assert.equal(nodes(fixture.tree).filter(node=>node.props['data-holistic-dao-screen']).length,1);
  }
});

test('approved compact source rejects broader scope, smaller targets, text hiding and underspecified photo/title changes',()=>{
  for(const [from,to] of [
    [compactQuery,'(max-width:700px) and (max-height:600px)'],
    [compactQuery,'(max-width:350px) and (max-height:844px)'],
    [compactQuery,'(max-width:350px)'],
    ['min-height:80px;padding:5px','min-height:79px;padding:5px'],
    ['.journeyChoicePhoto{width:66px;height:66px}','.journeyChoicePhoto{width:66px;height:76px}'],
    ['.journeyChoiceText small{font-size:10px;line-height:1.2}','.journeyChoiceText small{font-size:8px;line-height:1.2}'],
    ['.journeyChoiceText{gap:2px;padding:0}','.journeyChoiceText{gap:2px;padding:0;display:none}'],
    ['.journeyContent h1{font-size:25px;line-height:1}','.page h1{font-size:25px;line-height:1}'],
    ['.journeyChoiceIcon svg{width:12px;height:12px}',''],
  ]) {
    const changed=css.replace(from,to);assert.notEqual(changed,css,from);
    assert.throws(()=>inspectCompact(changed),'Actual CSS mutation must fail: '+from);
  }
});

test('source-only 320x568 budget and original strict native fold assertion are explicit, not a visual pass',()=>{
  inspectCompact(css);
  // Assumptions must be measured in WebKit: two heading lines, three lead
  // lines, at most two card-title lines and one hint line. No font simulation.
  const cardText=18+2*16*1.05+10*1.2+2*2;
  const cardHeight=Math.max(80,cardText+2*5+2,66+2*5+2);
  assert.equal(cardHeight,80);
  const assumedHeroTop=140-8;
  const assumedLastBottom=assumedHeroTop+1+3+8.5*1.1+2*25+3*11*1.1+2+14*1.1+1+3*cardHeight+2*4;
  assert.ok(assumedLastBottom<568-40,'Original fold limit is not widened');
  assert.ok(assumedLastBottom<=500,'Synthetic budget also targets above screenshot navigation, not merely below fold');
  assert.match(read('scripts/verify-holistic-support-browser.mjs'),/last\.y \+ last\.height < height - 40/);
});

const browserSource=read('scripts/verify-holistic-support-browser.mjs');
const clearanceStart=browserSource.indexOf('    if (width <= 350 && height <= 600) {');
const clearanceEnd=browserSource.indexOf('    const before =',clearanceStart);
assert.ok(clearanceStart>=0 && clearanceEnd>clearanceStart);
const clearanceBlock=browserSource.slice(clearanceStart,clearanceEnd);
const compileClearance=source=>new (Object.getPrototypeOf(async function(){}).constructor)(
  'width','height','page','assert','label','writeFile','folder',source);

async function runClearance({width=320,height=568,lastY=418,lastHeight=80,navY=500,navHeight=68,navCount=1,
  lastCount=1,navDisplay='grid',navVisibility='visible',navOpacity='1',navX=0,navWidth=320}={},source=clearanceBlock) {
  const trace=[];
  const last={getBoundingClientRect:()=>({x:16,y:lastY,width:288,height:lastHeight})};
  const nav={getBoundingClientRect:()=>({x:navX,y:navY,width:navWidth,height:navHeight})};
  const page={evaluate:async callback=>{
    trace.push('sample');
    return runInNewContext('('+callback.toString()+')()',{
      document:{querySelectorAll:selector=>{
        if(selector==='[data-holistic-choose="dao"]')return Array(lastCount).fill(last);
        if(selector==='.mobile-bottom-navigation')return Array(navCount).fill(nav);
        assert.fail(selector);
      }},
      window:{visualViewport:{width,height,offsetLeft:0,offsetTop:0}},
      getComputedStyle:node=>node===nav?{display:navDisplay,visibility:navVisibility,opacity:navOpacity}:
        {display:'grid',visibility:'visible',opacity:'1'},
    });
  }};
  await compileClearance(source)(width,height,page,assert,'synthetic compact viewport',async()=>trace.push('artifact'),'unused');
  assert.deepEqual(trace,width<=350&&height<=600?['sample','artifact']:[]);
}

test('actual browser acceptance rejects a68px-navigation overlap even when the old40px fold assertion passes',async()=>{
  await runClearance();
  for(const invalid of [{lastY:440},{navCount:0},{navCount:2},{lastCount:0},{lastCount:2},
    {navDisplay:'none'},{navVisibility:'hidden'},{navOpacity:'0'},{navHeight:0},{navHeight:43},
    {navY:501},{navX:-1},{navWidth:321},{lastHeight:79},{lastY:NaN}]) {
    await assert.rejects(()=>runClearance(invalid),{code:'ERR_ASSERTION'});
  }
  // Outside the approved AND scope the original acceptance remains untouched.
  for(const [width,height] of [[351,568],[320,601],[390,844],[430,844],[1188,844]])
    await runClearance({width,height,navCount:0});
});

test('clearance mutation control detects replacing actual-nav safety with the weaker old fold threshold',async()=>{
  const weakened=clearanceBlock.replace('clearance.last.y + clearance.last.height <= clearance.nav.y',
    'clearance.last.y + clearance.last.height < height - 40');
  assert.notEqual(weakened,clearanceBlock);
  const contract=async source=>{
    await runClearance({},source);
    await assert.rejects(()=>runClearance({lastY:440},source),{code:'ERR_ASSERTION'});
  };
  await contract(clearanceBlock);
  await assert.rejects(()=>contract(weakened),{code:'ERR_ASSERTION'});
});
