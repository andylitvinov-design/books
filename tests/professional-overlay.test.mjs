import test from 'node:test';
import assert from 'node:assert/strict';
import {paintProfessionalPromoFrame} from '../lib/mandala/professional-overlay.mjs';
function mock() {
  const actions=[];
  const ctx={canvas:{width:1080,height:1920},
    save(){actions.push(['save'])},restore(){actions.push(['restore'])},
    fillRect(...args){actions.push(['rect',...args])},
    fillText(...args){actions.push(['text',...args])},
    measureText(str){return {width:str.length*22}}};
  return {ctx,actions};
}
const proposal={
  durationSec:30,cta:{label:'Learn about this service',href:'/en/services/master/intro',verifiedPublicSource:true},
  shotPlan:[{startSec:0,endSec:3,onScreenText:'A helpful question'},
    {startSec:3,endSec:11,onScreenText:'Verified professional introduction'},
    {startSec:11,endSec:24,onScreenText:'Service format and conditions'},
    {startSec:24,endSec:30,onScreenText:'Learn more'}],
};
test('professional captions paint into the same Canvas and end card only from verified CTA',()=>{
  const {ctx,actions}=mock();
  assert.equal(paintProfessionalPromoFrame(ctx,1,proposal),true);
  assert.ok(actions.some(a=>a[0]==='text'&&a[1].includes('question')));
  actions.length=0;
  assert.equal(paintProfessionalPromoFrame(ctx,27,proposal),true);
  assert.ok(actions.some(a=>a[0]==='text'&&a[1]==='/en/services/master/intro'));
  assert.deepEqual(actions.at(-1),['restore']);
});
test('unverified CTA never prints private/unsupported URL',()=>{
  const {ctx,actions}=mock();
  paintProfessionalPromoFrame(ctx,29,{...proposal,cta:{label:'More',href:'https://evil.example',verifiedPublicSource:false}});
  assert.ok(!JSON.stringify(actions).includes('evil.example'));
});
test('missing project and invalid Canvas fail harmlessly',()=>{
  const {ctx}=mock();
  assert.equal(paintProfessionalPromoFrame(ctx,0,null),false);
  assert.equal(paintProfessionalPromoFrame({},0,proposal),false);
});
