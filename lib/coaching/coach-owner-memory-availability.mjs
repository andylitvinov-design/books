/**
 * First-party archive search is a read-only view of records already available
 * to their verified owner. It does not enable selection, retention,
 * extraction, provider sharing, indexing or background processing.
 * Explicit false (or any unrecognized setting) is a kill switch.
 */
export function coachOwnerMemoryEnabled(env=process.env){
 if(env.HH_APP_ENABLED!=='true'||
   (env.VERCEL_ENV==='production'&&env.HH_APP_PRODUCTION_APPROVED!=='true'))return false
 const setting=env.HH_COACH_OWNER_MEMORY_SEARCH_ENABLED
 return setting===undefined||setting==='true'
}
