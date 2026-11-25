// Seven finished, owner-selected EN presentation masters in the connected HeyGen
// library, verified 2026-11-14. Superseded cuts, voice QA, private client drafts,
// montage ingredients and RU/ES renders are deliberately NOT an upload queue.
// IDs are stable identities; never commit expiring HeyGen MP4 download links.
export const ENGLISH_HEYGEN_INTRO_ID='8d998c778af3b563aa63233aa4fb4a06';
export const ENGLISH_YOUTUBE_MASTERS=Object.freeze([
  Object.freeze({
    videoId:ENGLISH_HEYGEN_INTRO_ID,
    title:'Holistic House — It Starts With You',
    description:'Discover Holistic House: self-awareness, relationships, meaningful work, personal practices and your first free self-check. An AI-assisted presentation.',
    durationSeconds:91.2457,captionedOnly:true
  }),
  Object.freeze({
    videoId:'ed202847a43a96b918308aa972177b34',
    title:'Holistic House — Personal Growth and Support',
    description:'An introduction to personal development and the Holistic House approach. Educational AI-assisted presentation.',
    durationSeconds:29.44,captionedOnly:false
  }),
  Object.freeze({
    videoId:'48105a2f2228e7cb3a67391e97acaf8b',
    title:'Holistic House — Sessions, Courses and Support',
    description:'Explore guided practices, personal sessions and learning opportunities at Holistic House. AI-assisted presentation.',
    durationSeconds:29.1004,captionedOnly:false
  }),
  Object.freeze({
    videoId:'34df311e461509433b45929908a9097a',
    title:'Holistic House — Psycho-Homeopathy Introduction',
    description:'A brief introduction to the psycho-homeopathy service at Holistic House. Educational information, not medical diagnosis or treatment. AI-assisted video.',
    durationSeconds:30.72,captionedOnly:false
  }),
  Object.freeze({
    videoId:'8c1634ce904434a91931429b6a7eefe1',
    title:'Guided Hypnotherapy in Toronto — Holistic House',
    description:'Learn about guided hypnotherapy and personal exploration. AI-assisted educational introduction.',
    durationSeconds:46.7331,captionedOnly:false
  }),
  Object.freeze({
    videoId:'7c6b243f048b9c0581ae29619a4a89fc',
    title:'Systemic Family Constellations in Toronto — Holistic House',
    description:'An introduction to systemic and family constellation practice. AI-assisted educational presentation.',
    durationSeconds:47.6735,captionedOnly:false
  }),
  Object.freeze({
    videoId:'fd5fcead9b067f9a0649862675a38771',
    title:'Psychic Alchemy — An Introduction | Holistic House',
    description:'Meet Psychic Alchemy and explore symbolic approaches to self-understanding. AI-assisted educational presentation.',
    durationSeconds:26.7233,captionedOnly:false
  }),
]);
export function englishYoutubeMaster(id){
  return ENGLISH_YOUTUBE_MASTERS.find(item=>item.videoId===id)||null;
}
export function approvedEnglishRawMaster(id){
  const record=englishYoutubeMaster(id);
  return Boolean(record&&!record.captionedOnly);
}
// The public My Space player may disclose ONLY the verified unlisted video
// for the exact main EN master, on the separately paired English channel.
export function verifiedEnglishIntroYoutubeId(raw,paired){
  if(typeof raw!=='string'||raw.length>2048||
    !/^UC[A-Za-z0-9_-]{22}$/.test(paired?.id||''))return null;
  try{
    const entry=JSON.parse(raw);
    return entry?.channelId===paired.id &&
      /^[A-Za-z0-9_-]{11}$/.test(entry.videoId||'')
      ?entry.videoId:null;
  }catch{return null;}
}
