import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { compareImages, compareScreenshotFiles, encodePng, decodePng } from '../scripts/compare-ui-screenshots.mjs'

const white = (w, h) => ({ width: w, height: h, pixels: Buffer.alloc(w * h * 4, 255) })

test('PNG encoder/decoder roundtrip retains pixels', () => {
  const screenshot = white(3, 2)
  const loaded = decodePng(encodePng(screenshot))
  assert.equal(loaded.width, 3)
  assert.equal(loaded.height, 2)
  assert.deepEqual(loaded.pixels, screenshot.pixels)
})

test('diff detects a one-pixel change and masks dynamic regions', () => {
  const original = white(2, 2)
  const edited = white(2, 2)
  edited.pixels[0] = 0
  const full = compareImages(original, edited)
  assert.equal(full.changedRatio, 0.25)
  assert.equal(full.changedPixels, 1)
  const masked = compareImages(original, edited, { masks: [[0, 0, 1, 1]] })
  assert.equal(masked.changedRatio, 0)
  assert.equal(masked.maskedPixels, 1)
  assert.deepEqual(decodePng(encodePng({ width: 2, height: 2, pixels: full.difference })).pixels, full.difference)
})

test('different dimensions require aligned crops and DPR', () => {
  assert.throws(() => compareImages(white(2, 3), white(3, 2)), /sizes differ/)
  assert.throws(() => compareImages(white(1, 1), white(1, 1), { masks: [[0, 0, 1, 1]] }), /Masks exclude all/)
})

test('CLI writes overlays and can gate an identical-viewport comparison', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'visual-ui-'))
  const before = join(dir, 'reference.png')
  const after = join(dir, 'actual.png')
  const changed = white(2, 2)
  changed.pixels[0] = 0
  await writeFile(before, encodePng(white(2, 2)))
  await writeFile(after, encodePng(changed))
  const metrics = await compareScreenshotFiles({ reference: before, actual: after, out: join(dir, 'result'), maxChanged: 0.1 })
  assert.equal(metrics.changedRatio, 0.25)
  const report = JSON.parse(await readFile(join(dir, 'result', 'comparison.json'), 'utf8'))
  assert.equal(report.passesThreshold, false)
  assert.equal(decodePng(await readFile(join(dir, 'result', 'overlay.png'))).width, 2)
  const cli = spawnSync(process.execPath, [
    fileURLToPath(new URL('../scripts/compare-ui-screenshots.mjs', import.meta.url)),
    '--reference', before, '--actual', after,
    '--out', join(dir, 'cli'), '--max-changed', '0.1',
  ], { encoding: 'utf8' })
  assert.equal(cli.status, 1, cli.stderr)
  assert.match(cli.stdout, /Changed 25\.00%/)
})


test('different route/state views fail closed before a misleading screenshot diff', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'visual-identity-'))
  const before = join(dir, 'reference.png')
  const after = join(dir, 'actual.png')
  await writeFile(before, encodePng(white(2, 2)))
  await writeFile(after, encodePng(white(2, 2)))
  await assert.rejects(
    compareScreenshotFiles({ reference:before, actual:after, out:join(dir,'blocked'), referenceView:'/ru/practice|signed-in|dashboard', actualView:'/ru/app/practice?panel=services|signed-in|editor' }),
    /Different UI views/,
  )
  await assert.rejects(
    compareScreenshotFiles({ reference:before, actual:after, out:join(dir,'blocked'), referenceView:'/ru/practice|guest|dashboard' }),
    /Provide both/,
  )
  const pass = await compareScreenshotFiles({ reference:before, actual:after, out:join(dir,'correct'), referenceView:'/ru/practice|guest|dashboard', actualView:'/ru/practice|guest|dashboard' })
  assert.equal(pass.changedRatio,0)
  const report=JSON.parse(await readFile(join(dir,'correct','comparison.json'),'utf8'))
  assert.equal(report.referenceView,'/ru/practice|guest|dashboard')
})
