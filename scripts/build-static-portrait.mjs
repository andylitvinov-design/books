import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const input='public/images/holistic-house/andy-about.png';
const original=readFileSync(input);const hash=createHash('sha256').update(original).digest('hex');
if(hash!=='73ff81be83850f7d725eee318ca1482785a4ff86cec0de75ff2e1966f3c457a7')throw new Error('Unverified portrait original');
const widths=[96,192,384,640,828,1079];const folder='public/images/holistic-house/portrait-static';mkdirSync(folder,{recursive:true});
const variants=[];
for(const width of widths){const buffer=await sharp(original).resize({width,withoutEnlargement:true,kernel:'lanczos3'}).webp({quality:85,alphaQuality:100,effort:6}).toBuffer();const sha256=createHash('sha256').update(buffer).digest('hex');const path='/images/holistic-house/portrait-static/andy-'+width+'-'+sha256.slice(0,12)+'.webp';writeFileSync('public'+path,buffer);const m=await sharp(buffer).metadata();variants.push({width:m.width,height:m.height,path,sha256,bytes:buffer.length});}
const manifest={version:1,source:'/images/holistic-house/andy-about.png',sourceSha256:hash,sourceBytes:original.length,sourceWidth:1079,sourceHeight:1057,sharpVersion:sharp.versions.sharp,libvipsVersion:sharp.versions.vips,settings:{format:'webp',quality:85,alphaQuality:100,effort:6,kernel:'lanczos3',withoutEnlargement:true,crop:false},variants};writeFileSync('data/static-portrait.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest,null,2));
