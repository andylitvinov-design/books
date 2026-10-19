import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { builtInSiteVideoRecords } from '../lib/site-videos/defaults.js';

const player = readFileSync(new URL('../components/site-video-player.tsx', import.meta.url), 'utf8');
const videoCss = readFileSync(new URL('../app/site-videos.css', import.meta.url), 'utf8');
const pageVideoVerifier = readFileSync(new URL('../scripts/verify-page-video-release.mjs', import.meta.url), 'utf8');
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
function parsePlayer(source) {
  const ast = ts.createSourceFile('site-video-player.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const find = predicate => {
    const found = [];
    function visit(node) { if (predicate(node)) found.push(node); ts.forEachChild(node, visit); }
    visit(ast);
    return found;
  };
  const initializer = name => {
    const found = find(node => ts.isVariableDeclaration(node) && node.name.getText(ast) === name);
    assert.equal(found.length, 1, `Unique player variable: ${name}`);
    assert.ok(found[0].initializer, `Missing initializer: ${name}`);
    return found[0].initializer.getText(ast);
  };
  return { ast, find, initializer };
}
function assertClickGate(source) {
  assert.match(source, /const \[playing, setPlaying\] = useState\(false\)/);
  assert.match(source, /const \[interactive, setInteractive\] = useState\(false\)/);
  assert.match(source, /useEffect\(\(\) => \{ setInteractive\(true\); \}, \[\]\)/);
  const { ast, find } = parsePlayer(source);
  const branches = find(node => ts.isConditionalExpression(node) && node.condition.getText(ast) === 'playing');
  assert.equal(branches.length, 1);
  const unwrap = node => ts.isParenthesizedExpression(node) ? node.expression : node;
  const frame = unwrap(branches[0].whenTrue);
  const button = unwrap(branches[0].whenFalse);
  assert.ok(ts.isJsxSelfClosingElement(frame) && frame.tagName.getText(ast) === 'iframe');
  assert.ok(ts.isJsxElement(button) && button.openingElement.tagName.getText(ast) === 'button');
  const attribute = (element, name) => {
    const props = element.attributes.properties;
    assert.ok(props.every(node => ts.isJsxAttribute(node)), 'No unchecked spread overrides');
    const found = props.filter(node => node.name.getText(ast) === name);
    assert.equal(found.length, 1, `Unique attribute: ${name}`);
    return found[0].initializer;
  };
  const expression = (element, name) => {
    const value = attribute(element, name);
    assert.ok(value && ts.isJsxExpression(value) && value.expression);
    return value.expression.getText(ast);
  };
  assert.equal(attribute(frame, 'loading').text, 'lazy');
  assert.equal(attribute(frame, 'referrerPolicy').text, 'strict-origin-when-cross-origin');
  assert.equal(expression(frame, 'src'), 'embedUrl');
  assert.equal(attribute(button.openingElement, 'className').text, 'site-video-play');
  assert.equal(expression(button.openingElement, 'disabled'), '!interactive');
  assert.equal(expression(button.openingElement, 'aria-busy'), '!interactive');
  const calls = [];
  const click = new Function('setShowRecovery', 'setPlaying', `return (${expression(button.openingElement, 'onClick')});`)(
    value => calls.push(['recovery', value]), value => calls.push(['playing', value]));
  assert.deepEqual(calls, [], 'No playback during handler creation');
  click();
  assert.deepEqual(calls, [['recovery', false], ['playing', true]], 'Reset recovery before explicit playback');
}
test('a cold SSR play control cannot accept a click before its handler is mounted', () => {
  assertClickGate(player);
  assert.doesNotMatch(player, /Expires=|Signature=|\.mp4\?/);
});
const approvedMirrors = {
  ed202847a43a96b918308aa972177b34: 'Y4K4piEwwA8',
  '48105a2f2228e7cb3a67391e97acaf8b': 's30Y42IwPcg',
  '34df311e461509433b45929908a9097a': 'ILyRWyHtJoE',
  '388a04b39ebf215ae656bcd22d0d0847': 'AE8Pelpo424',
  '79c2845577865979cd95ac40a08fc01a': 'Cz6SxXJNZbw',
  '0f984780d06948b1e78166e6e553e4e9': 'Q9NvYECKWuc',
};
function assertPlaybackIdentity(source) {
  const { initializer } = parsePlayer(source);
  const mirrors = new Function(`return (${initializer('existingYouTubeMirrors')});`)();
  assert.deepEqual(mirrors, approvedMirrors, 'Only the six approved exact-source mirrors');
  const choose = new Function('existingYouTubeMirrors', 'video', 'locale', `
    const mirrorId = ${initializer('mirrorId')};
    const playbackYouTubeId = ${initializer('playbackYouTubeId')};
    const playerParams = ${initializer('playerParams')};
    return ${initializer('embedUrl')};
  `);
  const youtube = (id, locale, audio) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&hl=${locale}&cc_lang_pref=${audio}`;
  for (const [key, id] of cases) {
    const audio = key.split(':')[1];
    for (const locale of [audio, 'es']) {
      assert.equal(choose(mirrors, { heygenId: id, language: audio }, locale),
        approvedMirrors[id] ? youtube(approvedMirrors[id], locale, audio) : `https://app.heygen.com/embeds/${id}`, key);
    }
  }
  for (const [id, audio] of [['Dk0LBmOivQo', 'en'], ['MIVLm1GUTtM', 'ru']]) {
    assert.equal(choose(mirrors, { youtubeId: id, language: audio }, audio), youtube(id, audio, audio));
  }
  const aboutId = 'fd5fcead9b067f9a0649862675a38771';
  assert.equal(choose(mirrors, { heygenId: aboutId, language: 'en' }, 'en'), `https://app.heygen.com/embeds/${aboutId}`);
}
test('actual playback expressions preserve six mirrors, both HeyGen-only methods and testimonial identities', () => {
  assertPlaybackIdentity(player);
});
for (const [name, from, to] of [
  ['missing recovery reset', 'setShowRecovery(false); setPlaying(true);', 'setPlaying(true);'],
  ['missing Play action', 'setShowRecovery(false); setPlaying(true);', 'setShowRecovery(false);'],
  ['wrong action order', 'setShowRecovery(false); setPlaying(true);', 'setPlaying(true); setShowRecovery(false);'],
  ['pre-hydration interaction', 'disabled={!interactive}', 'disabled={false}'],
  ['eager playback', '[playing, setPlaying] = useState(false)', '[playing, setPlaying] = useState(true)'],
  ['eager iframe', 'allowFullScreen loading="lazy"', 'allowFullScreen loading="eager"'],
  ['wrong frame source', 'src={embedUrl}', 'src={watchUrl}'],
]) test(`click-gate contract rejects ${name}`, () => {
  assert.ok(player.includes(from));
  assert.throws(() => assertClickGate(player.replace(from, to)));
});
for (const [name, from, to] of [
  ['wrong mirror', '"Y4K4piEwwA8"', '"AE8Pelpo424"'],
  ['missing mirror', 'ed202847a43a96b918308aa972177b34: "Y4K4piEwwA8",', ''],
  ['unapproved method mirror', 'const existingYouTubeMirrors: Readonly<Record<string, string>> = {', 'const existingYouTubeMirrors: Readonly<Record<string, string>> = { "8c1634ce904434a91931429b6a7eefe1": "Y4K4piEwwA8",'],
  ['lost ordinary YouTube source', 'mirrorId || video.youtubeId', 'mirrorId'],
  ['wrong interface locale', 'hl: locale', 'hl: "en"'],
  ['wrong audio language', 'cc_lang_pref: video.language', 'cc_lang_pref: "en"'],
  ['wrong original method', '${video.heygenId}', '${"ed202847a43a96b918308aa972177b34"}'],
  ['lost inline playback', 'playsinline: "1"', 'playsinline: "0"'],
]) test(`playback-identity contract rejects ${name}`, () => {
  assert.ok(player.includes(from));
  assert.throws(() => assertPlaybackIdentity(player.replace(from, to)));
});
test('posters keep the video title visible over the shared warm treatment', () => {
  assert.match(player, /site-video-poster-title" aria-hidden="true" data-title=\{video\.title\}/);
  assert.doesNotMatch(player, /site-video-poster-title" aria-hidden="true">\{video\.title\}/);
  assert.match(videoCss, /\.site-video-poster-title::before \{ content: attr\(data-title\); \}/);
  assert.match(videoCss, /rgba\(54, 37, 28, \.62\)/);
});
test('page-video browser verification opens the compact language menu before selecting Russian', () => {
  assert.match(pageVideoVerifier, /site-language-menu-trigger/);
  assert.match(pageVideoVerifier, /await chooseRussianHome\(page\)/);
  assert.match(pageVideoVerifier, /menu\.locator\('a\[lang="ru"\]'\)/);
});
test('compact defaults are limited to these eight published renders, not About or editor replacements', () => {
  const block = player.split('const minimalPageVideoIds = new Set([')[1].split(']);')[0];
  assert.equal((block.match(/[a-f0-9]{32}/g) ?? []).length, 8);
  for (const [, id] of cases) assert.ok(block.includes(id));
  assert.doesNotMatch(block, /fd5fcead9b067f9a0649862675a38771|d4e55c984e54b40fbeb8a21f81d27694|2c251709aba74fd96ae8be43257a080b/);
  assert.match(player, /minimal=\{minimal \|\| minimalPageVideoIds\.has\(source\.heygenId \?\? ""\)\}/);
});
