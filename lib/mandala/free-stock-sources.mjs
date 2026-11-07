/**
 * An owner-reviewed, exact-clip licence gate for FREE offline composite media.
 * The client editor must never become a raw stock mirror or an AI dataset.
 */
export const STOCK_POLICIES=Object.freeze({
 supareels:{host:"supareels.com",id:"supareels_commercial",license:"https://supareels.com/terms",attribution:false},
 mixkit:{host:"mixkit.co",id:"mixkit_video_free",license:"https://mixkit.co/license/modal/videoFree/",attribution:false},
 dareful:{host:"dareful.com",id:"cc_by_4_0",license:"https://creativecommons.org/licenses/by/4.0/",attribution:true},
 // Official CC0 camera-footage pages only. Source-specific rights/release and human
 // checks still apply; a domain allowlist alone cannot approve an asset.
 free_nature_stock:{host:"freenaturestock.com",id:"cc0_1_0",
  license:"https://creativecommons.org/publicdomain/zero/1.0/",
  attribution:false,sourcePath:/^\/video\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/},
 // Wikimedia is an exact-file CC0-only path, never a Commons-wide rights approval.
 wikimedia_commons:{host:"commons.wikimedia.org",id:"cc0_1_0",
  license:"https://creativecommons.org/publicdomain/zero/1.0/",
  attribution:false,sourcePath:/^\/wiki\/File:[^/?#]{4,190}\.webm$/i},
 // Explicit CC BY 4.0 alternative; not a Commons-wide license override.
 wikimedia_ccby:{host:"commons.wikimedia.org",id:"cc_by_4_0",
  license:"https://creativecommons.org/licenses/by/4.0/",
  attribution:true,sourcePath:/^\/wiki\/File:[^/?#]{4,190}\.webm$/i},
 pexels:{host:"pexels.com",id:"pexels_content",license:"https://www.pexels.com/license/",attribution:false},
 pixabay:{host:"pixabay.com",id:"pixabay_content",license:"https://pixabay.com/service/terms/",attribution:false},
 nps_grca:{host:"nps.gov",id:"nps_public_domain_broll",license:"https://www.nps.gov/grca/learn/photosmultimedia/b-roll_hd_index.htm",attribution:true,sourcePath:/^\/grca\/learn\/photosmultimedia\/b-roll_hd(?:_index|[0-9]{2})\.htm$/},
 nps_jotr:{host:"nps.gov",id:"nps_public_domain_broll",license:"https://www.nps.gov/jotr/learn/photosmultimedia/broll.htm",attribution:true,sourcePath:/^\/jotr\/learn\/photosmultimedia\/(?:broll|[a-z-]+clips|windclips)\.htm$/},
 nps_stli:{host:"nps.gov",id:"nps_public_domain_broll",license:"https://www.nps.gov/stli/learn/photosmultimedia/b-roll-footage.htm",attribution:true,sourcePath:/^\/stli\/learn\/photosmultimedia\/b-roll-footage\.htm$/},
 nps_saan:{host:"nps.gov",id:"nps_public_domain_broll",license:"https://www.nps.gov/saan/learn/photosmultimedia/videos.htm",attribution:true,sourcePath:/^\/saan\/learn\/photosmultimedia\/videos\.htm$/},
});
export const SUPPORTED_EXTRA_THEMES=Object.freeze(["energy","life","health","relationships","goals","money"]);
const safeText=x=>typeof x==="string"&&x.trim().length>0&&x.length<=120;
function trustedUrl(value,host) {
 try {const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&
   (u.hostname===host||u.hostname.endsWith("."+host));} catch {return false;}
}
export function assessStockClip(source,now=new Date()){
 if(!source||typeof source!=="object")return "missing_source";
 const p=STOCK_POLICIES[source.provider];
 if(!p)return "unsupported_provider";
 if(source.licenseId!==p.id||source.licenseUrl!==p.license)return "unverified_license";
 if(!trustedUrl(source.sourcePage,p.host))return "untrusted_source_page";
 // NPS public-domain declarations apply only to specific official B-roll archive pages.
 if(p.sourcePath){
   const url=new URL(source.sourcePage);
   // NPS licences apply only to the named official park archives. Free Nature
   // Stock CC0 applies only to individual /video/<slug>/ pages, not photos,
   // a search page, redirects, a CDN or an arbitrary website subdomain.
   const exactHost=p.host==="nps.gov"?"www.nps.gov":p.host;
   if(url.hostname!==exactHost||url.username||url.password||url.port||
      url.search||url.hash||!p.sourcePath.test(url.pathname))
     return "untrusted_source_page";
 }
 if(!safeText(source.author)||!safeText(source.clipTitle)||!safeText(source.licenseEvidence))
   return "missing_provenance";
 if(source.noRecognizablePeople!==true||source.noVisibleBrandLogos!==true)return "subjects_or_logos_not_clear";
 if(source.exactClipLicenseConfirmed!==true||source.commercialUseApproved!==true||
    source.editingApproved!==true||source.identifiableSubjectsCleared!==true)return "unverified_rights";
 if(typeof source.checkedOn!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(source.checkedOn))
   return "invalid_license_date";
 const date=Date.parse(source.checkedOn+"T00:00:00Z");
 if(!Number.isFinite(date)||date>now.getTime()+86400000||now.getTime()-date>90*86400000)
   return "outdated_license_review";
 const existingFile=typeof source.file==="string"&&
   /^[a-zA-Z0-9_.-]+\.(mp4|mov|m4v|mts)$/i.test(source.file);
 const commonsWebm=["wikimedia_commons","wikimedia_ccby"].includes(source.provider)&&
   typeof source.file==="string"&&
   /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}\.webm$/i.test(source.file);
 if(!existingFile&&!commonsWebm)return "local_video_file_required";
 if(source.provider==="wikimedia_ccby"&&
   (typeof source.attributionText!=="string"||source.attributionText.length>1000||
     !source.attributionText.includes(source.author)|| 
     !source.attributionText.includes(source.sourcePage)||
     !source.attributionText.includes("CC BY 4.0")||
     !/adapt/i.test(source.attributionText)))
   return "attribution_required";
 return null;
}
export function validateFreeSceneBrief(brief,now=new Date(),{allowSingleSource=false}={}){
 if(!brief||typeof brief!=="object"||!/^[a-z][a-z0-9-]{2,44}$/.test(brief.id||""))
   throw Error("invalid_scene_id");
 if(!SUPPORTED_EXTRA_THEMES.includes(brief.theme))throw Error("invalid_theme");
 if(brief.ownerApproved!==true||brief.rawClipsPublished!==false)throw Error("owner_review_required");
 if(!brief.label||!["en","ru","es"].every(lang=>safeText(brief.label[lang])))
   throw Error("missing_labels");
 if(!["✧","✦","☀","♡","≋","△","♧","◉"].includes(brief.symbol))throw Error("invalid_symbol");
 if(!Array.isArray(brief.tags)||brief.tags.length===0||brief.tags.length>6||
    !brief.tags.every(tag=>/^[a-z-]{3,24}$/.test(tag)))throw Error("invalid_tags");
 if(!Array.isArray(brief.sources)||!(brief.sources.length===2||(allowSingleSource&&brief.sources.length===1)))
   throw Error("two_clips_required");
 for(const source of brief.sources) {
   const issue=assessStockClip(source,now);
   if(issue)throw Error(issue);
 }
 if(brief.sources.length===2&&(brief.sources[0].sourcePage===brief.sources[1].sourcePage||
    brief.sources[0].file===brief.sources[1].file))throw Error("distinct_clips_required");
 return true;
}
export function visibleCreditLine(brief) {
 return brief.sources.filter(s=>STOCK_POLICIES[s.provider].attribution)
   .map(s=>s.provider.startsWith('nps_')?s.author+" / National Park Service / public domain (no endorsement)":s.author+" / CC BY 4.0 / creativecommons.org/licenses/by/4.0 (adapted)").join(" | ");
}
