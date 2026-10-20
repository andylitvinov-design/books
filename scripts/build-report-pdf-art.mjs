import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

// The approved, public Holistic House lighthouse art is transformed once at
// build time. The generated JPEG is a local PDF XObject, never a request-time
// Vercel image transformation and never a client-uploaded image.
const root=process.cwd()
const source=path.join(root,'public/images/holistic-house/report-lighthouse-coast.webp')
const target=path.join(root,'assets/documents/report-coast-cover.jpg')
const bytes=readFileSync(source)
const sha=createHash('sha1').update('blob '+bytes.length+'\\0').update(bytes).digest('hex')
const expected='89a86ea0b56778e7bafdfcaa0696d00551c1397f'
if(sha!==expected)throw new Error('The approved PDF coastal cover source changed; review the new artwork before generating client PDFs.')
const width=1100,height=740
const fading=Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="left"><stop offset="0" stop-color="white" stop-opacity="1"/><stop offset=".20" stop-color="white" stop-opacity=".96"/><stop offset=".49" stop-color="white" stop-opacity=".40"/><stop offset=".72" stop-color="white" stop-opacity="0"/></linearGradient>
    <linearGradient id="top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="white" stop-opacity=".68"/><stop offset=".18" stop-color="white" stop-opacity="0"/></linearGradient>
    <linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1"><stop offset=".70" stop-color="white" stop-opacity="0"/><stop offset="1" stop-color="white" stop-opacity="1"/></linearGradient>
  </defs><rect width="${width}" height="${height}" fill="url(#left)"/><rect width="${width}" height="${height}" fill="url(#top)"/><rect width="${width}" height="${height}" fill="url(#bottom)"/></svg>`)
mkdirSync(path.dirname(target),{recursive:true})
await sharp(bytes,{failOn:'error'}).rotate()
  .resize(width,height,{fit:'cover',position:'attention',kernel:'lanczos3'})
  .composite([{input:fading}])
  .flatten({background:'#ffffff'})
  .jpeg({quality:83,mozjpeg:true,chromaSubsampling:'4:4:4'})
  .toFile(target)
const output=readFileSync(target)
if(output.length<1000||output[0]!==0xff||output[1]!==0xd8)throw new Error('PDF coastal cover generation did not produce a JPEG')
console.log('[report-pdf-art] Rebuilt approved coastal PDF cover once,',width+'x'+height,Math.ceil(output.length/1024)+'KiB')
