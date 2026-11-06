import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {verifyManifest,safeOfficialUrls,rightsEvidence} from '../source/nps-wave5-screen.mjs';
const sources=JSON.parse(readFileSync(resolve('source/nps-wave5-sources.json'),'utf8'));
test('fixed NPS asset IDs are unique independently filmed source masters, not crops',()=>{
 const rows=verifyManifest(sources);
 assert.equal(rows.length,13);
 assert.equal(new Set(rows.map(x=>x.uuid)).size,rows.length);
 assert.equal(rows.filter(x=>x.peoplePossible===false).length,4);
});
test('NPGallery direct URL path cannot be changed to SSRF or arbitrary host',()=>{
 assert.deepEqual(safeOfficialUrls(sources.sources[0].uuid),{
 page:`https://npgallery.nps.gov/AssetDetail/${sources.sources[0].uuid}`,
 download:`https://npgallery.nps.gov/GetAsset/${sources.sources[0].uuid}/proxyhires`});
 assert.throws(()=>safeOfficialUrls('127.0.0.1'),/unsafe_nps_uuid/);
});
test('NPS generic public material is not presumed to be public domain',()=>{
 assert.throws(()=>rightsEvidence('<html>'.padEnd(300,'x')+'Download MP4: Copyright held by artist</html>'),/nps_rights_unverified/);
});
test('per-asset NPGallery public domain usage passes only with video and NPS credit',()=>{
 const html='<html>Video Files<br>PhotoCredit: NPS Video<br>Constraints Information: Public domain:Full Granting Rights</html>';
 assert.equal(rightsEvidence(html.padEnd(400,' ')),true);
 assert.throws(()=>rightsEvidence(html.replace('Full Granting Rights','Restricted Usage').padEnd(400,' ')),/nps_rights_unverified/);
});
test('unknown, repeated, synthetic and unsafe candidate identities rejected',()=>{
 const dupe=structuredClone(sources);dupe.sources[1].uuid=dupe.sources[0].uuid;
 assert.throws(()=>verifyManifest(dupe),/invalid_nps_asset/);
 const pub=structuredClone(sources);pub.publication='approved';
 assert.throws(()=>verifyManifest(pub),/invalid_nps_manifest/);
});
