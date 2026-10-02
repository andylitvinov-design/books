import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { builtInSiteVideoRecords } from '../lib/site-videos/defaults.js';

const player = readFileSync(new URL('../components/site-video-player.tsx', import.meta.url), 'utf8');
const cases = [
  ['home-intro:en', 'ed202847a43a96b918308aa972177b34', 'home-en-v2', '8f1ae79ad0764324cbf6023db4761a8ff4e9c55c0a085259beccd671cae4da04'],
  ['services-intro:en', '48105a2f2228e7cb3a67391e97acaf8b', 'services-en-v2', 'eba5a152b8fba5293b6046f8569205cafb641c852709f284893308b6846fdad6'],
  ['method-hypnotherapy:en', '8c1634ce904434a91931429b6a7eefe1', 'hypnotherapy-en-v1', 'fa1ec9b1769fd460664c2172670c11e4f5628f91d16a450c64be144fae973395'],
  ['method-constellations:en', '7c6b243f048b9c0581ae29619a4a89fc', 'constellations-en-v1', 'dcc44198296eff227e16d5645d4b5c01d8217915d204515fd2f25afa9417fc21'],
  ['homeopathy-intro:en', '34df311e461509433b45929908a9097a', 'homeopathy-en-v2', '9b2386a700b110249f285ff14d01c692e315a312083b46eab59b99930b0c6261'],
  ['home-intro:ru', '388a04b39ebf215ae656bcd22d0d0847', 'home-ru-v1', '2d17a8df9b325272d4c1049cb7757733a00fbafed652b49ffdd0bdf68bc8b794'],
  ['services-intro:ru', '79c2845577865979cd95ac40a08fc01a', 'services-ru-v1', 'b0c25264bd03966fea4a07e2b654a5d12dc2066dd4fe91845facc06352257819'],
  ['homeopathy-intro:ru', '0f984780d06948b1e78166e6e553e4e9', 'homeopathy-ru-v1', '9c186803e5bfed18f3eecac5c4be3cf8fb90c24a1821b1315ab6adf67f31f335'],
];
for (const [key, id, poster, hash] of cases) {
  test(`${key} preserves its exact render and uses its actual archived frame`, () => {
    const record = builtInSiteVideoRecords().find(item => item.key === key);
    assert.equal(record.published.heygenId, id);
    assert.equal(record.published.language, key.split(':')[1]);
    assert.ok(record.draft.driveUrl.startsWith('https://drive.google.com/file/d/'));
    const path = `/images/holistic-house/video-posters/${poster}.webp`;
    assert.ok(player.includes(`${id}: "${path}"`) || player.includes(`"${id}": "${path}"`));
    const bytes = readFileSync(new URL(`../public${path}`, import.meta.url));
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
    assert.ok(bytes.length < 100000);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), hash);
  });
}
test('a cold SSR play control cannot accept a click before its handler is mounted', () => {
  assert.match(player, /const \[interactive, setInteractive\] = useState\(false\)/);
  assert.match(player, /useEffect\(\(\) => \{ setInteractive\(true\); \}, \[\]\)/);
  assert.match(player, /disabled=\{!interactive\}/);
  assert.match(player, /onClick=\{\(\) => setPlaying\(true\)\}/);
  assert.doesNotMatch(player, /Expires=|Signature=|\.mp4\?/);
});
test('compact defaults are limited to these eight published renders, not About or editor replacements', () => {
  const block = player.split('const minimalPageVideoIds = new Set([')[1].split(']);')[0];
  assert.equal((block.match(/[a-f0-9]{32}/g) ?? []).length, 8);
  for (const [, id] of cases) assert.ok(block.includes(id));
  assert.doesNotMatch(block, /fd5fcead9b067f9a0649862675a38771|d4e55c984e54b40fbeb8a21f81d27694|2c251709aba74fd96ae8be43257a080b/);
  assert.match(player, /minimal=\{minimal \|\| minimalPageVideoIds\.has\(source\.heygenId \?\? ""\)\}/);
});
