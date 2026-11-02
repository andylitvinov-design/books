/**
 * Holistic Light — Warm & Alive, dependency-free UI evidence checker.
 * Scores requiring taste, visual image QA, or actual provider outcomes stay HUMAN.
 * Inspect only anonymous public page snapshots from capture-public-ui-reference.mjs.
 */
export const DESIGN_BIBLE_VERSION = "1.1";

export const HOLISTIC_LIGHT = Object.freeze({
  canvas: "#FCF9F2", surface: "#FFFFFF", surfaceSoft: "#F8F5EF",
  ink: "#143D3A", editorialInk: "#17334B", secondaryInk: "#5D6A71",
  border: "#E7E3DA", primary: "#067A67", primarySoft: "#E6F6F1",
  warmSunrise: Object.freeze({
    canvas: "#FFF9F3", ink: "#10231F", primary: "#02774B",
    selected: "#E8F6EA",
  }),
  category: Object.freeze({
    energy: "#EAF7F7", money: "#FBF2DE", relationships: "#FCECF2",
    confidence: "#F2ECFB", calm: "#EAF8EF",
  }),
});

const rgb = hex => {
  if (!/^#[a-f\d]{6}$/i.test(hex)) throw new TypeError("Expected full #RRGGBB color");
  return [1,3,5].map(i => Number.parseInt(hex.slice(i,i+2),16));
};
const luminance = hex => {
  const value = rgb(hex).map(v => {
    const s=v/255;
    return s <= 0.04045 ? s/12.92 : ((s+0.055)/1.055)**2.4;
  });
  return value[0]*0.2126+value[1]*0.7152+value[2]*0.0722;
};
export function contrastRatio(foreground,background) {
  const a=luminance(foreground),b=luminance(background);
  return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
}
const number = value => Number.parseFloat(String(value??""));
const visibleSize = item => item && item.box && Number.isFinite(item.box.w)
  && Number.isFinite(item.box.h) && item.box.w>0 && item.box.h>0;
const isPrimary = item => /(?:primary|submit|cta|continue|action|next|start)/i
  .test([item.className,item.id,item.testid].filter(Boolean).join(" "));
const COLOR_SURFACE = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i;
function inspectSurface(item) {
  const color=item?.style?.background??"";
  const match=color.match(COLOR_SURFACE);
  if (!match || /rgba\([^)]*,\s*0(?:\.0+)?\s*\)/i.test(color)) return null;
  const [,r,g,b]=match.map(Number);
  return {tag:item.tag,color,r,g,b,area:item.box.w*item.box.h};
}

/**
 * This is a measurable, non-subjective subset of Design QA.
 * No passing output claims visual match, functional E2E, or a 100-point design score.
 */
export function auditPublicSnapshot(snapshot) {
  if (!snapshot || !snapshot.viewport || !Array.isArray(snapshot.landmarks)
      || !Number.isFinite(snapshot.viewport.width))
    throw new TypeError("Expected a captured public-page snapshot with viewport and landmarks");
  const {viewport,landmarks}=snapshot;
  const critical=[],review=[],info=[];
  const add=(list,code,message,detail)=>list.push({code,message,...(detail?{detail}:{})});
  if(!Number.isFinite(viewport.scrollWidth)) {
    add(critical,"NO_SCROLL_WIDTH","Viewport width measurement is missing");
  } else if(viewport.scrollWidth>viewport.width+2) {
    add(critical,"HORIZONTAL_OVERFLOW","Page is wider than its viewport",
      {viewport:viewport.width,scrollWidth:viewport.scrollWidth});
  }
  const h1=landmarks.filter(x=>x.tag==="h1"&&visibleSize(x));
  if(h1.length===0) add(review,"MISSING_H1","No visible H1 among sampled landmarks; inspect full DOM");
  if(h1.length>1) add(review,"MULTIPLE_H1","More than one visible H1; check heading hierarchy");
  for (const item of h1) {
    if(number(item.style?.fontSize)<28)
      add(review,"SMALL_H1","Mobile H1 may be too small for the design bible",
        {fontSize:item.style?.fontSize,label:item.label});
  }
  const interactive=landmarks.filter(x=>visibleSize(x)&&["button","a"].includes(x.tag));
  for(const item of interactive){
    if(item.box.w>=44&&item.box.h>=44) continue;
    if(item.tag==="button"||isPrimary(item)) {
      add(critical,"SMALL_TOUCH_TARGET","A button or primary action is below 44×44 CSS px",
        {element:item.tag,label:item.label,box:item.box});
    } else {
      add(review,"SMALL_LINK_TARGET","Review linked text target size and adjacent spacing",
        {label:item.label,box:item.box});
    }
  }
  const largeSurface=landmarks
    .filter(x=>["main","section","article"].includes(x.tag)&&visibleSize(x)
      && x.box.w>=viewport.width*0.65&&x.box.h>=90)
    .map(inspectSurface).filter(Boolean);
  const tint=largeSurface.filter(x=>x.g>x.r+7&&x.g>x.b+7);
  if(tint.length) add(review,"GREEN_CAST","Large pale-green surfaces: inspect whether these are intentional themed sections",
    {samples:tint.slice(0,5)});
  if(largeSurface.length===0) add(info,"SURFACE_UNDETERMINED","Computed main/background surfaces need visual review");
  if(interactive.length===0) add(info,"CONTROLS_UNSAMPLED","First 200 landmarks may not contain all interactive controls");
  if(landmarks.length>=200) add(info,"SAMPLE_LIMIT","Capture samples at most 200 landmarks; do not treat unseen content as passed");
  return {
    schema:"hh.holistic-light.public-snapshot.v1",
    designBibleVersion:DESIGN_BIBLE_VERSION,
    page:snapshot.pathname??null,
    viewport, sampledLandmarks:landmarks.length,
    outcome:critical.length?"BLOCKED":"AUTOMATED_CHECKS_PASS_MANUAL_REVIEW_PENDING",
    critical,review,info,
    automatedChecks:{
      viewportOverflow:critical.some(x=>x.code==="HORIZONTAL_OVERFLOW"||x.code==="NO_SCROLL_WIDTH")?"FAIL":"PASS",
      sampledTouchTargets:critical.some(x=>x.code==="SMALL_TOUCH_TARGET")?"FAIL":"PASS",
      headings:h1.length?"OBSERVED":"REVIEW",
    },
    manualReviewRequired:[
      "Page identity: same route, auth state, locale, step and browser viewport as reference",
      "Color warmth / no monotonous green-gray wash; approved theme variant respected",
      "Real photo brightness, crop, poster, legibility and provenance",
      "One meaningful CTA and intuitive hierarchy; content density and readable cards",
      "Typography EN/RU/ES; visual focus, error/selected/disabled/loading states",
      "Reference screenshot overlay/diff and real click/submit/save/navigation behavior",
    ],
    evidenceLevel:"PUBLIC GUEST CSS/DOM GEOMETRY ONLY — NOT visual fidelity or protected E2E",
  };
}
