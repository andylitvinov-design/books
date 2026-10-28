import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const verifier = read('scripts/verify-site-video-browser.mjs')
const publicComponent = read('components/personal-testimonials.tsx')
const expected = [
  ['Dk0LBmOivQo', 'en'], ['aUJde6A-9p0', 'en'], ['fE6sD1zr1Js', 'en'],
  ['itjo2_z2NGk', 'en'], ['4NrryHcEF1A', 'en'], ['hYwRNMxIMjc', 'en'],
  ['MIVLm1GUTtM', 'ru'], ['ttQxUHopaUM', 'ru'], ['VABgpmn4ZYA', 'ru'], ['muOnIHllI7E', 'ru'],
]
function loadContract(input = verifier) {
  const start = input.indexOf('// BEGIN bounded About gallery contract')
  const end = input.indexOf('// END bounded About gallery contract.')
  assert.ok(start >= 0 && end > start, 'Keep an isolated public metadata oracle')
  return runInNewContext(input.slice(start, end) + '\n({ aboutTestimonialVideos, classifyAboutGallery })', {}, { timeout: 1000 })
}
const { aboutTestimonialVideos, classifyAboutGallery } = loadContract()

// Compile only public IDs, languages and the actual card-selection/rendering
// function. Discard the entire narrative-copy object and redact video titles;
// no narrative, transcript, profile or medical detail enters this fixture.
function metadataOnly(input) {
  const copyStart = input.indexOf('const copy = {')
  const renderStart = input.indexOf('export function PersonalTestimonials(')
  assert.ok(copyStart >= 0 && renderStart > copyStart, 'Metadata/rendering source boundaries')
  return input.slice(0, copyStart).replace(/title: "[^"\n]*"/g, 'title: "public-video"')
    + 'const copy = { en: {}, ru: {}, es: {} };\n' + input.slice(renderStart)
}
const component = metadataOnly(publicComponent)
const jsx = (type, props) => typeof type === 'function' ? type(props ?? {}) : { type, props: props ?? {} }
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree)
  ? tree.flatMap(nodes) : [tree, ...nodes(tree.props.children)]
function renderAbout(input = component) {
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': { default: props => jsx('a', props) },
    'lucide-react': { ArrowRight: () => null, Quote: () => null },
    '@/components/site-video-player': { SiteVideoPlayer: props => jsx('video-fixture', props) },
    '@/components/home-testimonial-more': { HomeTestimonialMore: () => jsx('unexpected-home-disclosure', {}) },
    './personal-testimonials.module.css': { default: {} },
  }
  const compiled = ts.transpileModule(input, { fileName: 'personal-testimonials.tsx', compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  } }).outputText
  const exports = {}
  runInNewContext(compiled, { exports, require(name) {
    assert.ok(Object.hasOwn(modules, name), 'Unexpected rendering dependency')
    return modules[name]
  } }, { timeout: 1000 })
  return nodes(exports.PersonalTestimonials({ locale: 'en', variant: 'about' }))
}
function assertRendered(input = component) {
  const rendered = renderAbout(input)
  const galleries = rendered.filter(node => node.props['data-personal-testimonials'] === 'about')
  assert.equal(galleries.length, 1, 'one About gallery')
  assert.equal(galleries[0].props.id, 'about-testimonials', 'stable scoped gallery')
  assert.equal(galleries[0].props.lang, 'en', 'English page locale')
  const cards = rendered.filter(node => node.props['data-testimonial-video-id'])
  assert.deepEqual(cards.map(node => node.props['data-testimonial-video-id']), expected.map(([id]) => id), 'exact ordered identities')
  assert.equal(new Set(cards.map(node => node.props['data-testimonial-video-id'])).size, 10, 'unique identities')
  assert.equal(rendered.filter(node => node.type === 'video-fixture').length, 10, 'no extra gallery players')
  assert.equal(rendered.filter(node => node.type === 'unexpected-home-disclosure').length, 0, 'not the compact home variant')
  for (const [index, card] of cards.entries()) {
    const players = nodes(card).filter(node => node.type === 'video-fixture')
    assert.equal(players.length, 1, 'exactly one player per card')
    const player = players[0].props
    assert.equal(player.video.youtubeId, expected[index][0], 'player uses the card video ID')
    assert.equal(player.video.heygenId, undefined, 'testimonials remain YouTube originals')
    assert.equal(player.video.language, expected[index][1], 'original audio language')
    assert.equal(player.locale, 'en', 'player page locale')
    assert.equal(player.compact, true, 'existing poster-first player')
    assert.equal(player.minimal, true, 'About minimal player')
    assert.equal(player.internalOnly, true, 'no offsite watch link')
    assert.equal(player.fallbackPoster, `/images/holistic-house/testimonial-posters/${expected[index][0]}.webp`, 'ID-matched local poster')
  }
  return cards
}
function goodSnapshot() {
  return {
    galleryCount: 1, locale: 'en', playerCount: 10, iframeCount: 0, watchLinkCount: 0,
    cards: expected.map(([id, audioLanguage]) => ({ id, audioLanguage, playerCount: 1, playerLocale: 'en',
      playCount: 1, playDisabled: false, posterSrc: `/images/holistic-house/testimonial-posters/${id}.webp` })),
  }
}

