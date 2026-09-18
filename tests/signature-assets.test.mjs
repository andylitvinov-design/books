import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { signatureDataUri } from '../lib/documents/signature.js'
import { DOCUMENT_TEMPLATE } from '../lib/documents/template.js'

test('shared web signature embeds approved PNG bytes without exposing a public asset route', () => {
  const bytes = readFileSync(DOCUMENT_TEMPLATE.signature.path)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'fdf409258ba55ce0183146192444fe4c0af4faaeccee3698f0e6fdced10b42cd')
  assert.deepEqual(Buffer.from(signatureDataUri().split(',')[1], 'base64'), bytes)
  assert.equal(existsSync('public/document-assets/andrii-signature-left-90.png'), false)
  const { pixelsWide, pixelsHigh } = DOCUMENT_TEMPLATE.signature
  assert.equal(inflateSync(readFileSync('assets/documents/signature-rgb.deflate')).length, pixelsWide * pixelsHigh * 3)
  assert.equal(inflateSync(readFileSync('assets/documents/signature-alpha.deflate')).length, pixelsWide * pixelsHigh)
})
