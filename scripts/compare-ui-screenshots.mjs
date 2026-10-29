#!/usr/bin/env node
// Dependency-free PNG visual comparison for approved, synthetic UI screenshots.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync, inflateSync } from 'node:zlib'

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const name = Buffer.from(type, 'ascii')
  const packet = Buffer.alloc(12 + data.length)
  packet.writeUInt32BE(data.length, 0)
  name.copy(packet, 4)
  data.copy(packet, 8)
  packet.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length)
  return packet
}

export function encodePng({ width, height, pixels }) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > 25e6) {
    throw new Error('Invalid PNG dimensions')
  }
  if (pixels.length !== width * height * 4) throw new Error('Expected RGBA pixels')
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const stride = width * 4
  const scanlines = Buffer.alloc(height * (stride + 1))
  for (let y = 0; y < height; y++) {
    const offset = y * (stride + 1)
    scanlines[offset] = 0 // PNG filter: None
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(scanlines, offset + 1)
  }
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(scanlines)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

export function decodePng(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.subarray(0, 8).equals(signature)) throw new Error('Expected PNG screenshot')
  let offset = 8
  let width = 0
  let height = 0
  let channels = 0
  const idats = []
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    if (offset + length + 12 > buffer.length) throw new Error('Truncated PNG chunk')
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      if (data[8] !== 8 || data[12] !== 0 || data[10] !== 0 || data[11] !== 0) {
        throw new Error('Use a non-interlaced 8-bit PNG reference')
      }
      channels = ({ 0: 1, 2: 3, 4: 2, 6: 4 })[data[9]]
      if (!channels) throw new Error('Unsupported PNG color type; export RGB/RGBA PNG')
      if (!width || !height || width * height > 25e6) throw new Error('Unsupported screenshot dimensions')
    } else if (type === 'IDAT') idats.push(data)
    offset += 12 + length
    if (type === 'IEND') break
  }
  if (!channels || !idats.length) throw new Error('Incomplete PNG')
  const stride = width * channels
  const raw = inflateSync(Buffer.concat(idats))
  if (raw.length !== height * (stride + 1)) throw new Error('Unexpected PNG scanline length')
  const rgba = Buffer.alloc(width * height * 4)
  let previous = Buffer.alloc(stride)
  let rawOffset = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[rawOffset++]
    const row = Buffer.alloc(stride)
    for (let i = 0; i < stride; i++) {
      const a = i < channels ? 0 : row[i - channels]
      const b = previous[i]
      const c = i < channels ? 0 : previous[i - channels]
      let predictor = 0
      if (filter === 1) predictor = a
      else if (filter === 2) predictor = b
      else if (filter === 3) predictor = Math.floor((a + b) / 2)
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      } else if (filter !== 0) throw new Error('Unsupported PNG filter ' + filter)
      row[i] = (raw[rawOffset++] + predictor) & 255
    }
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4
      const s = x * channels
      if (channels <= 2) {
        rgba[p] = rgba[p + 1] = rgba[p + 2] = row[s]
        rgba[p + 3] = channels === 2 ? row[s + 1] : 255
      } else {
        rgba[p] = row[s]
        rgba[p + 1] = row[s + 1]
        rgba[p + 2] = row[s + 2]
        rgba[p + 3] = channels === 4 ? row[s + 3] : 255
      }
    }
    previous = row
  }
  return { width, height, pixels: rgba }
}

