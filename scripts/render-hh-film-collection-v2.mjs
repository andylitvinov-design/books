/**
 * One-time, no-paid-API film builder.
 * Curated first-party Full HD motion templates from licensed Supareels footage,
 * with additional animated light layer, per-theme colour and bespoke brand art.
 * Raw supplier clips exist ONLY in an isolated tmp directory, never public/.
 *
 * Commercial editing: https://supareels.com/stock-footage-licence
 * No recognizable real people, actual medical claims or locations.
 */
import {mkdtemp,mkdir,writeFile,rm,stat,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {createRequire} from "node:module";
import sharp from "sharp";

const require=createRequire(import.meta.url);
const ffmpeg=require("ffmpeg-static");
const ROOT=resolve("public/videos/holistic-house/film-collection-v2");
const prefix="https://supareels.com/api/download?path=";
const licence="https://supareels.com/stock-footage-licence";
const sources={
  snow:"/clips/mountains/aerial-snow-ridge.portrait.mp4",
  valley:"/clips/mountains/valley-mist-dawn.portrait.mp4",
  sunbeams:"/clips/forest/sunbeams-mist.portrait.mp4",
  goldenPath:"/clips/forest/golden-path.portrait.mp4",
  coast:"/clips/beach/aerial-coastline.portrait.mp4",
  canyon:"/clips/desert/canyon-slot-light.portrait.mp4",
  waves:"/clips/beach/waves-rolling.portrait.mp4",
  rapids:"/clips/waterfalls/river-rapids-rocks.portrait.mp4",
  wildflowers:"/clips/meadow/wildflower-close.portrait.mp4",
  fern:"/clips/forest/moss-ferns.portrait.mp4",
  tree:"/clips/meadow/lone-tree-field.portrait.mp4",
  meadowMist:"/clips/meadow/mist-meadow-dawn.portrait.mp4",
  calmSea:"/clips/beach/sunset-golden.portrait.mp4",
  dew:"/clips/meadow/dew-grass-dawn.portrait.mp4",
  creek:"/clips/forest/creek-rocks.portrait.mp4",
  mossFalls:"/clips/waterfalls/mossy-falls-detail.portrait.mp4",
  palms:"/clips/beach/palm-shade.portrait.mp4",
  fxGold:"/clips/overlays/gold-glitter-fall.portrait.mp4",
  fxRays:"/clips/overlays/light-rays-sweep.portrait.mp4",
  fxBokeh:"/clips/overlays/bokeh-warm.portrait.mp4",
};
// Format: id, theme, main clip key, moving overlay key, overlay opacity.
// Every selection results in a distinct, edited, branded H264 video.
const scenes=[
  ["wealth-sunrise","money","snow","fxGold",.20],
  ["golden-harvest","money","goldenPath","fxGold",.17],
  ["radiant-portal","money","canyon","fxRays",.19],
  ["prosperity-coast","money","coast","fxGold",.18],
  ["solar-surge","energy","snow","fxRays",.13],
  ["ocean-pulse","energy","waves","fxBokeh",.12],
  ["sunbeam-flow","energy","sunbeams","fxRays",.14],
  ["river-power","energy","rapids","fxBokeh",.12],
  ["desert-light","energy","canyon","fxRays",.16],
  ["mountain-air","energy","valley","fxBokeh",.11],
  ["wildflower-dance","life","wildflowers","fxBokeh",.10],
  ["fern-awakening","life","fern","fxRays",.10],
  ["coastal-freedom","life","coast","fxBokeh",.09],
  ["lone-tree","life","tree","fxRays",.10],
  ["meadow-morning","life","meadowMist","fxBokeh",.10],
  ["calm-sea","health","calmSea","fxRays",.08],
  ["morning-dew","health","dew","fxBokeh",.09],
  ["mossy-stream","health","creek","fxBokeh",.08],
  ["gentle-falls","health","mossFalls","fxRays",.09],
  ["sea-breeze","health","palms","fxBokeh",.09],
];
const palettes={
 money:{ink:"#ffe1a0",back:"#0c191c",rgb:"251,192,99"},
 energy:{ink:"#c1f1df",back:"#102f34",rgb:"116,221,184"},
 life:{ink:"#ecf4cb",back:"#173c30",rgb:"197,240,166"},
 health:{ink:"#d5f0ec",back:"#10313a",rgb:"155,220,220"},
};
function art(theme){
 const p=palettes[theme];
 const ellipses=Array.from({length:4},(_,i)=>
  '<ellipse cx="540" cy="913" rx="'+(260+i*80)+'" ry="'+(430+i*70)+'" fill="none" stroke="'+p.ink+'" stroke-width="1.9" opacity="'+(.22-i*.035)+'"/>').join("");
 const stars=Array.from({length:48},(_,i)=>{
  const x=26+1026*Math.abs(Math.sin(i*71.13));
  const y=120+1690*Math.abs(Math.sin(i*13.97));
  return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(i%6===0?3.5:1.5)+'" fill="'+p.ink+'" opacity="'+(.22+i%5*.05)+'"/>';
 }).join("");
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">'+
  '<defs><linearGradient id="v" x1="0" x2="0" y1="0" y2="1">'+
  '<stop stop-color="'+p.back+'" stop-opacity=".58"/><stop offset=".24" stop-color="'+p.back+'" stop-opacity=".02"/>'+
  '<stop offset=".76" stop-color="'+p.back+'" stop-opacity=".02"/><stop offset="1" stop-color="'+p.back+'" stop-opacity=".70"/></linearGradient></defs>'+
  '<rect width="1080" height="1920" fill="url(#v)"/>'+ellipses+stars+
  '<path d="M38 300 V95 H280 M800 95 H1042 V300 M38 1620 V1815 H280 M800 1815 H1042 V1620" stroke="'+p.ink+'" fill="none" stroke-width="3" opacity=".6"/>'+
  '<path d="M330 176 H750 M390 1758 H690" stroke="'+p.ink+'" opacity=".48" stroke-width="2"/>'+
  '<text x="540" y="151" text-anchor="middle" font-size="48" letter-spacing="10" font-family="Georgia,serif" fill="'+p.ink+'" opacity=".88">HOLISTIC HOUSE</text>'+
  '</svg>';
}
function ff(args,what,timeout=180000){
 const result=spawnSync(ffmpeg,["-hide_banner","-loglevel","error","-nostdin","-y",...args],{
  encoding:"utf8",maxBuffer:1024*1024*2,timeout
 });
 if(result.error||result.status!==0) throw Error(what+" ffmpeg: "+(result.error?.message||result.stderr||result.status).slice(-2000));
}
async function getClip(key,folder,cache){
 if(cache.has(key))return cache.get(key);
 const source=sources[key];
 if(!source)throw Error("Unknown source: "+key);
 const controller=new AbortController();
 const alarm=setTimeout(()=>controller.abort(),60000);
 try{
  const url=prefix+encodeURIComponent(source);
  const res=await fetch(url,{signal:controller.signal,redirect:"follow",
   headers:{"User-Agent":"HolisticHouse licensed-video-edit/2.0"}});
  if(!res.ok)throw Error(key+" DOWNLOAD_HTTP_"+res.status);
  const contentType=res.headers.get("content-type")||"";
  if(!/video\/mp4|application\/octet-stream/.test(contentType))
    throw Error(key+" invalid content type: "+contentType);
  const chunks=[];let length=0;
  for await(const buffer of res.body){
   length+=buffer.length;
   if(length>100_000_000)throw Error(key+" exceeds max source bytes");
   chunks.push(buffer);
  }
  const mp4=Buffer.concat(chunks);
  if(mp4.length<100_000||mp4.toString("ascii",4,8)!=="ftyp")throw Error(key+" not real MP4");
  const target=join(folder,key+".mp4");
  await writeFile(target,mp4);
  cache.set(key,target);
  process.stdout.write("LICENSED SOURCE "+key+" "+Math.round(length/1024)+"KiB\n");
  return target;
 } finally {clearTimeout(alarm);}
}
async function main(){
 if(process.env.HH_FILM_V2_RENDER_APPROVED!=="true")throw Error("one-time owner-approved renderer only");
 if(!ffmpeg)throw Error("ffmpeg-static binary missing");
 const tmp=await mkdtemp(join(tmpdir(),"hh-film-v2-"));
 const cache=new Map(),rows=[];
 await mkdir(ROOT,{recursive:true});
 try{
  for(const [id,theme,base,fx,opacity] of scenes){
   const first=await getClip(base,tmp,cache),second=await getClip(fx,tmp,cache);
   const overlay=join(tmp,id+".png");
   await sharp(Buffer.from(art(theme))).png().toFile(overlay);
   const out=join(ROOT,id+".mp4");
   const graph=[
    "[0:v]fps=24,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,eq=contrast=1.04:saturation=1.07,format=gbrp[main]",
    "[1:v]fps=24,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,format=gbrp[light]",
    "[main][light]blend=all_mode=screen:all_opacity="+opacity+"[mix]",
    "[mix]format=yuv420p[base]",
    "[2:v]format=rgba[brand]",
    "[base][brand]overlay=0:0:format=auto,format=yuv420p[v]"
   ].join(";");
   ff(["-stream_loop","-1","-i",first,
       "-stream_loop","-1","-i",second,
       "-loop","1","-framerate","24","-i",overlay,
       "-filter_complex",graph,"-map","[v]","-an","-t","5",
       "-r","24","-c:v","libx264","-preset","veryfast","-crf","20",
       "-maxrate","4200k","-bufsize","8400k","-pix_fmt","yuv420p",
       "-movflags","+faststart","-threads","2","-filter_complex_threads","2",out
   ],id,150000);
   const poster=join(ROOT,id+".jpg"),secondFrame=join(tmp,id+"-later.jpg");
   ff(["-ss","1.2","-i",out,"-frames:v","1","-vf","scale=360:640",
      "-q:v","5",poster],id+" poster",45000);
   ff(["-ss","3.5","-i",out,"-frames:v","1","-vf","scale=360:640",
      "-q:v","5",secondFrame],id+" moving-frame",45000);
   const firstHash=createHash("sha256").update(await readFile(poster)).digest("hex");
   const secondHash=createHash("sha256").update(await readFile(secondFrame)).digest("hex");
   if(firstHash===secondHash)throw Error("NO_MOTION: "+id);
   const posterStats=await sharp(poster).stats();
   if(posterStats.entropy<3)throw Error("BLANK_OR_FLAT_FOOTAGE: "+id);
   const fileSize=(await stat(out)).size;
   if(fileSize<80_000||fileSize>8_000_000)throw Error("VIDEO_SIZE_OUT_OF_RANGE "+id+" "+fileSize);
   ff(["-i",out,"-frames:v","3","-f","null","-"],id+" decode",45000);
   rows.push({id,theme,video:"/videos/holistic-house/film-collection-v2/"+id+".mp4",
    poster:"/videos/holistic-house/film-collection-v2/"+id+".jpg",
    width:1080,height:1920,fps:24,durationSeconds:5,bytes:fileSize,license:licence,
    originalSourcePage:"https://supareels.com/b-roll/"+sources[base].slice(7).replace(".portrait.mp4","")});
   process.stdout.write("MASTER "+theme+"/"+id+" "+Math.round(fileSize/1024)+"KiB motion=true\n");
  }
  if(rows.length!==20||new Set(rows.map(x=>x.id)).size!==20)throw Error("Incorrect library output count");
  await writeFile(join(ROOT,"manifest.json"),JSON.stringify({
   version:2,license:licence,format:"h264-mp4",width:1080,height:1920,fps:24,
   animated:true,sourceFootagePublished:false,scenes:rows
  },null,2)+"\n");
 } finally {await rm(tmp,{recursive:true,force:true});}
}
await main();
