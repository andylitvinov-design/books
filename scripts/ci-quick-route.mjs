// Exact-merge, fail-closed fast-route planner. Run the version pinned to HEAD^1,
// never a candidate-PR version, before deciding whether to skip Core Next.js.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const IMAGE = /^public\/(?:[\w.-]+\/)*[\w.-]+\.(?:png|jpe?g|webp|gif|avif|ico)$/i;
const PUBLIC_JSX = /^app\/\[locale\]\/(?:about|articles|books|events|explore|install)\/[\w.\[\]/-]+\.(?:jsx|tsx)$/;
const ORDINARY = /^(?:app\/\[locale\]\/|components\/|lib\/|tests\/|public\/|content\/|data\/|docs\/)/;
const PROTECTED_ROOT = /^(?:app\/\[locale\]\/(?:app|client|admin|services|booking|consultation)\/|components\/(?:app|commerce)\/|lib\/(?:app|practitioners|assessments|ci|auth|billing|crm|payments|security|supabase|integrations)\/|docs\/(?:operations|billing|payments)\/)/i;
const SENSITIVE = /(?:^|[\/_.-])(?:auth|oauth|login|logout|security|privacy|private|payment|payments|billing|checkout|rls|secret|token|consent|admin|migration|crm|messenger|message|messages|messaging|conversation|client|contact|email|phone|order|booking|consultation|coaching|patient|medical|health|user|account|subscription|supabase|database|api|webhook|middleware|wallet|storage|provider|practitioner|assessment|credential|receipt|refund|permission|role|salesbot|notification|inbox|profile)(?:[\/_.-]|$)/i;
const ALLOWED_STATUS = new Set(['A','M']);
const MAX_BYTES = 25 * 1024 * 1024, MAX_PIXELS = 90_000_000;

function git(args, options = {}) {
  return execFileSync('git', args, { encoding: options.binary ? 'buffer' : 'utf8',
    maxBuffer: MAX_BYTES + 512 * 1024, stdio: ['ignore','pipe','pipe'] });
}
function revision(rev) {
  if (!/^[0-9a-f]{40}$/.test(rev || '')) throw Error('UNTRUSTED_REVISION');
  return rev;
}
export function parseChangedRows(raw) {
  if (typeof raw !== 'string') throw Error('INVALID_DIFF');
  const parts = raw.split('\0');
  if (parts.at(-1) === '') parts.pop();
  if (!parts.length || parts.length % 2 || parts.length > 1000) throw Error('INVALID_DIFF_ROWS');
  const rows = [];
  for (let i=0; i<parts.length; i+=2) {
    const status=parts[i], filename=parts[i+1];
    if (!/^[A-Z][0-9]*$/.test(status) || !filename ||
        /[\x00-\x1f\x7f]/.test(filename) || filename.split('/').includes('..')) {
      throw Error('INVALID_DIFF_PATH_OR_STATUS');
    }
    rows.push({status,filename});
  }
  return rows;
}
export function decideRoute(rows, classifier, sources) {
  if (!Array.isArray(rows) || !rows.length ||
      rows.some(r=>!r || typeof r.filename!=='string' || typeof r.status!=='string')) return 'FULL';
  const filenames = rows.map(r=>r.filename);
  // Deletions/type-changes can alter release protection and never use the advisory lane.
  if (rows.some(r=>!ALLOWED_STATUS.has(r.status))) return 'FULL';
  if (filenames.some(f=>!ORDINARY.test(f) || PROTECTED_ROOT.test(f) || SENSITIVE.test(f) || /^\.github\/|^supabase\/|^scripts\/ci-|^lib\/ci\/|^tests\/ci-/.test(f) ||
      /(?:^|\/)(?:package(?:-lock)?\.json|next\.config\.\w+|middleware\.\w+|AGENTS\.md|CI_RELEASE_POLICY\.md)$/.test(f))) return 'FULL';
  if (rows.every(r=>ALLOWED_STATUS.has(r.status) && IMAGE.test(r.filename)) &&
      typeof classifier === 'function' && classifier(filenames) === 'FAST') return 'ASSETS';
  // No-build JSX is narrower than the specialist FAST classifier: no CSS,
  // no image mixtures, no additions, and exact safe text-only proof required.
  if (rows.every(r=>r.status==='M' && PUBLIC_JSX.test(r.filename)) &&
      typeof sources === 'function') return 'TEXT_CANDIDATE';
  return 'CORE';
}

