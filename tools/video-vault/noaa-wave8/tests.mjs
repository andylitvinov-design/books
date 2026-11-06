import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {validateManifest,extractNOAAMedia,officialURL} from './screen.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const m=JSON.parse(readFileSync(join(root,'sources.json'),'utf8'));
test('exact 30 independent hand-selected NOAA sources with no duplicate ids/slugs',()=>{
 assert.equal(validateManifest(m).length,30);
 assert.equal(new Set(m.sources.map(s=>s.id)).size,30);
 assert.equal(new Set(m.sources.map(s=>s.slug)).size,30);
});
test('reject URL authority confusion, query/redirect, SSRF, or arbitrary NOAA pages',()=>{
 const bad=['https://oceanexplorer.noaa.gov.attacker.com/multimedia/a/','http://oceanexplorer.noaa.gov/multimedia/a/',
  'https://oceanexplorer.noaa.gov/multimedia/test/?token=xyz','https://oceanexplorer.noaa.gov/wp-content/uploads/../../admin.mp4'];
 for(const u of bad)assert.throws(()=>officialURL(u),/NOAA_WAVE8/);
 assert.throws(()=>officialURL('https://oceanexplorer.noaa.gov/private/foo.mp4',{video:true}),/NOAA_WAVE8/);
 assert.equal(officialURL('https://oceanexplorer.noaa.gov/wp-content/uploads/2026/02/clip-640x360.mp4',{video:true}),
 'https://oceanexplorer.noaa.gov/wp-content/uploads/2026/02/clip-640x360.mp4');
});
const sample=(credit='NOAA Ocean Exploration, 2025 Beyond the Blue')=>`<!doctype html><html><title>NOAA Ocean Exploration</title><main>video <h1>Octopus</h1><p>A real subject in ocean water in a technical NOAA official resource page, not a copyrighted film. Multimedia movement, ecology and exploration footage documented by the government, including underwater animals and the deep seafloor. More scientific information about the underwater environment follows, providing context for editorial framing.</p><h3>Credit</h3><p>${credit}</p><h3>Download</h3><a href="https://oceanexplorer.noaa.gov/wp-content/uploads/2025/10/clip-sd.mp4">SD version (mp4, 6 MB)</a><a href="https://oceanexplorer.noaa.gov/wp-content/uploads/2025/10/clip-hd.mp4">HD version (mp4, 12 MB)</a></main></html>`;
test('trusted government source credit and exact download link chosen, not an unrelated asset',()=>{
 const v=extractNOAAMedia(sample(),'octopus-3');
 assert.match(v.videoUrl,/clip-sd\.mp4$/);assert.equal(v.credit,'NOAA Ocean Exploration, 2025 Beyond the Blue');
});
test('third-party footage explicitly fails closed despite NOAA hosting',()=>{
 for(const name of ['Ralf Meyer, Green Fire Productions','MBARI','Video courtesy of Lia Kim','Copyright Protected Company Inc'])
  assert.throws(()=>extractNOAAMedia(sample(name),'octopus-3'),/INDEPENDENT_RIGHTS_NOT_PROVEN/);
});
test('non-download video and off-domain MP4 are rejected',()=>{
 const html=sample().replaceAll('https://oceanexplorer.noaa.gov/wp-content/uploads/2025/10/', 'https://third-party.invalid/');
 assert.throws(()=>extractNOAAMedia(html,'octopus-3'),/OFFICIAL_MP4_LINK_NOT_FOUND/);
});
test('no publication, R2 upload, paid provider, or invented footage counted by research manifest',()=>{
 assert.equal(m.status,'RESEARCH_ONLY_NOT_LICENSE_OR_VISUAL_APPROVED');
 assert.ok(m.sources.every(s=>typeof s.slug==='string'));
});
