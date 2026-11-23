/**
 * Secondary editorial-interest priority for physically approved first-party
 * scene metadata. This NEVER grants rights/approval, changes aspects or
 * elevates unverified stock from a URL, source name or technical-only score.
 * Relevance and the existing motif/style hard gates remain authoritative.
 */
import curation from '../../data/video-catalog/mytube-interest-curation-v1.json' with {type:'json'};
const reviewed=new Map(curation.ratings.map(r=>[r.id,r]));
const SHA=/^[a-f0-9]{64}$/;
export const EDITORIAL_INTEREST_TIERS=Object.freeze(['featured','strong','unrated','abstract_support']);
const freeze=(tier,weight,visualScore,evidence)=>Object.freeze({tier,weight,visualScore,evidence});
const UNRATED=freeze('unrated',0,null,'no_individual_verified_editorial_interest_score');
export function sceneEditorialInterest(scene){
 if(!scene||scene.status!=='approved')return UNRATED;
 if(scene.media==='original_motion_mp4'&&
    scene.collection==='original-motion-v1'&&
    scene.visualOrigin==='original_procedural_non_photographic'&&
    scene.rightsReference?.kind==='project_generated_original'&&
    scene.width===432&&scene.height===768&&scene.fps===18)
    return freeze('abstract_support',-4,null,'432x768_18fps_original_procedural_not_real_filmed_footage');
 if(scene.media!=='licensed_mp4'||scene.rightsReference?.kind!=='dareful_cc_by_4_0')return UNRATED;
 const row=reviewed.get(scene.id),q=scene.technicalQuality;
 if(!row||!SHA.test(row.sha256)||row.sha256!==q?.sha256||
    q.editorialApproved!==true||q.decodedFrame!==true||
    !Number.isInteger(q.reviewedFrames)||q.reviewedFrames<120||
    row.sourcePage!==scene.rightsReference.sourcePage||
    scene.rightsReference.licenseUrl!=='https://creativecommons.org/licenses/by/4.0/'||
    !scene.rightsReference.attribution||
    !['featured','strong'].includes(row.tier)||
    !Number.isInteger(row.visualScore)||row.visualScore<4||row.visualScore>5)
    return UNRATED;
 return freeze(row.tier,row.tier==='featured'?12:8,row.visualScore,
   'individual_visual_review_120_frames_and_exact_master_sha');
}
