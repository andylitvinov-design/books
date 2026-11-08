/**
 * Holistic House professional-video watermark v1.
 * Uses the geometric HH mark already present in public/holistic-house-app.svg.
 * Never reads customer data or downloads external media; stamping is local.
 * IMPORTANT: a client-side Canvas stamp is NOT proof for public/server uploads.
 */
export const VIDEO_EXPORT_POLICY_VERSION = 'hh-video-export-v1'
export const VIDEO_BRAND_STAMP_VERSION = 'hh-video-hh-mark-v1'

export function resolveVideoExportVariant({professionalMode=false, capability=null}={}) {
  if (!professionalMode) return 'none'
  // Neither Video Studio's Smart/Pro creative mode nor the client billing
  // adFree flag grants clean export. Only an authenticated server response can.
  return capability?.policyVersion === VIDEO_EXPORT_POLICY_VERSION &&
    capability?.canExportClean === true && capability?.grantType === 'pilot'
    ? 'clean' : 'branded'
}

/** Raw catalogue files are permitted only as an explicitly unedited personal fallback.
 * Professional video downloads must always go through the stamped renderer.
 * This is a UI policy, not server-side publication attestation.
 */
export function canOfferOriginalVideoSource(professionalMode=false) {
  return professionalMode !== true
}

export function videoBrandStampLayout(width,height) {
  if (!Number.isFinite(width)||!Number.isFinite(height)||width<160||height<160)
    throw Error('VIDEO_BRAND_INVALID_DIMENSIONS')
  const short=Math.min(width,height)
  const portrait=height>width*1.2
  const landscape=width>height*1.2
  const padding=Math.round(short*.032)
  const stampWidth=Math.round(width*(portrait?.31:landscape?.18:.26))
  const iconSize=Math.max(18,Math.round(short*.048))
  const stampHeight=Math.max(34,Math.round(iconSize*1.48))
  return {
    x:Math.round(width-padding-stampWidth), y:padding,
    width:stampWidth, height:stampHeight,
    iconSize, fontSize:Math.max(12,Math.round(short*.025)),
    interiorPad:Math.max(6,Math.round(iconSize*.18)),
  }
}

/** Draw AFTER subtitles and other overlays, on every exported video frame. */
export function paintVideoBrandStamp(ctx,variant) {
  if (variant!=='branded') return
  const {width,height}=ctx.canvas
  const p=videoBrandStampLayout(width,height)
  const {x,y,iconSize,interiorPad}=p
  const iconX=x+interiorPad, iconY=y+(p.height-iconSize)/2
  ctx.save()
  try {
    ctx.globalAlpha=.87
    ctx.fillStyle='rgba(12,38,36,.81)'
    const r=Math.max(7,Math.round(p.height*.20))
    ctx.beginPath()
    ctx.moveTo(x+r,y)
    ctx.lineTo(x+p.width-r,y)
    ctx.quadraticCurveTo(x+p.width,y,x+p.width,y+r)
    ctx.lineTo(x+p.width,y+p.height-r)
    ctx.quadraticCurveTo(x+p.width,y+p.height,x+p.width-r,y+p.height)
    ctx.lineTo(x+r,y+p.height)
    ctx.quadraticCurveTo(x,y+p.height,x,y+p.height-r)
    ctx.lineTo(x,y+r)
    ctx.quadraticCurveTo(x,y,x+r,y)
    ctx.closePath()
    ctx.fill()
    // This HH glyph mirrors the two linked H letterforms in the existing
    // official app mark; it does not introduce a new emblem or font download.
    ctx.strokeStyle='#F6FBF8'
    ctx.lineWidth=Math.max(1.5,iconSize*.078)
    ctx.lineCap='round'
    ctx.lineJoin='round'
    const segment=(ax,ay,bx,by)=>{
      ctx.beginPath()
      ctx.moveTo(iconX+ax*iconSize,iconY+ay*iconSize)
      ctx.lineTo(iconX+bx*iconSize,iconY+by*iconSize)
      ctx.stroke()
    }
    segment(.12,.16,.12,.83)
    segment(.45,.16,.45,.83)
    segment(.12,.49,.45,.49)
    segment(.60,.16,.60,.83)
    segment(.91,.16,.91,.83)
    segment(.60,.49,.91,.49)
    ctx.font=`600 ${p.fontSize}px system-ui, sans-serif`
    ctx.fillStyle='#F6FBF8'
    ctx.textAlign='left'
    ctx.textBaseline='middle'
    const textX=iconX+iconSize+interiorPad*.7
    ctx.fillText('Holistic House',textX,y+p.height/2,
      Math.max(1,x+p.width-interiorPad-textX))
  } finally {
    ctx.restore()
  }
}