test('About EN renders exactly the six English then four archived Russian identities, one click-to-mount poster player each', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(aboutTestimonialVideos)), expected)
  assertRendered()
  assert.equal(classifyAboutGallery(goodSnapshot(), 'http://127.0.0.1:3100'), 'match')
})

test('renderer proof rejects compact subsets, unarchived additions, duplicated identities, reversed locale order and wrong audio/player bindings', () => {
  const mutations = [
    ['const isAbout = variant === "about";', 'const isAbout = false;'],
    ['presentedVideos.filter((item) => locallyArchivedVideoPosterIds.has(item.id))', 'presentedVideos'],
    ['id: "aUJde6A-9p0"', 'id: "Dk0LBmOivQo"'],
    ['[...testimonialVideos[locale], ...testimonialVideos[locale === "ru" ? "en" : "ru"]]', '[...testimonialVideos[locale === "ru" ? "en" : "ru"], ...testimonialVideos[locale]]'],
    ['id: "Dk0LBmOivQo", title: "public-video", language: "en"', 'id: "Dk0LBmOivQo", title: "public-video", language: "ru"'],
    ['youtubeId: item.id, language: item.language', 'youtubeId: "Q9NvYECKWuc", language: item.language'],
    ['internalOnly={isAbout}', 'internalOnly={false}'],
  ]
  for (const [before, after] of mutations) {
    assert.ok(component.includes(before), 'Mutation target must exist in metadata/rendering code')
    assert.throws(() => assertRendered(component.replace(before, after)), assert.AssertionError)
  }
})

test('browser classifier rejects missing, duplicate and extra cards/players, wrong audio/posters and premature iframe/links', () => {
  const mutations = [
    state => { state.galleryCount = 2 }, state => { state.locale = 'ru' },
    state => { state.cards.pop() }, state => { state.cards.push({ ...state.cards[0] }) },
    state => { state.cards[1] = { ...state.cards[0] } }, state => { state.cards.reverse() },
    state => { state.cards[0].id = 'Q9NvYECKWuc' }, state => { state.cards[1].id = state.cards[0].id },
    state => { state.playerCount = 9 }, state => { state.playerCount = 11 },
    state => { state.cards[0].playerCount = 0 }, state => { state.cards[0].playerCount = 2 },
    state => { state.cards[6].audioLanguage = 'en' }, state => { state.cards[0].playerLocale = 'ru' },
    state => { state.cards[0].playCount = 0 }, state => { state.cards[0].playDisabled = true },
    state => { state.cards[0].posterSrc = '/images/unrelated.webp' },
    state => { state.iframeCount = 1 }, state => { state.watchLinkCount = 1 },
  ]
  for (const mutate of mutations) {
    const snapshot = goodSnapshot(); mutate(snapshot)
    const result = classifyAboutGallery(snapshot, 'http://127.0.0.1:3100')
    assert.notEqual(result, 'match')
    assert.match(result, /^[a-z-]{1,30}$/, 'Only a bounded category may be reported')
  }
  assert.equal(classifyAboutGallery(null, 'http://127.0.0.1:3100'), 'invalid')
})

