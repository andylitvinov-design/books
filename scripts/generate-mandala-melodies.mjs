/**
 * Rebuild the five original Holistic House instrumental WAV masters.
 * First-party synthesized music: no samples, third-party songs, API or usage fee.
 * node scripts/generate-mandala-melodies.mjs
 */
import { writeFileSync,mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve,dirname } from "node:path";
const songs=[
  {
    "id": "warm-morning",
    "title": "Warm Morning",
    "chords": [
      [
        48,
        52,
        55,
        59
      ],
      [
        43,
        47,
        50,
        57
      ],
      [
        45,
        48,
        52,
        55
      ],
      [
        41,
        45,
        48,
        52
      ]
    ],
    "melody": [
      76,
      79,
      84,
      79,
      76,
      72,
      74,
      76,
      79,
      83,
      86,
      83,
      79,
      74,
      76,
      79,
      81,
      84,
      88,
      84,
      81,
      76,
      72,
      76,
      77,
      81,
      84,
      81,
      79,
      76,
      72,
      76
    ],
    "piano": 0.64,
    "pad": 0.09,
    "bell": 0.15,
    "pulse": false
  },
  {
    "id": "wings-of-light",
    "title": "Wings of Light",
    "chords": [
      [
        43,
        47,
        50,
        55
      ],
      [
        50,
        54,
        57,
        62
      ],
      [
        52,
        55,
        59,
        64
      ],
      [
        48,
        52,
        55,
        60
      ]
    ],
    "melody": [
      79,
      83,
      86,
      88,
      86,
      83,
      79,
      81,
      81,
      86,
      90,
      86,
      83,
      81,
      79,
      81,
      83,
      86,
      88,
      91,
      88,
      86,
      83,
      79,
      84,
      88,
      91,
      88,
      86,
      84,
      81,
      79
    ],
    "piano": 0.7,
    "pad": 0.09,
    "bell": 0.18,
    "pulse": true
  },
  {
    "id": "heart-harmony",
    "title": "Heart Harmony",
    "chords": [
      [
        41,
        45,
        48,
        52
      ],
      [
        48,
        52,
        55,
        60
      ],
      [
        50,
        53,
        57,
        60
      ],
      [
        46,
        50,
        53,
        57
      ]
    ],
    "melody": [
      72,
      76,
      77,
      76,
      72,
      69,
      72,
      74,
      76,
      79,
      84,
      79,
      76,
      74,
      72,
      69,
      74,
      77,
      81,
      77,
      74,
      72,
      69,
      72,
      74,
      77,
      81,
      84,
      81,
      77,
      74,
      72
    ],
    "piano": 0.52,
    "pad": 0.15,
    "bell": 0.09,
    "pulse": false
  },
  {
    "id": "quiet-stars",
    "title": "Quiet Stars",
    "chords": [
      [
        50,
        53,
        57,
        60
      ],
      [
        46,
        50,
        53,
        58
      ],
      [
        41,
        45,
        48,
        53
      ],
      [
        48,
        52,
        55,
        60
      ]
    ],
    "melody": [
      74,
      null,
      77,
      81,
      79,
      null,
      77,
      74,
      72,
      null,
      74,
      77,
      81,
      null,
      79,
      77,
      74,
      null,
      72,
      69,
      72,
      null,
      74,
      77,
      76,
      null,
      74,
      72,
      69,
      null,
      72,
      74
    ],
    "piano": 0.45,
    "pad": 0.18,
    "bell": 0.1,
    "pulse": false
  },
  {
    "id": "bright-path",
    "title": "Bright Path",
    "chords": [
      [
        52,
        55,
        59,
        64
      ],
      [
        48,
        52,
        55,
        60
      ],
      [
        43,
        47,
        50,
        55
      ],
      [
        50,
        54,
        57,
        62
      ]
    ],
    "melody": [
      83,
      86,
      88,
      91,
      88,
      86,
      83,
      86,
      84,
      88,
      91,
      88,
      84,
      81,
      84,
      88,
      83,
      86,
      91,
      95,
      91,
      88,
      86,
      83,
      86,
      88,
      93,
      91,
      88,
      86,
      83,
      79
    ],
    "piano": 0.66,
    "pad": 0.08,
    "bell": 0.15,
    "pulse": true
  }
];
function renderMelody(spec){
  const rate=22050,seconds=16,count=rate*seconds,signal=new Float32Array(count),tau=Math.PI*2;
  const freq=n=>440*Math.pow(2,(n-69)/12);
  function note(midi,start,duration,amp,kind){
    if(midi==null)return;
    const f=freq(midi),first=Math.max(0,Math.floor(start*rate)),size=Math.min(count-first,Math.ceil(duration*rate));
    const decay=kind==="lead"?.9:kind==="arp"?2.35:kind==="bell"?1.18:kind==="bass"?.72:.08;
    for(let j=0;j<size;j++){
      const t=j/rate,attack=1-Math.exp(-t*(kind==="pad"?3.8:80));
      const release=Math.min(1,Math.max(0,(duration-t)/(kind==="pad"?.27:.11)));
      const envelope=attack*Math.exp(-decay*t)*release;
      const phase=tau*f*t;
      const tone=kind==="pad" ? (.7*Math.sin(phase)+.28*Math.sin(phase*1.004))
        :kind==="bell" ? (.75*Math.sin(phase)+.22*Math.sin(phase*2.001)+.16*Math.sin(phase*3.99))
        :kind==="bass" ? (.9*Math.sin(phase)+.15*Math.sin(phase*2))
        :(.68*Math.sin(phase)+.28*Math.sin(phase*2)+.10*Math.sin(phase*3));
      signal[first+j]+=amp*envelope*tone;
    }
  }
  for(let bar=0;bar<8;bar++){
    const chord=spec.chords[bar%4], start=bar*2;
    for(let k=1;k<4;k++)note(chord[k],start,1.93,spec.pad,"pad");
    note(chord[0]-12,start,1.82,.125,"bass");
    note(chord[0]-12,start+1,0.69,.075,"bass");
    const arps=[1,2,3,2];
    for(let beat=0;beat<4;beat++)note(chord[arps[beat]]+12,start+beat*.5,.44,.14,"arp");
    if(bar%2===0)note(chord[3]+12,start+.02,1.08,spec.bell,"bell");
  }
  for(let i=0;i<spec.melody.length;i++)note(spec.melody[i],i*.5,.43,spec.piano,"lead");
  if(spec.pulse) for(let i=0;i<16;i++)note(i%4===0?45:57,i,0.14,.045,"bass");
  const delay=Math.floor(.23*rate);
  for(let i=delay;i<count;i++)signal[i]+=signal[i-delay]*.16;
  let peak=0;for(let i=0;i<count;i++)peak=Math.max(peak,Math.abs(signal[i]));
  const scale=Math.min(1.5,.82/(peak||1));
  const bytes=new Uint8Array(44+count*2),v=new DataView(bytes.buffer);
  function write(offset,s){for(let i=0;i<s.length;i++)v.setUint8(offset+i,s.charCodeAt(i));}
  write(0,"RIFF");v.setUint32(4,36+count*2,true);write(8,"WAVE");write(12,"fmt ");
  v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);
  write(36,"data");v.setUint32(40,count*2,true);
  for(let i=0;i<count;i++){
    const edge=Math.min(1,i/(rate*.12),(count-1-i)/(rate*.15));
    const value=Math.tanh(signal[i]*scale*1.12)*.8*Math.max(0,edge);
    v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,value))*32767),true);
  }
  return bytes;
}
const output=resolve(dirname(fileURLToPath(import.meta.url)),"../public/audio/mandala");
mkdirSync(output,{recursive:true});
for(const song of songs)writeFileSync(resolve(output,song.id+".wav"),renderMelody(song));
