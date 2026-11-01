/**
 * Holistic House original instrumental melody masters (v2).
 * All notes, harmonies and timbres are composed / synthesized in this repo:
 * no commercial recordings, stock loops, cloud AI, external services or API keys.
 * Run: node scripts/generate-mandala-melodies.mjs
 * Dry verify: node scripts/generate-mandala-melodies.mjs --check
 */
import {writeFileSync,mkdirSync,readFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";

// Unique 8-bar melodic forms with four-bar harmonic movement and an answering
// second phrase. MIDI pitch is scale-quantized to avoid harsh non-chord noise.
export const SONGS=[
  {id:"warm-morning",key:48,mode:"major",chords:[0,4,5,3],motif:[4,2,0,2,4,5,4,2],lead:"piano",back:"harp",color:0},
  {id:"wings-of-light",key:50,mode:"lydian",chords:[0,3,4,0],motif:[0,2,4,5,7,5,4,2],lead:"celesta",back:"piano",color:3},
  {id:"heart-harmony",key:53,mode:"major",chords:[5,3,0,4],motif:[2,4,2,0,null,1,2,4],lead:"piano",back:"strings",color:1},
  {id:"quiet-stars",key:50,mode:"minor",chords:[0,5,3,6],motif:[4,null,2,1,0,null,2,4],lead:"flute",back:"celesta",color:0},
  {id:"bright-path",key:52,mode:"major",chords:[0,4,5,3],motif:[0,2,4,7,5,4,2,4],lead:"piano",back:"marimba",color:3},
  {id:"harmony",key:48,mode:"major",chords:[0,5,3,4],motif:[4,2,0,2,1,0,2,4],lead:"piano",back:"strings",color:0},
  {id:"prosperity",key:55,mode:"major",chords:[0,4,5,3],motif:[2,4,7,5,4,2,0,2],lead:"harp",back:"piano",color:3},
  {id:"energy",key:57,mode:"dorian",chords:[0,3,6,4],motif:[0,2,4,2,5,4,2,0],lead:"marimba",back:"piano",color:3},
  {id:"love",key:53,mode:"major",chords:[0,3,5,4],motif:[2,4,2,null,1,0,2,4],lead:"piano",back:"harp",color:1},
  {id:"meditation",key:50,mode:"minor",chords:[0,5,3,6],motif:[0,null,2,4,null,2,1,0],lead:"flute",back:"strings",color:0},
  {id:"focus",key:52,mode:"major",chords:[0,4,3,0],motif:[4,2,1,2,4,2,0,1],lead:"kalimba",back:"piano",color:2},
  {id:"grounding",key:48,mode:"dorian",chords:[0,3,4,0],motif:[0,2,1,0,null,2,4,2],lead:"handpan",back:"strings",color:0},
  {id:"sunrise",key:55,mode:"major",chords:[0,3,4,0],motif:[0,2,4,5,7,5,2,4],lead:"celesta",back:"harp",color:2},
  {id:"soft-piano",key:48,mode:"major",chords:[0,4,5,3],motif:[4,2,0,2,4,5,2,0],lead:"piano",back:"strings",color:0},
  {id:"kalimba",key:57,mode:"pentatonic",chords:[0,3,4,0],motif:[0,2,4,2,1,0,2,4],lead:"kalimba",back:"harp",color:2},
  {id:"harp",key:53,mode:"major",chords:[0,5,3,4],motif:[0,2,4,7,5,4,2,0],lead:"harp",back:"strings",color:0},
  {id:"flute",key:50,mode:"dorian",chords:[0,3,6,4],motif:[4,null,2,4,5,4,2,1],lead:"flute",back:"harp",color:1},
  {id:"celesta",key:55,mode:"lydian",chords:[0,4,3,0],motif:[2,4,7,4,5,2,0,2],lead:"celesta",back:"strings",color:2},
  {id:"strings",key:53,mode:"major",chords:[0,4,5,3],motif:[4,2,1,0,2,4,5,4],lead:"strings",back:"piano",color:0},
  {id:"marimba",key:52,mode:"major",chords:[0,3,5,4],motif:[0,2,4,2,5,7,4,2],lead:"marimba",back:"harp",color:3},
  {id:"lullaby",key:48,mode:"major",chords:[0,5,3,4],motif:[2,null,4,2,0,null,1,2],lead:"piano",back:"celesta",color:0},
  {id:"handpan",key:50,mode:"dorian",chords:[0,3,4,0],motif:[0,4,2,1,0,2,4,2],lead:"handpan",back:"flute",color:1},
  // Newly synthesized performances of old public-domain themes; no borrowed recordings.
  {id:"ode-to-joy",key:48,mode:"major",chords:[0,0,3,4],motif:[2,2,3,4,4,3,2,1],lead:"piano",back:"strings",color:1},
  {id:"greensleeves",key:57,mode:"minor",chords:[0,4,5,3],motif:[0,2,3,4,5,4,3,1],lead:"flute",back:"harp",color:0},
];
export const MASTER_IDS=Object.freeze(SONGS.map(x=>x.id));
export const SAMPLE_RATE=22050;
export const DURATION_SECONDS=32;
const SCALES={
  major:[0,2,4,5,7,9,11],
  minor:[0,2,3,5,7,8,10],
  dorian:[0,2,3,5,7,9,10],
  lydian:[0,2,4,6,7,9,11],
  pentatonic:[0,2,4,7,9,12,14]
};
const TAU=Math.PI*2;
const midiFreq=n=>440*Math.pow(2,(n-69)/12);
const toMidi=(song,degree,octave=0)=>{
  const scale=SCALES[song.mode];
  const length=scale.length;
  return song.key+scale[((degree%length)+length)%length]+
    12*(Math.floor(degree/length)+octave);
};
function melodicRegister(note,previous){
  const candidates=[note-24,note-12,note,note+12,note+24]
    .filter(n=>n>=68&&n<=88);
  return candidates.sort((a,b)=>Math.abs(a-previous)-Math.abs(b-previous))[0]??note;
}
const max=(x,a,b)=>Math.max(a,Math.min(b,x));
const TONES={
  piano:(p,t)=>Math.sin(p)*.67+Math.sin(p*2.005)*.25+Math.sin(p*3.012)*.09,
  harp:(p,t)=>Math.sin(p)*.79+Math.sin(p*2)*.13+Math.sin(p*3.007)*.07,
  flute:(p,t)=>Math.sin(p+Math.sin(t*5.1*TAU)*.008)*.90+Math.sin(2*p)*.08,
  strings:(p,t)=>Math.sin(p)*.65+Math.sin(p*2)*.19+Math.sin(p*3)*.09+Math.sin(p*.997)*.09,
  celesta:(p,t)=>Math.sin(p)*.73+Math.sin(p*2.76)*.21+Math.sin(p*4.13)*.09,
  kalimba:(p,t)=>Math.sin(p)*.82+Math.sin(p*2.49)*.16+Math.sin(p*3.71)*.09,
  marimba:(p,t)=>Math.sin(p)*.78+Math.sin(p*3.05)*.16+Math.sin(p*4.12)*.08,
  handpan:(p,t)=>Math.sin(p)*.78+Math.sin(p*1.51)*.15+Math.sin(p*2.01)*.12
};
const soundEnvelope=(t,d,kind)=>{
  const sustain=kind==="strings"||kind==="flute";
  const attack=sustain?.11:.014;
  const release=sustain?.20:.12;
  const decay=kind==="harp"||kind==="kalimba"||kind==="marimba"?1.8:
    kind==="celesta"?1.4:kind==="piano"?1.15:kind==="handpan"?.85:.09;
  return max(t/attack,0,1)*Math.exp(-t*decay)*max((d-t)/release,0,1);
};

export function renderMelody(song){
  if(!SONGS.includes(song))throw Error("unapproved_original_score");
  const rate=SAMPLE_RATE,n=rate*DURATION_SECONDS;
  const signal=new Float32Array(n);
  function note(midi,start,duration,amp,kind){
    if(midi===null||midi===undefined||duration<=0)return;
    const frequency=midiFreq(midi);
    const first=Math.max(0,Math.floor(start*rate));
    const count=Math.min(n-first,Math.ceil(duration*rate));
    if(count<=0)return;
    const tone=TONES[kind]||TONES.piano;
    for(let i=0;i<count;i++){
      const t=i/rate;
      const env=soundEnvelope(t,duration,kind);
      signal[first+i]+=amp*env*tone(TAU*frequency*t,t);
    }
  }
  let lastMelody=76;
  for(let bar=0;bar<8;bar++){
    const chordDegree=song.chords[bar%4];
    const start=bar*4;
    // A changing, four-chord harmonic progression rather than a static drone.
    const triad=[0,2,4,6].map(offset=>toMidi(song,chordDegree+offset,1));
    note(toMidi(song,chordDegree,-1),start,3.65,.105,"piano");
    for(let v=0;v<4;v++) note(triad[v],start,3.72,.033+(v===0?.009:0),"strings");
    // Arpeggiated accompaniment with rests and sparse counterpoint.
    const arp=[0,1,2,1,3,2,1,2];
    for(let j=0;j<8;j++){
      const midi=triad[arp[(j+(song.color%2))%8]]+12;
      note(midi,start+j*.5+.04,.38,.057,song.back);
    }
    if(bar%2===0){
      note(triad[3]+12,start+.08,1.32,.047,"celesta");
    }
    // The second four-bar phrase answers the first through melodic variation;
    // cadences resolve on chord tones; an occasional rest preserves breathing.
    for(let j=0;j<8;j++){
      let offset=song.motif[j];
      if(offset===null)continue;
      if(bar>=4 && j===5)offset+=song.color%2===0?-1:1;
      if(j===7 && bar%4===3)offset=0;
      const desired=toMidi(song,chordDegree+offset,2);
      const pitch=melodicRegister(desired,lastMelody);
      lastMelody=pitch;
      const sparse=(song.motif.filter(x=>x===null).length>1);
      const duration=(sparse&&j%3===0)?.74:.43;
      const velocity=(j===0||j===4)?1.04:.82;
      note(pitch,start+j*.5+.012,duration,(.145+song.color*.011)*velocity,song.lead);
    }
  }
  // Original stereo-like space as short deterministic delays, no samples.
  const reflection=Math.round(rate*.211),late=Math.round(rate*.487);
  for(let i=reflection;i<n;i++){
    signal[i]+=.15*signal[i-reflection];
    if(i>=late)signal[i]+=.08*signal[i-late];
  }
  let peak=0;
  for(let i=0;i<n;i++)peak=Math.max(peak,Math.abs(signal[i]));
  const gain=Math.min(1.7,.78/(peak||1));
  const buf=Buffer.alloc(44+n*2),v=new DataView(buf.buffer,buf.byteOffset,buf.byteLength);
  buf.write("RIFF",0);v.setUint32(4,36+n*2,true);buf.write("WAVE",8);
  buf.write("fmt ",12);v.setUint32(16,16,true);v.setUint16(20,1,true);
  v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);
  v.setUint16(32,2,true);v.setUint16(34,16,true);
  buf.write("data",36);v.setUint32(40,n*2,true);
  for(let i=0;i<n;i++){
    // Seam guard avoids clicks when the native player loops a 32-second score.
    const edge=Math.min(1,i/(rate*.075),(n-1-i)/(rate*.075));
    const value=Math.tanh(signal[i]*gain*1.12)*.86*Math.max(0,edge);
    v.setInt16(44+i*2,Math.round(max(value,-1,1)*32767),true);
  }
  return buf;
}
const out=resolve(dirname(fileURLToPath(import.meta.url)),"../public/audio/mandala");
const direct=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
export function writeMelodyMasters({verify=false}={}){
  if(!verify)mkdirSync(out,{recursive:true});
  const report=[];
  for(const song of SONGS){
    const pcm=renderMelody(song),path=resolve(out,song.id+".wav");
    if(verify){
      const published=readFileSync(path);
      if(!pcm.equals(published))throw Error("original_melody_master_mismatch_"+song.id);
    }else writeFileSync(path,pcm);
    const hash=createHash("sha256").update(pcm).digest("hex");
    report.push({id:song.id,seconds:DURATION_SECONDS,bytes:pcm.byteLength,sha256:hash});
  }
  return {verified:verify,masters:report.length,songs:report};
}
if(direct)console.log(JSON.stringify(writeMelodyMasters({verify:process.argv.includes("--check")}),null,2));
