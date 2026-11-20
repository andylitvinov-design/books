import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectFinishedVideoProof} from '../scripts/verify-express-ready-masters.mjs';
const box=(type,size)=>{const b=Buffer.alloc(size);b.writeUInt32BE(size,0);b.write(type,4,'ascii');return b;};
const bytes=Buffer.concat([box('ftyp',16),box('moov',16),box('mdat',4500)]);
const metadata={format:{duration:'30.014'},streams:[
  {codec_type:'video',codec_name:'h264',pix_fmt:'yuv420p',avg_frame_rate:'25/1',width:720,height:1280},
  {codec_type:'audio',codec_name:'aac'},
]};
const plan={durationMs:30000,aspect:'portrait',audioIds:['harmony']};

test('offline ffprobe proof accepts a decodable faststart 720p/25fps film with AAC',()=>{
 const p=inspectFinishedVideoProof(metadata,bytes,plan);
 assert.equal(p.videoCodec,'h264');assert.equal(p.audioCodec,'aac');
 assert.equal(p.verifiedDurationMs,30014);assert.equal(p.width,720);
});
test('rejects fragmented MP4/moov after mdat, wrong codecs, malformed boxes and silent missing track',()=>{
 for(const data of [
  Buffer.concat([box('ftyp',16),box('mdat',4500),box('moov',16)]),
  Buffer.concat([box('ftyp',16),box('moov',16),box('junk',4490)]),
  bytes.subarray(0,bytes.length-3),
 ])assert.throws(()=>inspectFinishedVideoProof(metadata,data,plan),/EXPRESS_MP4_/);
 for(const change of [
   {format:{duration:'29.1'}},
   {streams:[{...metadata.streams[0],codec_name:'vp9'},metadata.streams[1]]},
   {streams:[{...metadata.streams[0],width:540},metadata.streams[1]]},
   {streams:[metadata.streams[0]]},
   {streams:[{...metadata.streams[0],avg_frame_rate:'8/1'},metadata.streams[1]]},
 ])assert.throws(()=>inspectFinishedVideoProof({...metadata,...change},bytes,plan),/EXPRESS_MP4_/);
});
