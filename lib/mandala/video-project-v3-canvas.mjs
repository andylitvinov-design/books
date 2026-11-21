import {resolveVideoFramesV3} from './video-project-v3.mjs';

const TEXT_POSITIONS = {top:0.15, center:0.5, bottom:0.85};
const TEXT_STYLES = {
  classic: ['600', 'serif', '#fff9e8'],
  cinema: ['700', 'serif', '#fff6cd'],
  minimal: ['500', 'sans-serif', '#fff'],
  glow: ['700', 'sans-serif', '#fff4bb'],
};

export function paintVideoProjectV3Frame(ctx, plan, projectMs, sourceAt) {
  const active = resolveVideoFramesV3(plan, projectMs);
  const sources = active.map(frame => sourceAt(frame.assetId, frame.sourceMs, frame.clipId));
  if (sources.some(source => !source?.image || !(source.width > 0 && source.height > 0))) {
    return false;
  }

  const {width,height} = ctx.canvas;
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,width,height);
    active.forEach((frame,index) => {
      const next = active[index+1];
      // In source-over, the incoming opacity also attenuates the outgoing
      // layer. Compensate for that overlap so a full-frame dissolve stays lit.
      const alpha = next?.layer === frame.layer && next.opacity < 1
        ? Math.min(1,frame.opacity / (1-next.opacity)) : frame.opacity;
      paintSource(ctx,frame,sources[index],width,height,alpha);
    });
    for (const track of plan.textTracks) {
      for (const cue of track.items) {
        if (projectMs >= cue.startMs && projectMs < cue.endMs) {
          paintTitle(ctx,cue,width,height);
        }
      }
    }
  } finally {
    ctx.restore();
  }
  return true;
}

function paintSource(ctx,frame,{image,width:sourceWidth,height:sourceHeight},width,height,alpha) {
  const {scale,x,y,rotation} = frame.transform;
  const cropScale = Math.max(width/sourceWidth,height/sourceHeight);
  const cropWidth = width/cropScale;
  const cropHeight = height/cropScale;
  ctx.save();
  try {
    ctx.globalAlpha = alpha;
    ctx.translate(width*(0.5+x),height*(0.5+y));
    ctx.rotate(rotation * Math.PI/180);
    ctx.scale(scale,scale);
    if (frame.mask !== 'none') {
      ctx.beginPath();
      if (frame.mask === 'circle') ctx.arc(0,0,Math.min(width,height)/2,0,Math.PI*2);
      else ctx.roundRect(-width/2,-height/2,width,height,Math.min(width,height)*0.08);
      ctx.clip();
    }
    ctx.drawImage(image,(sourceWidth-cropWidth)/2,(sourceHeight-cropHeight)/2,
      cropWidth,cropHeight,-width/2,-height/2,width,height);
  } finally {
    ctx.restore();
  }
}

function paintTitle(ctx,cue,width,height) {
  const [weight,family,color] = TEXT_STYLES[cue.style];
  const size = Math.max(12,Math.round(Math.min(width,height)*0.068));
  const y = height*TEXT_POSITIONS[cue.position];
  ctx.globalAlpha = 1;
  ctx.font = weight + ' ' + size + 'px ' + family;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2,size*0.15);
  ctx.strokeStyle = '#161616';
  ctx.fillStyle = color;
  ctx.strokeText(cue.text,width/2,y,width*0.88);
  ctx.fillText(cue.text,width/2,y,width*0.88);
}
