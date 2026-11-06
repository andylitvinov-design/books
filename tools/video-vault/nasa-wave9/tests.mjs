import test from 'node:test';import assert from 'node:assert/strict';
import {candidate,dedupe,safeNasaId,QUERIES} from './discover.mjs';
import {safeVideoUrl,selectManifestVideos} from './screen.mjs';
import {extractLinks,COLLECTIONS} from './fws-discover.mjs';
const item=(id='iss_123',title='Earth horizon seen from the ISS',center='JSC')=>({data:[{nasa_id:id,title,center,media_type:'video',description:'NASA ISS Earth camera footage'}]});
test('NASA is strict about duplicate physical original IDs',()=>{
 assert.equal(dedupe([item(),item(),item('iss_456')]).length,2);
});
test('NASA needs official video center and original camera-like title',()=>{
 assert.notEqual(candidate(item()),null);
 assert.equal(candidate(item('iss_123','Earth animation rendered by NASA')),null);
 assert.equal(candidate(item('iss_123','Planet news conference')),null);
 assert.equal(candidate(item('iss_123','Earth footage','Third Party')),null);
 assert.equal(candidate({...item(),data:[{nasa_id:'iss_123',media_type:'image',center:'JSC',title:'Earth from orbit'}]}),null);
});
test('NASA hard rejects unsafe asset IDs and media host redirects',()=>{
 assert.equal(safeNasaId('../anything'),false);
 assert.equal(safeVideoUrl('http://images-assets.nasa.gov/vid/a.mp4'),false);
 assert.equal(safeVideoUrl('https://images-assets.nasa.gov.evil.org/vid/a.mp4'),false);
 assert.equal(safeVideoUrl('https://images-assets.nasa.gov/vid/a.mp4'),true);
 assert.equal(safeVideoUrl('https://images-assets.nasa.gov/vid/a.mp4?token=secret'),false);
});
test('NASA manifest returns only official MP4 URLs sorted',()=>{
 const r=selectManifestVideos({collection:{items:[
  {href:'https://images-assets.nasa.gov/video/abc/abc~orig.mp4'},
  {href:'https://evil.com/abc.mp4'},
  {href:'https://images-assets.nasa.gov/video/abc/abc~large.mp4'},
  {href:'https://images-assets.nasa.gov/video/abc/abc~large.mp4'},
 ]}});
 assert.equal(r.length,2);assert.match(r[0],/~large\.mp4$/);
});
test('FWS only allows official video hosts and dedupes links',()=>{
 const html='<html>'+('<p>long page content</p>'.repeat(15))+
 `<a href="https://fws.rev.vbrick.com/#/videos/abcd1234">American Birds 1</a><a href="https://fws.rev.vbrick.com/#/videos/abcd1234">American Birds 1</a>`+
 '<a href="https://vbrick.evil.com/video/e">fake</a><a href="javascript:alert(1)">bad</a></html>';
 const x=extractLinks(html,'https://www.fws.gov/NCTC-american-bird-b-rolls','birds');
 assert.equal(x.length,1);assert.equal(x[0].generatorEligible,false);
});
test('Only bounded official research, all media unapproved',()=>{
 assert.ok(QUERIES.length>=6&&QUERIES.length<=12);assert.equal(COLLECTIONS.length,6);
 const x=candidate(item());assert.equal(x.cloudflareR2UploadVerified,false);assert.equal(x.commercialPromotionalUseNotGranted,true);
 assert.equal(x.editorialApproval,false);
});
