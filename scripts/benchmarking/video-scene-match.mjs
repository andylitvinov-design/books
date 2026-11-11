import {spawnSync} from 'node:child_process';
const WIDTH=96, HEIGHT=54, FRAME_BYTES=WIDTH*HEIGHT;

// Edges are resistant to the editor's vignette and text overlays. The
// source must first receive the same centered cover crop as the renderer.
function edgeCorrelation(a,b){
  if(a.length!==FRAME_BYTES || b.length!==FRAME_BYTES)return 0;
  let dot=0,aa=0,bb=0;
  for(let y=8;y<42;y++)for(let x=4;x<92;x++){
    const k=y*WIDTH+x;
    for(const offset of [1,WIDTH]){
      const av=a[k]-a[k-offset],bv=b[k]-b[k-offset];
      dot+=av*bv;aa+=av*av;bb+=bv*bv;
    }
  }
  return aa&&bb?dot/Math.sqrt(aa*bb):0;
}
export function matchSceneSamples(outputFrames,sourceFrames,expected){
  if(outputFrames.length!==expected.length || sourceFrames.length!==4)throw Error('scene_source_mismatch');
  return outputFrames.map((frame,index)=>{
    const scores=sourceFrames.map(frames=>Math.max(0,...frames.map(source=>edgeCorrelation(frame,source))));
    const wanted=expected[index],best=scores[wanted],other=Math.max(...scores.filter((_,i)=>i!==wanted));
    if(!Number.isInteger(wanted)||best<0.3||best-other<0.15)throw Error('scene_source_mismatch:'+index);
    return {expected:wanted,score:best,runnerUp:other};
  });
}
export function decodeSceneFrames(file){
  const result=spawnSync('ffmpeg',['-v','error','-i',file,'-vf',
    'fps=4,scale=96:54:force_original_aspect_ratio=increase,crop=96:54,format=gray',
    '-f','rawvideo','pipe:1'],{maxBuffer:4_000_000,timeout:30000});
  if(result.error || result.status!==0 || result.stdout.length%FRAME_BYTES!==0)throw Error('scene_decode_failed');
  const frames=[];
  for(let i=0;i<result.stdout.length;i+=FRAME_BYTES)frames.push(result.stdout.subarray(i,i+FRAME_BYTES));
  if(!frames.length)throw Error('scene_decode_failed');
  return frames;
}
