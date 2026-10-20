#!/usr/bin/env node
// Generate native store-test artwork from Holistic House's existing public SVG.
// This runs only after the native build has been branded in its CI checkout.
import {readFileSync,readdirSync,existsSync,renameSync} from 'node:fs'
import {join} from 'node:path'
import sharp from 'sharp'
const platform=process.argv[2]
if(!['ios','android'].includes(platform))throw new Error('Specify ios or android')
const source=readFileSync('public/holistic-house-app.svg')
const logo=async side=>sharp(source).resize(side,side).flatten({background:'#163d38'}).png().toBuffer()
async function icon(file,size){
  if(!existsSync(file))throw new Error('Missing native icon '+file)
  await sharp(await logo(size)).toFile(file+'.hh.png')
  renameSync(file+'.hh.png',file)
}
async function splash(file){
  if(!existsSync(file))return
  const {width,height}=await sharp(file).metadata()
  if(!width||!height)throw new Error('Unknown native splash dimensions')
  const side=Math.max(96,Math.floor(Math.min(width,height)*0.28))
  const square=await logo(side)
  await sharp({create:{width,height,channels:3,background:'#163d38'}})
    .composite([{input:square,left:Math.floor((width-side)/2),top:Math.floor((height-side)/2)}])
    .png().toFile(file+'.hh.png')
  renameSync(file+'.hh.png',file)
}
if(platform==='android'){
  for(const [density,size] of Object.entries({mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192})){
    const dir='android/app/src/main/res/mipmap-'+density
    for(const name of ['ic_launcher.png','ic_launcher_round.png','ic_launcher_foreground.png'])
      await icon(join(dir,name),size)
  }
  const root='android/app/src/main/res'
  for(const dir of readdirSync(root).filter(s=>s==='drawable'||s.startsWith('drawable-port-')||s.startsWith('drawable-land-')))
    await splash(join(root,dir,'splash.png'))
}else{
  await icon('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',1024)
  const root='ios/App/App/Assets.xcassets/Splash.imageset'
  for(const name of readdirSync(root).filter(s=>s.endsWith('.png')))
    await splash(join(root,name))
}
console.log('Generated Holistic House '+platform+' icons and splash screens')
