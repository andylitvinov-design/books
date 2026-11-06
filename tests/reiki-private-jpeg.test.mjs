import assert from 'node:assert/strict'
import test from 'node:test'
import { reikiPrivateJpegValid } from '../data/academy/reiki-private-jpeg.js'

// A bounded marker-structure fixture; this checks metadata rejection, not
// photographic quality (the mobile browser E2E separately renders a real JPEG).
const segment = (marker, payload) => Buffer.concat([
  Buffer.from([0xff,marker,(payload.length+2)>>8,(payload.length+2)&255]), payload,
])
function jpeg({width=320,height=240,extra=[]}={}) {
  const frame=Buffer.from([8,height>>8,height&255,width>>8,width&255,1,1,0x11,0])
  const scan=Buffer.from([0xff,0xda,0,8,1,1,0,0,0x3f,0])
  return Buffer.concat([
    Buffer.from([0xff,0xd8]),
    segment(0xe0,Buffer.from([0x4a,0x46,0x49,0x46,0,1,1,0])),
    ...extra,
    segment(0xc0,frame),
    scan, Buffer.alloc(144,0), Buffer.from([0xff,0xd9]),
  ])
}
test('accepts bounded canvas-like JPEG marker structure',()=>{
  assert.equal(reikiPrivateJpegValid(jpeg()),true)
  assert.equal(reikiPrivateJpegValid(jpeg({width:1600,height:1200})),true)
  assert.equal(reikiPrivateJpegValid(jpeg({width:99})),false)
  assert.equal(reikiPrivateJpegValid(jpeg({height:99})),false)
  assert.equal(reikiPrivateJpegValid(jpeg({width:1601})),false)
})
test('rejects EXIF/GPS, IPTC, comments and truncation before private upload',()=>{
  assert.equal(reikiPrivateJpegValid(jpeg({extra:[segment(0xe1,Buffer.from('Exif\\0\\0GPS'))]})),false)
  assert.equal(reikiPrivateJpegValid(jpeg({extra:[segment(0xed,Buffer.from('IPTC private fields'))]})),false)
  assert.equal(reikiPrivateJpegValid(jpeg({extra:[segment(0xfe,Buffer.from('private comment'))]})),false)
  assert.equal(reikiPrivateJpegValid(jpeg().subarray(0,-2)),false)
  assert.equal(reikiPrivateJpegValid(Buffer.from('not an image')),false)
})