export function compareImages(reference, actual, { pixelThreshold = 32, masks = [] } = {}) {
  if (reference.width !== actual.width || reference.height !== actual.height) {
    throw new Error('Screenshot sizes differ: align viewport, DPR and crop before comparing (' +
      reference.width + 'x' + reference.height + ' vs ' + actual.width + 'x' + actual.height + ')')
  }
  if (!Number.isInteger(pixelThreshold) || pixelThreshold < 0 || pixelThreshold > 255) {
    throw new Error('pixelThreshold must be an integer from 0 to 255')
  }
  const { width, height } = reference
  for (const mask of masks) {
    if (mask.length !== 4 || mask.some(v => !Number.isInteger(v)) || mask[0] < 0 || mask[1] < 0 || mask[2] < 1 || mask[3] < 1) {
      throw new Error('Masks use x,y,width,height with non-negative integer coordinates')
    }
  }
  const overlay = Buffer.alloc(width * height * 4)
  const difference = Buffer.alloc(width * height * 4)
  let changed = 0
  let compared = 0
  let absoluteError = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const ignored = masks.some(([mx, my, mw, mh]) => x >= mx && y >= my && x < mx + mw && y < my + mh)
      for (let c = 0; c < 3; c++) overlay[i + c] = Math.round((reference.pixels[i + c] + actual.pixels[i + c]) / 2)
      overlay[i + 3] = 255
      if (ignored) {
        difference[i] = difference[i + 1] = difference[i + 2] = 150
        difference[i + 3] = 255
        continue
      }
      compared++
      let max = 0
      for (let c = 0; c < 4; c++) {
        const delta = Math.abs(reference.pixels[i + c] - actual.pixels[i + c])
        if (c < 3) absoluteError += delta
        max = Math.max(max, delta)
      }
      const isChanged = max > pixelThreshold
      if (isChanged) changed++
      difference[i] = isChanged ? 255 : 235
      difference[i + 1] = isChanged ? 35 : 235
      difference[i + 2] = isChanged ? 35 : 235
      difference[i + 3] = 255
    }
  }
  if (!compared) throw new Error('Masks exclude all pixels')
  return {
    changedPixels: changed,
    comparedPixels: compared,
    maskedPixels: width * height - compared,
    changedRatio: changed / compared,
    meanAbsoluteRgbError: absoluteError / (compared * 3 * 255),
    width,
    height,
    pixelThreshold,
    overlay,
    difference,
  }
}

export async function compareScreenshotFiles({ reference, actual, out, pixelThreshold = 32, maxChanged, masks = [] }) {
  if (!reference || !actual || !out) throw new Error('Required: --reference FILE --actual FILE --out DIR')
  const [before, after] = await Promise.all([readFile(reference), readFile(actual)])
  const metrics = compareImages(decodePng(before), decodePng(after), { pixelThreshold, masks })
  await mkdir(out, { recursive: true })
  await Promise.all([
    writeFile(resolve(out, 'overlay.png'), encodePng({ ...metrics, pixels: metrics.overlay })),
    writeFile(resolve(out, 'diff.png'), encodePng({ ...metrics, pixels: metrics.difference })),
    writeFile(resolve(out, 'comparison.json'), JSON.stringify({
      width: metrics.width,
      height: metrics.height,
      changedPixels: metrics.changedPixels,
      comparedPixels: metrics.comparedPixels,
      maskedPixels: metrics.maskedPixels,
      changedRatio: metrics.changedRatio,
      meanAbsoluteRgbError: metrics.meanAbsoluteRgbError,
      pixelThreshold,
      maxChanged: maxChanged ?? null,
      passesThreshold: maxChanged === undefined ? null : metrics.changedRatio <= maxChanged,
    }, null, 2) + '\n'),
  ])
  return metrics
}

function parseArgs(argv) {
  const options = { masks: [] }
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) throw new Error('Unexpected argument: ' + argv[i])
    const [name, inline] = argv[i].slice(2).split('=', 2)
    const value = inline ?? argv[++i]
    if (!value || value.startsWith('--')) throw new Error('Missing value for --' + name)
    if (name === 'reference' || name === 'actual' || name === 'out') options[name] = value
    else if (name === 'pixel-threshold') options.pixelThreshold = Number(value)
    else if (name === 'max-changed') options.maxChanged = Number(value)
    else if (name === 'mask') options.masks.push(value.split(',').map(Number))
    else throw new Error('Unknown flag --' + name)
  }
  if (options.maxChanged !== undefined && (!Number.isFinite(options.maxChanged) || options.maxChanged < 0 || options.maxChanged > 1)) {
    throw new Error('--max-changed must be 0..1')
  }
  return options
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2))
    const result = await compareScreenshotFiles(options)
    console.log('Changed ' + (result.changedRatio * 100).toFixed(2) + '% of comparable pixels; RGB MAE ' + (result.meanAbsoluteRgbError * 100).toFixed(2) + '%')
    if (options.maxChanged !== undefined && result.changedRatio > options.maxChanged) process.exitCode = 1
  } catch (error) {
    console.error('Visual comparison failed: ' + error.message)
    process.exitCode = 2
  }
}
