'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {compactValue,visibleRows}=require('./pr-dense-view.js');

test('keeps verified zero, ratios, observed lower bounds and timestamps',()=>{
  assert.equal(compactValue('0'),'0');
  assert.equal(compactValue('≈82,5%*'),'≈82,5%*');
  assert.equal(compactValue('≥4'),'≥4');
  assert.equal(compactValue('3/7 из 7 с CI'),'3/7');
  assert.equal(compactValue('8 мин · n=3'),'8 мин');
  assert.equal(compactValue('1 234'),'1 234');
});
test('never converts unknown to numeric zero',()=>{
  for(const v of ['—','–','',null,undefined,'Нет данных','н/д','NaN','— · история не найдена'])
    assert.equal(compactValue(v),null);
});
test('deduplicates and omits only rows with no numeric evidence',()=>{
  const rows=visibleRows([
    {key:'repair',label:'Repair',now:'—',week:'—'},
    {key:'first',label:'First CI',now:'0',week:'—'},
    {key:'first',label:'Duplicate first CI',now:'9',week:'9'},
    {key:'waves',label:'Waves',now:'≥4',week:'3/5'}
  ]);
  assert.deepEqual(rows,[
    {key:'first',label:'First CI',now:'0',week:null},
    {key:'waves',label:'Waves',now:'≥4',week:'3/5'}
  ]);
});
