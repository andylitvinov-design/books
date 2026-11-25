import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync('lib/site-videos/mirrors.ts', 'utf8')
const page = readFileSync('app/[locale]/my-coach/real/[slug]/page.tsx', 'utf8')
const gallery = readFileSync('components/practitioner-video-gallery.tsx', 'utf8')

async function publishedClassifier() {
  const output = ts.transpileModule(source, {
    compilerOptions: {module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
    fileName:'mirrors.ts',
  }).outputText
  return import('data:text/javascript;base64,'+Buffer.from(output).toString('base64'))
}

test('HeyGen originals and their verified YouTube mirrors are recognized; ordinary YouTube is not presumed AI', async () => {
  const {isKnownSyntheticVideoSource: isAi} = await publishedClassifier()
  assert.equal(isAi({heygenId:'ed202847a43a96b918308aa972177b34'}),true)
  assert.equal(isAi({url:'https://app.heygen.com/share/ed202847a43a96b918308aa972177b34'}),true)
  assert.equal(isAi({url:'https://app.heygen.com/embeds/34df311e461509433b45929908a9097a'}),true)
  assert.equal(isAi({url:'https://www.youtube.com/watch?v=Y4K4piEwwA8'}),true)
  assert.equal(isAi({url:'https://youtu.be/ILyRWyHtJoE'}),true)
  assert.equal(isAi({url:'https://www.youtube-nocookie.com/embed/ILyRWyHtJoE'}),true)
  assert.equal(isAi({url:'https://www.youtube.com/watch?v=sfVFOQNr2qk'}),false)
  assert.equal(isAi({url:'https://www.youtube.com/watch?v=eLsjFaKCBhI'}),false)
  assert.equal(isAi({url:'https://not-heygen.com/share/ed202847a43a96b918308aa972177b34'}),false)
  assert.equal(isAi({url:'http://app.heygen.com/share/ed202847a43a96b918308aa972177b34'}),false)
})

test('Real/unmarked recordings outrank AI presentations regardless of locale; locale breaks ties', async () => {
  const {compareVideoAuthenticity:compare} = await publishedClassifier()
  const entries = [
    {url:'https://www.youtube.com/watch?v=Y4K4piEwwA8',locale:'en'},
    {url:'https://www.youtube.com/watch?v=eLsjFaKCBhI',locale:'ru'},
    {url:'https://www.youtube.com/watch?v=sfVFOQNr2qk',locale:'en'},
    {url:'https://app.heygen.com/share/ed202847a43a96b918308aa972177b34',locale:'ru'},
  ]
  entries.sort((a,b)=>compare(a,b)||Number(b.locale==='en')-Number(a.locale==='en'))
  assert.deepEqual(entries.map(item=>item.url),[
    'https://www.youtube.com/watch?v=sfVFOQNr2qk',
    'https://www.youtube.com/watch?v=eLsjFaKCBhI',
    'https://www.youtube.com/watch?v=Y4K4piEwwA8',
    'https://app.heygen.com/share/ed202847a43a96b918308aa972177b34',
  ])
})

test('My Coach hero/reel and practitioner gallery share authenticity-first priority', () => {
  assert.match(page,/compareVideoAuthenticity\(a\.source,b\.source\)/)
  assert.match(page,/\.slice\(0,24\)\.map\(\(\{video\}\)=>video\)/)
  assert.match(page,/heygenId:video\.heygenId,youtubeId:video\.youtubeId/)
  assert.match(page,/safeVideo\(source\)/)
  assert.match(gallery,/compareVideoAuthenticity\(a\.video,b\.video\)/)
  assert.match(gallery,/Number\(b\.video\.locale===locale\)-Number\(a\.video\.locale===locale\)/)
})
