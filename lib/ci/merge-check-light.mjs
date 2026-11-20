// Immutable BASE-owned impact verdict for real iPhone/WebKit media.
// Read directly from GitHub's exact two-parent tested merge diff.
// A proposed PR cannot rewrite this classifier for its own CI run.
const PATH=/^(?:[a-z0-9_.@\[\]-]+\/)*[a-z0-9_.@\[\]-]+$/i;
const REAL_MEDIA=[
 /^app\/api\/holistic-support\/(?:voice|audio|first-video|video|hypno)\//i,
 /^components\/mandala-(?:free-video-studio|auto-video-director|affirmation-voice|cloud-voice|video-mobile|multitrack-timeline|cinematic-director|audio|voice|film|export|render|recording)(?:[\w.-]*)(?:\.module)?\.(?:tsx?|jsx?|css)$/i,
 /^lib\/mandala\/.*(?:recording|recorder|voice|wav|audio|sound|codec|mp4|webcodecs|video-project|render|export|timeline|media|cinematic|film|ffmpeg)[\w.-]*\.(?:mjs|js|ts|tsx|mts)$/i,
 /^scripts\/(?:benchmarking\/(?:first-video-live-export|verify-original-motion-export|verify-five-scene-stories-browser)|verify-live-selected-voice-phrase)\.mjs$/i,
 /^public\/(?:audio|videos)\/.+\.(?:mp4|mov|m4a|mp3|wav|aac|webm)$/i,
 /^data\/video-catalog\/.*(?:footage|film|music|video|stock|source|scenario).*\.json$/i,
 /^\.github\/workflows\/holistic-support-mandala\.ya?ml$/i,
 /^lib\/ci\/merge-check-light\.mjs$/i,
 /^(?:package(?:-lock)?\.json|next\.config\.[a-z0-9]+)$/i,
];
export function requiresRealMediaWebKit(rows) {
 if(!Array.isArray(rows)||!rows.length||rows.length>=3000||
   rows.some(row=>!row||typeof row.filename!=='string'||row.filename.length>512||
     !PATH.test(row.filename)||row.filename.split('/').some(s=>s==='.'||s==='..'||s==='')||
     !['M','A','D','T','modified','added','removed','deleted'].includes(row.status)))
   return true;
 return rows.some(row=>REAL_MEDIA.some(pattern=>pattern.test(row.filename)));
}
