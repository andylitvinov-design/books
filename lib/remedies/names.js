// Shared by admin search and server identity matching. No fuzzy species inference.
export function normalizeRemedyName(value) {
  const cyrillic = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'i',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sh',ы:'y',э:'e',ю:'yu',я:'ya',ь:'',ъ:'' }
  return [...String(value ?? '').normalize('NFKC').toLowerCase().replaceAll('ё','е').normalize('NFD').replace(/[\u0300-\u036f]/g,'')]
    .map((letter)=>cyrillic[letter] ?? letter).join('').replace(/c/g,'k').replace(/[^\p{L}\p{N}]+/gu,' ').trim()
}
