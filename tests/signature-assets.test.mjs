import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { signatureDataUri } from '../lib/documents/signature.js'
import { DOCUMENT_TEMPLATE } from '../lib/documents/template.js'

test('shared web signature embeds approved PNG bytes without exposing a public asset route', () => {
  const bytes = readFileSync(DOCUMENT_TEMPLATE.signature.path)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '9f34fc3bbf3db3c73b1abf61ea3174b7e71cb2b4b66d4e484339a402104f7c6d')
  assert.deepEqual(Buffer.from(signatureDataUri().split(',')[1], 'base64'), bytes)
  assert.equal(existsSync('public/document-assets/andrii-signature-left-90.png'), false)
  const { pixelsWide, pixelsHigh } = DOCUMENT_TEMPLATE.signature
  assert.equal(inflateSync(readFileSync('assets/documents/signature-rgb.deflate')).length, pixelsWide * pixelsHigh * 3)
  assert.equal(inflateSync(readFileSync('assets/documents/signature-alpha.deflate')).length, pixelsWide * pixelsHigh)
})