test('both local assertion and live readiness use the same exact scoped metadata contract, never pagewide count relaxation', () => {
  assert.ok(verifier.includes("if (classifyAboutGallery(await readAboutGallery(), origin) === 'match') break"), 'live exact readiness')
  assert.ok(verifier.includes('await expect.poll(async () => classifyAboutGallery(await readAboutGallery(), origin)'), 'local exact gate')
  assert.ok(verifier.includes("message: 'About EN gallery: exact ten locale-first identities, local posters and opt-in players' }).toBe('match')"), 'local oracle accepts only an exact match')
  assert.ok(!/page\.locator\('\.site-video-player'\)\.count\(\)\s*(?:===|,)\s*(?:3|10)/.test(verifier), 'No pagewide cardinality shortcut')
  assert.ok(verifier.includes("page.locator('#about-testimonials[data-personal-testimonials=\"about\"]')"), 'exact gallery selector')
  const reader = verifier.slice(verifier.indexOf('  async function readAboutGallery()'), verifier.indexOf('  if (live) {\n    for (let i = 0; ; i++)'))
  assert.ok(reader.includes("querySelectorAll('[data-testimonial-video-id]')"), 'gather each explicit card')
  assert.ok(reader.includes("querySelectorAll('.site-video-player').length"), 'count all players within gallery, not just mapped cards')
  assert.ok(reader.includes("querySelectorAll('iframe').length"), 'no iframe before Play')
  assert.ok(reader.includes("querySelectorAll('.site-video-watch-link').length"), 'internal-only gallery')
  assert.ok(reader.includes("querySelector('.site-video-fallback-poster')?.getAttribute('src')"), 'ID-matched local still')
  assert.ok(!/innerHTML|outerHTML|textContent|innerText|console\.|getAttribute\('title'\)/.test(reader), 'metadata-only reader without narrative logging')
  assert.ok(verifier.includes("await expect(page.locator('#psychic-alchemy-video')).toBeVisible()"), 'separate approved intro remains required')
  assert.ok(verifier.includes("assert.equal(await page.locator('iframe').count(), 0)"), 'whole page retains no eager iframe gate')
  assert.ok(verifier.includes("await expect(page.locator('#personal-consultation-title')).toBeVisible()"), 'consultation section remains required')
})

test('About routing and actual player keep intro separate, opt-in YouTube privacy host and internal-only watch links', () => {
  const page = read('app/[locale]/about/page.tsx')
  assert.ok(page.includes('<PersonalTestimonials locale={typedLocale} variant="about" />'), 'About variant callsite')
  assert.ok(page.includes('? <PsychicAlchemyIntroVideo video={aboutIntro} />'), 'approved intro is separate from testimonial player')
  assert.ok(page.includes('<PageVideo slot="consultation" locale={typedLocale} internalOnly />'), 'independent optional managed placement remains outside gallery')
  const player = read('components/site-video-player.tsx')
  assert.ok(player.includes('const [playing, setPlaying] = useState(false)'), 'no iframe until explicit activation')
  assert.ok(player.includes('{playing ? (\n          <iframe'), 'iframe mount depends on Play state')
  assert.ok(player.includes('onClick={() => { setShowRecovery(false); setPlaying(true); }}'), 'real Play handler preserved')
  assert.ok(player.includes('https://www.youtube-nocookie.com/embed/${playbackYouTubeId}'), 'privacy-enhanced provider host')
  assert.ok(player.includes('internalOnly ? null : <a'), 'internal-only suppresses watch links')
  assert.ok(player.includes('className="site-video-poster site-video-fallback-poster" src={fallbackPoster}'), 'local poster identity is passed unchanged')
})
