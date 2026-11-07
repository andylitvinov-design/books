/**
 * Owner-only, research-stage rights dossier for one shortlisted Wikimedia file.
 * Neither a metadata claim nor a shortlist grants rights, source identity,
 * commercial use, access to R2, or Video Vault generator eligibility.
 * No remote HTTP, no source download, no inferred approval.
 */
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const RESEARCH_STATE='shortlisted_for_rights_review';
const FILE_PAGE=/^\/wiki\/File:[^/?#]{4,190}\.(?:webm|ogv|mp4)$/i;

export function validCandidateDossierId(id) {
  return typeof id==='string'&&UUID.test(id);
}
function safeCommonsSourcePage(value){
  if(typeof value!=='string'||value.length>650)return null;
  try{
    const url=new URL(value);
    if(url.protocol!=='https:'||url.hostname!=='commons.wikimedia.org'||
       url.username||url.password||url.port||url.search||url.hash||
       !FILE_PAGE.test(url.pathname))return null;
    return url.href;
  }catch{return null;}
}
function safeText(value,limit=180){
  return typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/<[^>]*>/g,' ').trim().slice(0,limit):'';
}
function trustedLicenseUrl(value){
  if(typeof value!=='string'||value.length>450)return null;
  try{const u=new URL(value);
    return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&
      ['creativecommons.org','commons.wikimedia.org'].includes(u.hostname)?u.href:null;
  }catch{return null;}
}
export function licenseResearchTrack(value){
  const claim=safeText(value,100).toLowerCase().replace(/[\s_-]+/g,' ').trim();
  // This only prioritizes manual research; it is NOT confirmation of a licence.
  if(/\b(?:nc|nd)\b/.test(claim))return 'unknown_claim';
  if(claim==='cc0'||claim==='cc0 1.0'||claim==='cc zero'||claim==='creative commons cc0 1.0')return 'cc0_claim';
  if(/^cc by sa(?:\s|$)/.test(claim))return 'sharealike_claim';
  if(/^cc by(?:\s|$)/.test(claim))return 'attribution_claim';
  if(['public domain','pd','pd us','pd-self'].includes(claim))return 'public_domain_claim';
  return 'unknown_claim';
}
function positiveInt(value,cap=10_000_000_000){
  const n=Number(value);return Number.isSafeInteger(n)&&n>0&&n<=cap?n:null;
}
export function buildCandidateRightsDossier(row){
  if(!row||!validCandidateDossierId(row.candidate_id)||row.provider!=='wikimedia_commons'||
     row.decision!==RESEARCH_STATE||row.review_state!=='research_only'||row.rights_state!=='unverified')
    throw Error('RIGHTS_RESEARCH_REQUIRES_SHORTLIST');
  const sourcePage=safeCommonsSourcePage(row.source_page);
  if(!sourcePage||!/^\d{1,13}$/.test(String(row.source_id||'')))
    throw Error('RIGHTS_RESEARCH_UNTRUSTED_SOURCE');
  const title=safeText(row.title,180),creator=safeText(row.creator,180);
  const width=positiveInt(row.width,100_000),height=positiveInt(row.height,100_000);
  const bytes=positiveInt(row.size_bytes);
  const mime=['video/webm','video/mp4','video/ogg'].includes(row.mime)?row.mime:null;
  const claim=safeText(row.license_claim,120);
  const track=licenseResearchTrack(claim);
  const sourceSha1Claim=typeof row.sha1_claim==='string'&&/^[a-f0-9]{40}$/i.test(row.sha1_claim)?row.sha1_claim.toLowerCase():null;
  const noDirectImport=['rights_unverified','visual_review_unverified','source_bytes_not_verified',
    'source_sha256_not_verified','subject_and_music_rights_unverified',
    'owner_release_not_approved','r2_usage_unverified'];
  const investigationFlags=[];
  if(!creator) investigationFlags.push('AUTHOR_MISSING');
  if(track==='sharealike_claim')investigationFlags.push('SHAREALIKE_DERIVATIVE_REVIEW_REQUIRED');
  if(track==='attribution_claim')investigationFlags.push('ATTRIBUTION_REQUIRED');
  if(track==='public_domain_claim')investigationFlags.push('JURISDICTION_RIGHTS_REVIEW_REQUIRED');
  if(track==='unknown_claim')investigationFlags.push('LICENSE_UNKNOWN');
  if(!width||!height)investigationFlags.push('VIDEO_DIMENSIONS_UNKNOWN');
  if(!bytes||bytes>150_000_000)investigationFlags.push('LOCAL_INPUT_SIZE_OUTSIDE_STAGING_LIMIT');
  if(!mime)investigationFlags.push('VIDEO_MIME_UNSUPPORTED');
  if(width&&height&&Math.min(width,height)<480)investigationFlags.push('SOURCE_MAY_BE_TOO_SMALL');
  if(mime==='video/ogg')investigationFlags.push('OGV_LOCAL_TRANSCODE_REVIEW_REQUIRED');
  const candidateCanStage=mime==='video/webm'&&
    bytes!==null&&bytes<=150_000_000&&width!==null&&height!==null&&
    Math.min(width,height)>=480&&creator.length>0;
  const cc0Candidate=track==='cc0_claim'&&candidateCanStage;
  // A matching claim only opens a *manual* review pathway; it does not approve rights.
  const ccByCandidate=track==='attribution_claim'&&
    /^cc by 4\.0$/i.test(claim)&&candidateCanStage;
  return Object.freeze({
    schemaVersion:'hh-commons-rights-research-v1',
    researchCandidate:{candidateId:row.candidate_id,sourceProvider:'wikimedia_commons',
      sourceAssetId:'commons-'+row.source_id,sourcePage,title,creator,
      category:safeText(row.category,60)||null,sourceSearch:safeText(row.source_query,100),
      mime,width,height,bytes,sourceSha1Claim,
      licenseClaim:claim,licenseUrlClaim:trustedLicenseUrl(row.license_url_claim),
      licenseResearchTrack:track},
    investigativePriority:cc0Candidate?'cc0_local_staging_possible_after_manual_rights_review':
      ccByCandidate?'cc_by_4_0_local_staging_possible_after_manual_rights_and_credit_review':
      'manual_research_only',
    investigationFlags,
    mandatoryHumanChecks:[
      'Inspect exact Commons file page, attribution, upload history, and original creator',
      'Confirm the exact CC0 or CC BY 4.0 commercial and derivative rights, not the API label',
      'If CC BY 4.0: preserve visible author credit, source page, license link and adaptation note',
      'Inspect frames, soundtrack, recognizable people, trademarks and third-party artwork',
      'Owner obtains and verifies the actual source file and records its SHA-256',
      'Verify original resolution, duration, playback and quality with ffprobe/ffmpeg',
      'Owner approves visual use and reviews current Cloudflare account-wide cost before R2 upload',
    ],
    // Deliberately not an hh-video-vault-batch-v1 manifest. No valid automatic path to publish.
    blockedBy:noDirectImport,ownerApprovalRequired:true,
    licenseApproved:false,mediaInspected:false,localFileVerified:false,
    commercialUseApproved:false,derivativeUseApproved:false,subjectRightsCleared:false,
    generatorEligible:false,sourceDownloaded:false,r2Uploaded:false,
  });
}
export async function readCandidateRightsDossier(db,candidateId){
  if(!validCandidateDossierId(candidateId)||!db||typeof db.query!=='function')
    throw Error('RIGHTS_RESEARCH_INVALID_REQUEST');
  const res=await db.query(`select c.candidate_id,c.provider,c.source_id,c.source_page,c.title,
      c.creator,c.license_claim,c.license_url_claim,c.category,c.source_query,
      c.mime,c.size_bytes,c.width,c.height,c.sha1_claim,c.review_state,c.rights_state,
      r.decision from app_private.video_source_candidates_v2 c
    inner join app_private.video_candidate_editorial_reviews_v1 r on r.candidate_id=c.candidate_id
    where c.candidate_id=$1 and c.provider='wikimedia_commons'
      and c.review_state='research_only' and c.rights_state='unverified'
      and r.decision='shortlisted_for_rights_review' limit 1`,[candidateId]);
  if(res.rows.length!==1)return null;
  return buildCandidateRightsDossier(res.rows[0]);
}
