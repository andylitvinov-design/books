import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import vm from 'node:vm'

const source = readFileSync(new URL('../lib/prescriptions/pdf.js', import.meta.url), 'utf8')
const start = source.indexOf('function readApprovedRemedyJpeg(')
assert.notEqual(start, -1)
const reader = source.slice(start, source.indexOf('\nfunction ', start + 1))

test('remedy image reader preserves JPEG dimensions and rejects paths outside catalogue before IO', () => {
  const reads = []
  const jpeg = Buffer.alloc(24)
  jpeg.set([255, 216, 255, 192, 0, 17, 8, 0, 20, 0, 30, 3])
  const context = vm.createContext({ resolve, process: { cwd: () => '/fixture' },
    readFileSync: path => { reads.push(path); return jpeg }, readPdfJpegOrientation: () => 1 })
  vm.runInContext(reader, context)
  for (const path of ['/media/remedies/arnica/photo.jpg', '/media/remedies/a-b/photo-2.jpeg']) {
    const image = context.readApprovedRemedyJpeg(path)
    assert.equal(image.width, 30)
    assert.equal(image.height, 20)
    assert.equal(reads.at(-1), resolve('/fixture/public' + path))
  }
  for (const path of ['/media/remedies/../x.jpg', '/videos/x.jpg', '/etc/passwd', '/media/remedies/a/p.png', null]) {
    const count = reads.length
    assert.equal(context.readApprovedRemedyJpeg(path), null)
    assert.equal(reads.length, count)
  }
})

test('Next file tracing includes remedy photos but not unrelated public books or video', () => {
  const root = mkdtempSync(join(tmpdir(), 'hh-remedy-trace-'))
  try {
    for (const name of ['public/media/remedies/arnica/photo.jpg', 'public/library/unrelated.pdf', 'public/film-collection/unrelated.mp4']) {
      const path = join(root, name)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, 'synthetic fixture')
    }
    writeFileSync(join(root, 'reader.js'), `import { readFileSync } from 'node:fs'; import { resolve } from 'node:path'; export ${reader}`)
    const nft = createRequire(import.meta.url).resolve('next/dist/compiled/@vercel/nft/index.js')
    const script = `require(${JSON.stringify(nft)}).nodeFileTrace(['reader.js'],{base:process.cwd(),processCwd:process.cwd()}).then(r=>console.log(JSON.stringify([...r.fileList])))`
    const files = JSON.parse(execFileSync(process.execPath, ['-e', script], { cwd: root, encoding: 'utf8' }))
    assert.ok(files.includes('public/media/remedies/arnica/photo.jpg'))
    assert.ok(!files.includes('public/library/unrelated.pdf'))
    assert.ok(!files.includes('public/film-collection/unrelated.mp4'))
  } finally { rmSync(root, { recursive: true, force: true }) }
})
