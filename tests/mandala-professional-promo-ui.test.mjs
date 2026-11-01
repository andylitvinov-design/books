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

const liveStudio=readFileSync('components/mandala-free-video-studio.tsx','utf8');
const parent=readFileSync('components/mandala-meditation-client.tsx','utf8');
test('professional card is wired to the existing local four-MP4 editor',()=>{
  assert.ok(parent.includes('professionalSource={professionalSource} professionalMode={professionalMode}'));
  assert.ok(liveStudio.includes('professionalMode ? <MandalaProfessionalPromo'));
  assert.ok(liveStudio.includes('presets={FREE_FILM_PRESETS} scenes={FREE_FILM_CATALOG}'));
  assert.ok(liveStudio.includes('publicOffer={professionalSource?.publicOffer ?? null}'));
  assert.ok(liveStudio.includes('existing.clips.join("|")!==proposal.montage.sceneIds.join("|")'));
  assert.ok(liveStudio.includes('applyAutoFilm(presetId,seconds,undefined,outputAspect)'), 'current director keeps edit argument before aspect');
  assert.ok(liveStudio.includes('setBackgroundOnly(true)'));
  assert.ok(liveStudio.includes('setAffirmations({...defaultAffirmations,enabled:false})'));
  assert.ok(liveStudio.includes('setMusic("none");setAttachedAudio(null)'));
});
test('shot keys are stable and public catalog arrays are readonly-safe',()=>{
  assert.ok(component.includes('presets:[...presets],scenes:[...scenes]'));
  assert.ok(component.includes('key={String(index)}'));
});
