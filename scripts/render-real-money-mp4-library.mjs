/**
 * One-time first-party video library builder. Outputs transformed licensed
 * H.264 MP4 scenes + posters. It is not run by Next/Vercel on every build.
 * Supareels license: https://supareels.com/stock-footage-licence
 * Raw upstream clips are private temporary inputs, never published.
 */
import {mkdtemp,mkdir,writeFile,rm,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {spawnSync} from "node:child_process";
import {createRequire} from "node:module";
import sharp from "sharp";
const require=createRequire(import.meta.url);
const ffmpeg=require("ffmpeg-static");
const OUTPUT=resolve("public/videos/holistic-house/money-films-v1");
const CDN="https://supareels.com/api/download?path=";
const files={
 rain:"/clips/overlays/gold-glitter-fall.portrait.mp4",
 foil:"/clips/overlays/confetti-gold.portrait.mp4",
 rays:"/clips/overlays/light-rays-sweep.portrait.mp4",
 bokeh:"/clips/overlays/bokeh-warm.portrait.mp4",
 forest:"/clips/forest/sunbeams-mist.portrait.mp4",
 path:"/clips/forest/golden-path.portrait.mp4",
 falls:"/clips/waterfalls/waterfall-tall-plunge.portrait.mp4",
 sparks:"/clips/overlays/sparks-spray-side.mp4",
 fireworks:"/clips/overlays/fireworks-gold-bursts.mp4",
 flare:"/clips/overlays/lens-flare-drift.mp4",
};
const clips=[
 ["golden-rain","rain","foil","#503008","#ffd480"],
 ["cosmic-flow","bokeh","rays","#28174c","#ecb8ff"],
 ["abundance-tree","forest","foil","#26432d","#ffe0a1"],
 ["opportunity-falls","falls","rain","#194653","#ffe2a6"],
 ["money-magnet","sparks","foil","#3a1645","#ffcf61"],
 ["path-to-goals","path","rays","#41351f","#ffd78b"],
 ["partners","bokeh","flare","#4f2855","#ffc5a4"],
 ["infinite-flow","fireworks","bokeh","#111d46","#ffcd6b"],
 ["golden-shield","rays","foil","#1c3c32","#ffebae"],
 ["abundance-circle","bokeh","rain","#674322","#ffcc62"],
 ["life-gifts","foil","fireworks","#653451","#ffe0a2"],
 ["dreams","path","flare","#264968","#d7e2fd"],
];
function svg(scene,background){
 const id=scene[0],dark=scene[3],gold=scene[4];
 if(background)return '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 540 960"><defs><radialGradient id="g"><stop stop-color="'+dark+'"/><stop offset="1" stop-color="#070d16"/></radialGradient></defs><rect width="720" height="1280" viewBox="0 0 540 960" fill="url(#g)"/></svg>';
 const rings=Array.from({length:5},(_,i)=>'<ellipse cx="270" cy="453" rx="'+(144+i*33)+'" ry="'+(186+i*38)+'" fill="none" stroke="'+gold+'" stroke-width="1.3" opacity="'+(.21-i*.025)+'"/>').join('');
 const stars=Array.from({length:36},(_,i)=>'<circle cx="'+Math.round(40+460*Math.abs(Math.sin(i*11.23)))+'" cy="'+Math.round(115+715*Math.abs(Math.sin(i*19.13)))+'" r="'+(i%4===0?2.8:1.2)+'" fill="'+gold+'" opacity="'+(.3+i%4*.08)+'"/>').join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 540 960"><defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#060c13" stop-opacity=".7"/><stop offset=".20" stop-color="#060c13" stop-opacity="0"/><stop offset=".74" stop-color="#060c13" stop-opacity="0"/><stop offset="1" stop-color="#060c13" stop-opacity=".8"/></linearGradient></defs><rect width="720" height="1280" viewBox="0 0 540 960" fill="url(#f)"/>'+rings+stars+'<path d="M28 182V60H139 M403 60H512V182 M28 770V900H139 M403 900H512V770" stroke="'+gold+'" opacity=".6" stroke-width="2.0" fill="none"/><text x="270" y="94" text-anchor="middle" font-family="Georgia,serif" font-size="29" letter-spacing="6" fill="'+gold+'">HOLISTIC HOUSE</text><path d="M115 112H425 M143 842H397" stroke="'+gold+'" stroke-width="1.6" opacity=".56"/></svg>';
}
async function download(url,target,key){
 const controller=new AbortController();
 const stop=setTimeout(()=>controller.abort(),55000);
 try{
  const res=await fetch(url,{signal:controller.signal,redirect:"follow",headers:{"User-Agent":"HolisticHouseVideoBuilder/1.0 (licensed remix)"}});
  if(!res.ok)throw Error(key+" HTTP "+res.status);
  if(!/video\/mp4|application\/octet-stream/.test(res.headers.get("content-type")||""))throw Error(key+" not video");
  const chunks=[];let total=0;
  for await(const part of res.body){
   total+=part.length;
   if(total>95000000)throw Error(key+" too large");
   chunks.push(part);
  }
  const bytes=Buffer.concat(chunks);
  if(total<8000||!bytes.subarray(0,48).includes(Buffer.from("ftyp")))throw Error(key+" invalid MP4");
  await writeFile(target,bytes);
  process.stdout.write(key+": "+Math.round(total/1024)+" KiB\n");
 }finally{clearTimeout(stop);}
}
function run(args,tag,timeout=180000){
 const p=spawnSync(ffmpeg,["-hide_banner","-loglevel","error","-nostdin","-y",...args],
  {encoding:"utf8",timeout,maxBuffer:2*1024*1024});
 if(p.status!==0||p.error)throw Error(tag+" ffmpeg failed: "+(p.error?.message||p.stderr||p.status).slice(-2100));
}
async function main(){
 if(process.env.HH_MONEY_VIDEO_RENDER_APPROVED!=="true")throw Error("Video builder requires explicit approval flag");
 if(!ffmpeg)throw Error("ffmpeg-static missing");
 const root=await mkdtemp(join(tmpdir(),"hh-stock-film-"));
 const cache=new Map(),results=[];
 await mkdir(OUTPUT,{recursive:true});
 try{
  for(const scene of clips){
   for(const key of [scene[1],scene[2]]){
    if(cache.has(key))continue;
    const tmp=join(root,key+".mp4");
    await download(CDN+encodeURIComponent(files[key]),tmp,key);
    cache.set(key,tmp);
   }
   const base=join(root,scene[0]+"-base.png"),art=join(root,scene[0]+"-art.png");
   await sharp(Buffer.from(svg(scene,true))).png().toFile(base);
   await sharp(Buffer.from(svg(scene,false))).png().toFile(art);
   const out=join(OUTPUT,scene[0]+".mp4");
   const graph=[
    "[0:v]fps=20,format=yuv420p[bg]",
    "[1:v]fps=20,scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1,format=yuv420p[main]",
    "[bg][main]blend=all_mode=screen:all_opacity=0.93[lit]",
    "[2:v]fps=20,scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1,format=yuv420p[fx]",
    "[lit][fx]blend=all_mode=screen:all_opacity=0.57[mix]",
    "[3:v]format=rgba[brand]",
    "[mix][brand]overlay=0:0:format=auto,format=yuv420p[v]"
   ].join(";");
   run([
    "-loop","1","-framerate","20","-i",base,
    "-stream_loop","-1","-i",cache.get(scene[1]),
    "-stream_loop","-1","-i",cache.get(scene[2]),
    "-loop","1","-framerate","20","-i",art,
    "-filter_complex",graph,"-map","[v]","-an","-t","5","-r","20",
    "-c:v","libx264","-preset","veryfast","-crf","21","-maxrate","2800k",
    "-bufsize","5600k","-pix_fmt","yuv420p","-movflags","+faststart",
    "-threads","2","-filter_complex_threads","2",out
   ],scene[0]);
   const poster=join(OUTPUT,scene[0]+".jpg");
   run(["-ss","1.3","-i",out,"-frames:v","1","-vf","scale=360:640","-q:v","5",poster],scene[0]+" poster",45000);
   const bytes=(await stat(out)).size;
   if(bytes<18000||bytes>6000000)throw Error(scene[0]+" suspicious video size "+bytes);
   run(["-i",out,"-frames:v","2","-f","null","-"],scene[0]+" decode",40000);
   results.push({id:scene[0],video:"/videos/holistic-house/money-films-v1/"+scene[0]+".mp4",
    poster:"/videos/holistic-house/money-films-v1/"+scene[0]+".jpg",
    bytes,durationSeconds:5,width:720,height:1280});
   process.stdout.write("VIDEO "+scene[0]+" "+Math.round(bytes/1024)+" KiB\n");
  }
  await writeFile(join(OUTPUT,"manifest.json"),JSON.stringify({
   version:1,format:"h264-mp4",sourceLicense:"https://supareels.com/stock-footage-licence",scenes:results
  },null,2)+"\n");
 }finally{await rm(root,{recursive:true,force:true});}
}
await main();
