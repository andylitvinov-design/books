import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFESSIONAL_TEMPLATES } from '../lib/mandala/professional-growth-templates.mjs';
import { proposeProfessionalCampaign } from '../lib/mandala/professional-content-director.mjs';

const themes = ['relationships', 'goals', 'life', 'health'];
const scenes = themes.flatMap(theme => Array.from({length:4}, (_,i) => {
  const id = theme + '-' + String(i+1);
  return {id,theme,status:'approved',media:'licensed_mp4',
    video:'/videos/holistic-house/film-collection-v2/' + id + '.mp4',
    poster:'/videos/holistic-house/film-collection-v2/' + id + '.jpg',
    motifs:[],tags:[theme],
    rightsReference:{kind:'existing_approved_first_party_master'},
    commercialUseVerified:true};
}));
const presets = themes.map(theme => ({
  id:theme+'-professional',theme,focusTags:['trust','clarity'],
  clips:scenes.filter(s=>s.theme===theme).map(s=>s.id),
}));
const offer = {
  id:'service_12',kind:'service',published:true,publicSnapshot:true,
  locale:'ru',practitionerId:'master_22',title:'Первая ознакомительная встреча',
  publicDescription:'Формат: онлайн. Продолжительность: 30 минут.',
  href:'/ru/services/specialist/first-meeting',
  privateHealthNotes:'MUST_NOT_COPY',email:'private@example.com',
};
const profile = {
  id:'master_22',published:true,publicSnapshot:true,displayName:'Профессионал',
  professionalTitle:'Registered Psychotherapist',credentialVerified:false,
};

test('all 12 approved editorial goals get four real distinct catalog references for RU/EN/ES',()=>{
  for (const {goal} of PROFESSIONAL_TEMPLATES) {
    for (const locale of ['ru','en','es']) {
      const source = {...offer,locale,href:'/'+locale+'/services/specialist/first-meeting'};
      const result = proposeProfessionalCampaign({
        goal,locale,publicOffer:source,publicPractitioner:profile,presets,scenes,
      });
      assert.equal(result.shotPlan.length,4);
      assert.equal(result.sceneIds.length,4);
      assert.equal(new Set(result.sceneIds).size,4);
      assert.equal(result.montage.presetId.includes('professional'),true);
      assert.deepEqual(result.shotPlan.map(s=>[s.startSec,s.endSec]),[[0,3],[3,11],[11,24],[24,30]]);
      assert.equal(result.durationSec,30);
      assert.equal(result.aspect,'9:16');
      assert.equal(result.mediaAvailability,'catalog_matched_runtime_unverified');
      assert.equal(result.paidRenderApproved,false);
      assert.equal(result.aiVideoGenerated,false);
      assert.equal(result.requiresHumanReview,true);
      assert.equal(result.verifiedProfessionalTitle,'');
      assert.equal(JSON.stringify(result).includes('MUST_NOT_COPY'),false);
      assert.equal(JSON.stringify(result).includes('private@example.com'),false);
    }
  }
});

test('public offer title, conditions and canonical CTA are reused without inventing price or dates',()=>{
  const result=proposeProfessionalCampaign({
    goal:'consultation',locale:'ru',publicOffer:offer,publicPractitioner:profile,presets,scenes,
  });
  assert.equal(result.cta.href,offer.href);
  assert.ok(result.postDraft.includes(offer.title));
  assert.ok(result.postDraft.includes('30 минут'));
  assert.ok(!/\d+\s*(?:USD|EUR|CAD|€|\$)/.test(result.postDraft));
  assert.equal(result.status,'proposal_ready_for_editor_review');
});

test('unpublished services, wrong locale, wrong practitioner and off-site links fail closed',()=>{
  const base={goal:'consultation',locale:'ru',publicOffer:offer,publicPractitioner:profile,presets,scenes};
  assert.throws(()=>proposeProfessionalCampaign({...base,publicOffer:{...offer,published:false}}),/snapshot/);
  assert.throws(()=>proposeProfessionalCampaign({...base,publicOffer:{...offer,locale:'en'}}),/public_offer/);
  assert.throws(()=>proposeProfessionalCampaign({...base,publicOffer:{...offer,href:'https://evil.example/track'}}),/public_offer/);
  assert.throws(()=>proposeProfessionalCampaign({...base,publicOffer:{...offer,href:'/ru/services/abc?a=client'}}),/public_offer/);
  assert.throws(()=>proposeProfessionalCampaign({...base,publicOffer:{...offer,practitionerId:'someone_else'}}),/practitioner_mismatch/);
  assert.throws(()=>proposeProfessionalCampaign({...base,publicOffer:null}),/published_offer_required/);
});

test('editorial topics without published offer are draft-only with no fake booking URL',()=>{
  const r=proposeProfessionalCampaign({goal:'question',locale:'en',topic:'How does the first meeting work?',presets,scenes});
  assert.equal(r.cta.href,null);
  assert.ok(r.warnings.includes('no_verified_public_offer'));
  assert.equal(r.postDraft.includes('https:'),false);
  assert.equal(r.requiresHumanReview,true);
});

test('invalid asset rights and tampered paths never become four-clips ready',()=>{
  const invalidScenes=scenes.map(s=>({...s}));
  invalidScenes[0]={...invalidScenes[0],video:'https://foreign.example/x.mp4'};
  invalidScenes[1]={...invalidScenes[1],status:'pending'};
  invalidScenes[2]={...invalidScenes[2],rightsReference:null};
  const r=proposeProfessionalCampaign({goal:'introduce',locale:'en',presets,scenes:invalidScenes});
  assert.equal(r.montage,null);
  assert.equal(r.mediaAvailability,'no_matching_licensed_preset');
  assert.equal(r.status,'needs_media_selection');
  assert.deepEqual(r.sceneIds,[]);
});

test('exclusion and uncertain commercial rights surface clearly',()=>{
  const r=proposeProfessionalCampaign({
    goal:'introduce',locale:'en',presets,
    scenes:scenes.map(s=>s.id==='relationships-1'?{...s,motifs:['water']}:s),
    avoidMotifs:['water']});
  assert.equal(r.montage,null);
  assert.ok(r.warnings.includes('no_eligible_montage'));
  assert.throws(()=>proposeProfessionalCampaign({goal:'question',locale:'ru',avoidMotifs:['flying-dragons']}),/unsupported_visual_exclusion/);
  const uncertain=proposeProfessionalCampaign({goal:'question',locale:'en',presets,
    scenes:scenes.map(s=>({...s,commercialUseVerified:undefined}))});
  assert.equal(uncertain.montage.rightsReviewRequired,true);
  assert.ok(uncertain.warnings.includes('commercial_rights_review_required'));
});

test('chooses a single stable existing preset and never asserts it is already rendered or posted',()=>{
  const a=proposeProfessionalCampaign({goal:'program',locale:'ru',publicOffer:offer,presets,scenes});
  const b=proposeProfessionalCampaign({goal:'program',locale:'ru',publicOffer:offer,presets,scenes});
  assert.deepEqual(a,b);
  assert.notEqual(a.status,'published');
  assert.notEqual(a.mediaAvailability,'verified');
  assert.equal(a.noExternalClientData,true);
});

test('verified title is included only when credential flag is confirmed',()=>{
  const r=proposeProfessionalCampaign({goal:'approach',locale:'ru',publicPractitioner:{...profile,credentialVerified:true},presets,scenes});
  assert.equal(r.verifiedProfessionalTitle,'Registered Psychotherapist');
});
