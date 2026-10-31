/**
 * Deterministic browser-independent PCM16 RIFF/WAVE audio mixer.
 * Google Gemini 3.8 unary TTS WAV and our original first-party nature WAVs
 * are both PCM16 mono; never rely on Safari OfflineAudioContext rendering.
 * No uploads, streaming API or music rights lookup.
 */
export function readPcmWav(bytes) {
  if (!(bytes instanceof ArrayBuffer) || bytes.byteLength<44 || bytes.byteLength>10*1024*1024)
    throw Error("INVALID_WAV");
  const v=new DataView(bytes);
  if(v.getUint32(0,false)!==0x52494646 || v.getUint32(8,false)!==0x57415645)throw Error("INVALID_RIFF");
  if(v.getUint32(4,true)+8!==v.byteLength)throw Error("INVALID_RIFF_SIZE");
  let format=null, data=null;
  for(let pos=12;pos+8<=v.byteLength;) {
    const id=v.getUint32(pos,false),size=v.getUint32(pos+4,true);
    const first=pos+8,last=first+size;
    if(last>v.byteLength)throw Error("TRUNCATED_WAV");
    if(id===0x666d7420) {
      if(size<16)throw Error("INVALID_FMT");
      format={
        pcm:v.getUint16(first,true),
        channels:v.getUint16(first+2,true),
        rate:v.getUint32(first+4,true), byteRate:v.getUint32(first+8,true),
        blockAlign:v.getUint16(first+12,true),
        bits:v.getUint16(first+14,true)
      };
    }
    if(id===0x64617461)data={first,size};
    pos=last+(size&1);
  }
  if(!format||!data||format.pcm!==1||format.channels!==1||format.bits!==16||
    !Number.isInteger(format.rate)||format.rate<8000||format.rate>96000||
    format.blockAlign!==2||format.byteRate!==format.rate*2||
    data.size<2||data.size%2!==0)throw Error("UNSUPPORTED_WAV_PCM");
  return {view:v,offset:data.first,frames:data.size/2,rate:format.rate};
}
function sample(source,frame) {
  const at=frame%source.frames;
  const a=Math.floor(at),b=(a+1)%source.frames,weight=at-a;
  const one=source.view.getInt16(source.offset+2*a,true);
  if(weight===0)return one/32768;
  const two=source.view.getInt16(source.offset+2*b,true);
  return (one+(two-one)*weight)/32768;
}
function writeAscii(view,index,string) {
  for(let i=0;i<string.length;i++)view.setUint8(index+i,string.charCodeAt(i));
}
export function mixPcmWavs(voiceBuffer,natureBuffer,minimumSeconds) {
  const speech=readPcmWav(voiceBuffer), nature=readPcmWav(natureBuffer);
  const speechDuration=speech.frames/speech.rate;
  if(speechDuration<=0 || speechDuration>180)throw Error("SPEECH_TOO_LONG");
  const seconds=minimumSeconds===undefined?speechDuration:
    Math.max(speechDuration,Math.min(65,Math.max(1,Number(minimumSeconds)||1)));
  const frames=Math.ceil(seconds*speech.rate);
  if(frames>10_000_000)throw Error("OUTPUT_TOO_LONG");
  const out=new ArrayBuffer(44+frames*2), view=new DataView(out);
  writeAscii(view,0,"RIFF");view.setUint32(4,36+frames*2,true);
  writeAscii(view,8,"WAVE");writeAscii(view,12,"fmt ");
  view.setUint32(16,16,true);view.setUint16(20,1,true);
  view.setUint16(22,1,true);view.setUint32(24,speech.rate,true);
  view.setUint32(28,speech.rate*2,true);view.setUint16(32,2,true);
  view.setUint16(34,16,true);writeAscii(view,36,"data");view.setUint32(40,frames*2,true);
  // Voice starts immediately. Subtle original nature bed stays after the voice,
  // fading in/out at video boundaries instead of repeating TTS utterances.
  for(let i=0;i<frames;i++) {
    const sec=i/speech.rate;
    const speechAmp=i<speech.frames?sample(speech,i)*0.88:0;
    const fade=Math.min(1,sec/.65,(seconds-sec)/1.2);
    const natureAmp=sample(nature,sec*nature.rate)*0.11*Math.max(0,fade);
    const mixed=Math.max(-1,Math.min(1,speechAmp+natureAmp));
    view.setInt16(44+i*2,Math.round(mixed<0?mixed*32768:mixed*32767),true);
  }
  return out;
}