function dimensions(width,height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width<1 || height<1 ||
      width>20_000 || height>20_000 || width*height>MAX_PIXELS) throw Error('IMAGE_DIMENSIONS');
}
const PNG_SIG = Buffer.from([137,80,78,71,13,10,26,10]);
const CRC_TABLE = Array.from({length:256},(_,i)=>{
  let v=i;
  for(let n=0;n<8;n++) v=(v&1)?(0xedb88320^(v>>>1)):(v>>>1);
  return v>>>0;
});
function crc32(bytes) {
  let c=0xffffffff;
  for(const b of bytes) c=CRC_TABLE[(c^b)&255]^(c>>>8);
  return (c^0xffffffff)>>>0;
}
function png(bytes) {
  if (bytes.length<57 || !bytes.subarray(0,8).equals(PNG_SIG)) throw Error('PNG_SIGNATURE');
  let at=8, ihdr=0, idat=0, ended=false;
  while(at<bytes.length) {
    if(at+12>bytes.length) throw Error('PNG_TRUNCATED');
    const n=bytes.readUInt32BE(at), end=at+12+n;
    if(n>MAX_BYTES || end>bytes.length) throw Error('PNG_CHUNK_BOUNDS');
    const kind=bytes.toString('ascii',at+4,at+8);
    if(crc32(bytes.subarray(at+4,at+8+n))!==bytes.readUInt32BE(at+8+n)) throw Error('PNG_CRC');
    if (kind==='IHDR') {
      if(ihdr++ || n!==13 || at!==8) throw Error('PNG_IHDR');
      dimensions(bytes.readUInt32BE(at+8),bytes.readUInt32BE(at+12));
      if(bytes[at+16]!==8 && bytes[at+16]!==16 && bytes[at+16]!==4 && bytes[at+16]!==2 && bytes[at+16]!==1) throw Error('PNG_DEPTH');
      if(bytes[at+18]!==0 || bytes[at+19]!==0) throw Error('PNG_COMPRESSION');
    } else if(kind==='IDAT') idat++;
    else if(kind==='IEND') { if(n!==0 || end!==bytes.length) throw Error('PNG_IEND'); ended=true; }
    at=end;
  }
  if(ihdr!==1 || !idat || !ended) throw Error('PNG_INCOMPLETE');
}
function jpeg(bytes) {
  if(bytes.length<16 || bytes[0]!==255 || bytes[1]!==216 ||
      bytes.at(-2)!==255 || bytes.at(-1)!==217) throw Error('JPEG_SIGNATURE_OR_END');
  let at=2, frame=false, scan=false;
  while(at+4<bytes.length) {
    if(bytes[at]!==255) throw Error('JPEG_MARKER');
    while(bytes[at]===255) at++;
    const marker=bytes[at++];
    if(marker===0xda) { scan=true; break; }
    if(marker===0xd9 || marker===0x00 || marker===0xd8) throw Error('JPEG_MARKER_ORDER');
    if (marker>=0xd0 && marker<=0xd7 || marker===0x01) continue;
    if(at+2>bytes.length) throw Error('JPEG_SEGMENT');
    const n=bytes.readUInt16BE(at);
    if(n<2 || at+n>bytes.length) throw Error('JPEG_SEGMENT_BOUNDS');
    if((marker>=0xc0 && marker<=0xc3) || (marker>=0xc5 && marker<=0xc7) ||
       (marker>=0xc9 && marker<=0xcb) || (marker>=0xcd && marker<=0xcf)) {
      if(n<8) throw Error('JPEG_FRAME');
      dimensions(bytes.readUInt16BE(at+3),bytes.readUInt16BE(at+5));
      frame=true;
    }
    at+=n;
  }
  if(!frame || !scan) throw Error('JPEG_NO_FRAME_OR_SCAN');
}
function webp(bytes) {
  if(bytes.length<30 || bytes.toString('ascii',0,4)!=='RIFF' ||
      bytes.toString('ascii',8,12)!=='WEBP' || bytes.readUInt32LE(4)+8!==bytes.length) throw Error('WEBP_RIFF');
  let at=12, picture=false;
  while(at<bytes.length) {
    if(at+8>bytes.length) throw Error('WEBP_CHUNK');
    const type=bytes.toString('ascii',at,at+4), n=bytes.readUInt32LE(at+4);
    if(n>MAX_BYTES || at+8+n>bytes.length) throw Error('WEBP_LENGTH');
    if(type==='VP8X') {
      if(n<10) throw Error('WEBP_VP8X');
      dimensions(1+bytes.readUIntLE(at+12,3),1+bytes.readUIntLE(at+15,3));
      picture=true;
    } else if(type==='VP8 ') {
      if(n<10 || bytes[at+11]!==0x9d || bytes[at+12]!==0x01 || bytes[at+13]!==0x2a) throw Error('WEBP_VP8');
      dimensions(bytes.readUInt16LE(at+14)&0x3fff,bytes.readUInt16LE(at+16)&0x3fff);
      picture=true;
    } else if(type==='VP8L') {
      if(n<5 || bytes[at+8]!==0x2f) throw Error('WEBP_VP8L');
      const v=bytes.readUInt32LE(at+9);
      dimensions((v&0x3fff)+1,((v>>>14)&0x3fff)+1);
      picture=true;
    }
    at+=8+n+(n&1);
  }
  if(at!==bytes.length || !picture) throw Error('WEBP_TRUNCATED');
}
function gif(bytes) {
  if(bytes.length<20 || !['GIF89a','GIF87a'].includes(bytes.toString('ascii',0,6)) ||
      bytes.at(-1)!==0x3b) throw Error('GIF_SIGNATURE');
  dimensions(bytes.readUInt16LE(6),bytes.readUInt16LE(8));
  let at=13, images=0;
  if(bytes[10]&0x80) at+=3*(1<<((bytes[10]&7)+1));
  const blocks=()=>{
    while(true) {
      if(at>=bytes.length) throw Error('GIF_SUBBLOCK');
      const n=bytes[at++];
      if(!n) return;
      if(at+n>bytes.length) throw Error('GIF_SUBBLOCK_BOUNDS');
      at+=n;
    }
  };
  while(at<bytes.length) {
    const kind=bytes[at++];
    if(kind===0x3b) { if(at!==bytes.length || !images) throw Error('GIF_TRAILER'); return; }
    if(kind===0x21) {
      if(at>=bytes.length) throw Error('GIF_EXTENSION');
      at++; blocks(); continue;
    }
    if(kind!==0x2c || at+9>bytes.length) throw Error('GIF_FRAME');
    dimensions(bytes.readUInt16LE(at+4),bytes.readUInt16LE(at+6));
    const flags=bytes[at+8]; at+=9;
    if(flags&0x80) at+=3*(1<<((flags&7)+1));
    if(at>=bytes.length || bytes[at++]<2) throw Error('GIF_LZW');
    blocks(); images++;
  }
  throw Error('GIF_TRUNCATED');
}
function avif(bytes) {
  if(bytes.length<40) throw Error('AVIF_LENGTH');
  let at=0, ftyp=false, imageData=false;
  while(at<bytes.length) {
    if(at+8>bytes.length) throw Error('AVIF_BOX');
    let n=bytes.readUInt32BE(at), header=8;
    const type=bytes.toString('ascii',at+4,at+8);
    if(n===1) {
      if(at+16>bytes.length) throw Error('AVIF_LARGE_BOX');
      const large=bytes.readBigUInt64BE(at+8);
      if(large>BigInt(bytes.length)) throw Error('AVIF_LARGE_BOX_BOUNDS');
      n=Number(large); header=16;
    }
    if(n===0) n=bytes.length-at;
    if(n<header || at+n>bytes.length) throw Error('AVIF_BOX_BOUNDS');
    if(type==='ftyp') {
      const brands=bytes.toString('ascii',at+header,at+n);
      if(!/(?:avif|avis)/.test(brands)) throw Error('AVIF_BRAND');
      ftyp=true;
    }
    if(type==='mdat' && n>header) imageData=true;
    at+=n;
  }
  if(!ftyp || !imageData) throw Error('AVIF_INCOMPLETE');
}
function ico(bytes) {
  if(bytes.length<23 || bytes.readUInt16LE(0)!==0 || bytes.readUInt16LE(2)!==1) throw Error('ICO_HEADER');
  const count=bytes.readUInt16LE(4);
  if(!count || count>64 || bytes.length<6+16*count) throw Error('ICO_COUNT');
  for(let i=0;i<count;i++) {
    const at=6+16*i, len=bytes.readUInt32LE(at+8), offset=bytes.readUInt32LE(at+12);
    if(len<40 || offset<6+16*count || offset+len>bytes.length) throw Error('ICO_ENTRY');
    const body=bytes.subarray(offset,offset+len);
    if(body.subarray(0,8).equals(PNG_SIG)) png(body);
    else if(body.readUInt32LE(0)<40) throw Error('ICO_DIB');
  }
}
export function validateImage(path,bytes) {
  if(!IMAGE.test(path) || path.split('/').some(segment=>segment==='.' || segment==='..') ||
      SENSITIVE.test(path) || !Buffer.isBuffer(bytes) || bytes.length<16 || bytes.length>MAX_BYTES) throw Error('IMAGE_PATH_OR_SIZE');
  const ext=path.split('.').at(-1).toLowerCase();
  if(ext==='png') png(bytes);
  else if(ext==='jpg'||ext==='jpeg') jpeg(bytes);
  else if(ext==='webp') webp(bytes);
  else if(ext==='gif') gif(bytes);
  else if(ext==='avif') avif(bytes);
  else if(ext==='ico') ico(bytes);
  else throw Error('IMAGE_UNSUPPORTED');
  return true;
}
function validateAssets(rows, head) {
  let total=0;
  for(const {filename,status} of rows) {
    if(!ALLOWED_STATUS.has(status)) throw Error('IMAGE_UNSAFE_OPERATION');
    const mode=git(['ls-tree',head,'--',filename]).trim();
    if(!/^100644 blob [0-9a-f]{40}\t/.test(mode) || !mode.endsWith('\t'+filename)) throw Error('IMAGE_NOT_REGULAR_BLOB');
    const data=git(['show',head+':'+filename],{binary:true});
    total+=data.length;
    if(total>80*1024*1024) throw Error('IMAGE_BATCH_TOO_LARGE');
    const blob=execFileSync('git',['hash-object','--stdin'],{input:data,encoding:'utf8',maxBuffer:1024,stdio:['pipe','pipe','pipe']}).trim();
    if(blob!==mode.split('\t')[0].split(' ')[2]) throw Error('IMAGE_HASH_MISMATCH');
    validateImage(filename,data);
  }
}
async function trustedTextProof(rows,base,head) {
  const files=['lib/ci/specialist-aggregate.mjs','lib/ci/fast-static-ui-text.mjs',
    'scripts/ci-specialist-aggregate.mjs'];
  let directory;
  try {
    directory=mkdtempSync(join(tmpdir(),'hh-fast-route-trusted-'));
    for(const file of files) {
      const path=join(directory,file);
      mkdirSync(dirname(path),{recursive:true});
      writeFileSync(path,git(['show',base+':'+file]),{mode:0o600});
    }
    const {classifyStaticUiText}=await import(pathToFileURL(join(directory,files[1])).href);
    const {loadTrustedTypescript}=await import(pathToFileURL(join(directory,files[2])).href);
    const read=(side,path)=>git(['show',(side==='base'?base:head)+':'+path]);
    return classifyStaticUiText(rows,read,{loadTypescript:()=>loadTrustedTypescript(base)})==='FAST';
  } catch { return false; }
  finally { if(directory) rmSync(directory,{recursive:true,force:true}); }
}
async function main() {
  const base=revision(process.env.HH_TESTED_BASE_SHA), head=revision(process.env.HH_HEAD_SHA);
  const checkout=git(['rev-parse','HEAD']).trim();
  if(git(['rev-parse','HEAD^1']).trim()!==base ||
      git(['rev-parse','HEAD^2']).trim()!==head || checkout===head) throw Error('NOT_EXACT_TESTED_PR_MERGE');
  const rows=parseChangedRows(git(['diff','--no-renames','--name-status','-z',base,'HEAD']));
  const trustDir=mkdtempSync(join(tmpdir(),'hh-fast-route-classifier-'));
  let classifier;
  try {
    const path=join(trustDir,'specialist-aggregate.mjs');
    writeFileSync(path,git(['show',base+':lib/ci/specialist-aggregate.mjs']),{mode:0o600});
    classifier=(await import(pathToFileURL(path).href)).classifyReleaseRisk;
  } finally { rmSync(trustDir,{recursive:true,force:true}); }
  const route=decideRoute(rows,classifier,()=>{});
  if(route==='ASSETS') {
    validateAssets(rows,head);
    process.stdout.write('ASSETS\n');
  } else if(route==='TEXT_CANDIDATE') {
    process.stdout.write(await trustedTextProof(rows,base,head)?'TEXT\n':'CORE\n');
  } else process.stdout.write(route+'\n');
}
if(process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]) {
  main().catch(error=>{console.error('CI_FAST_ROUTE_FAILED:',String(error));process.exitCode=1;});
}
