// Immutable BASE-owned impact verdict for real iPhone/WebKit media.
// Read directly from GitHub's exact two-parent tested merge diff.
// A proposed PR cannot rewrite this classifier for its own CI run.
const PATH=/^(?:[a-z0-9_.@\[\]-]+\/)*[a-z0-9_.@\[\]-]+$/i;
const REAL_MEDIA=[
 /^app\/api\/holistic-support\/(?:voice|audio|first-video|video|hypno)\//i,
 /^components\/mandala-(?:free-video-studio|auto-video-director|affirmation-voice|cloud-voice|video-mobile|multitrack-timeline|cinematic-director|stories-characters|audio|voice|film|export|render|recording)(?:[\w.-]*)(?:\.module)?\.(?:tsx?|jsx?|css)$/i,
 /^lib\/mandala\/.*(?:recording|recorder|voice|wav|audio|sound|codec|mp4|webcodecs|video-project|render|export|timeline|media|cinematic|film|stories|storyboard|ffmpeg)[\w.-]*\.(?:mjs|js|ts|tsx|mts)$/i,
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
 return rows.some(row=>REAL_MEDIA.some(pattern=>pattern.test(row.filename))) ||
   requiresStoriesWebKit(rows);
}
const STORY_SOURCE=[
 /^lib\/mandala\/(?:stories-studio|stories|storyboard|story-|scene-)[\w./-]*\.(?:mjs|js|ts|tsx|mts)$/i,
 /^components\/mandala-(?:stories|storyboard)[\w.-]*\.(?:tsx?|jsx?|css)$/i,
 /^scripts\/benchmarking\/verify-five-scene-stories-browser\.mjs$/i,
];
export function requiresStoriesWebKit(rows) {
 if(!Array.isArray(rows)||!rows.length||rows.length>=3000||
   rows.some(row=>!row||typeof row.filename!=='string'||!PATH.test(row.filename)||
     !['M','A','D','T','modified','added','removed','deleted'].includes(row.status)))
   return true;
 return rows.some(row=>STORY_SOURCE.some(pattern=>pattern.test(row.filename)));
}
