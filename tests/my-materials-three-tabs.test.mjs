import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MATERIAL_TAB_IDS,selectedMaterialTab,materialTabSearch} from '../lib/app/my-materials-tabs.mjs';

test('exact three private views with backward-compatible video default',()=>{
  assert.deepEqual(MATERIAL_TAB_IDS,['avatars','videos','photos']);
  for(const tab of MATERIAL_TAB_IDS)assert.equal(selectedMaterialTab('?tab='+tab),tab);
  for(const query of ['', '?tab=other', '?tab=__proto__', '?tab=', '?tab=old-photo'])
    assert.equal(selectedMaterialTab(query),'videos');
  assert.equal(materialTabSearch('?from=profile&tab=videos','photos'),'?from=profile&tab=photos');
  assert.equal(materialTabSearch('?from=profile&tab=photos','videos'),'?from=profile');
  assert.equal(materialTabSearch('?tab=avatars','avatars'),'?tab=avatars');
  assert.throws(()=>materialTabSearch('','billing'),/INVALID_MATERIAL_TAB/);
});
test('existing media providers are single-mounted in one accessible view',()=>{
  const ui=readFileSync(new URL('../components/app/my-personal-videos.jsx',import.meta.url),'utf8');
  const page=readFileSync(new URL('../components/app/my-page-client.jsx',import.meta.url),'utf8');
  const avatars=readFileSync(new URL('../components/app/my-live-photos.jsx',import.meta.url),'utf8');
  assert.match(ui,/data-my-materials-library/);
  assert.match(ui,/data-my-materials-tabs/);
  assert.match(ui,/aria-selected=\{activeTab===id\}/);
  for(const tab of MATERIAL_TAB_IDS)assert.match(ui,new RegExp('my-materials-panel-'+tab));
  assert.match(ui,/activeTab==='avatars'\?<MyLivePhotos locale=\{locale\}\/>/);
  assert.match(ui,/activeTab==='photos'\?<SupportPhotoCabinet locale=\{locale\}\/>/);
  assert.match(ui,/PersonalVideoMessengerPanel/);
  assert.match(ui,/savePrivateMp4/);
  assert.match(ui,/appFetch\('personal-videos'/);
  for(const label of ['AI Avatars','My Videos','My Photos','AI-аватары','Мои видео','Мои фото','Avatares IA','Mis vídeos','Mis fotos'])
    assert.ok(ui.includes(label),label);
  assert.match(page,/app\/videos\?tab=avatars/);
  assert.doesNotMatch(page,/<MyLivePhotos/);
  assert.match(avatars,/data-client-live-photos/);
  assert.doesNotMatch(ui,/createBucket|service_role|heygen\.ai|new SupabaseClient/i);
});
