import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const component=readFileSync('components/mandala-professional-promo.tsx','utf8');
const css=readFileSync('components/mandala-professional-promo.module.css','utf8');
test('UI reuses the professional source-safe director and only proposes a draft',()=>{
  assert.match(component,/proposeProfessionalCampaign/);
  assert.match(component,/PROFESSIONAL_TEMPLATES/);
  assert.match(component,/data-professional-suggest/);
  assert.match(component,/data-professional-apply/);
  assert.match(component,/data-professional-copy/);
  assert.match(component,/publicOffer/);
  assert.match(component,/onApply\(proposal\.montage!/);
  assert.doesNotMatch(component,/\/api\/|fetch\(|axios|autoPublish|billing|creditSpend/);
});
test('professional editor stays optional, localized, a11y-oriented and mobile',()=>{
  assert.match(component,/<details/);
  assert.match(component,/ru:\{|en:\{|es:\{/);
  assert.match(component,/maxLength=\{140\}/);
  assert.match(component,/disabled=\{disabled\|\|!ready\|\|!factChecked\}/);
  assert.match(css,/focus-visible/);
  assert.match(css,/min-height:44px/);
  assert.match(css,/@media\(max-width:420px\)/);
});
