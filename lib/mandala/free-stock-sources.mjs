/**
 * An owner-reviewed, exact-clip licence gate for FREE offline composite media.
 * The client editor must never become a raw stock mirror or an AI dataset.
 */
export const STOCK_POLICIES=Object.freeze({
 supareels:{host:"supareels.com",id:"supareels_commercial",license:"https://supareels.com/terms",attribution:false},
 mixkit:{host:"mixkit.co",id:"mixkit_video_free",license:"https://mixkit.co/license/modal/videoFree/",attribution:false},
 dareful:{host:"dareful.com",id:"cc_by_4_0",license:"https://creativecommons.org/licenses/by/4.0/",attribution:true},
 pexels:{host:"pexels.com",id:"pexels_content",license:"https://www.pexels.com/license/",attribution:false},
 pixabay:{host:"pixabay.com",id:"pixabay_content",license:"https://pixabay.com/service/terms/",attribution:false},
});
export const SUPPORTED_EXTRA_THEMES=Object.freeze(["energy","life","health","relationships","goals"]);
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
 if(!safeText(source.author)||!safeText(source.clipTitle)||!safeText(source.licenseEvidence))
   return "missing_provenance";
 if(source.exactClipLicenseConfirmed!==true||source.commercialUseApproved!==true||
    source.editingApproved!==true||source.identifiableSubjectsCleared!==true)return "unverified_rights";
 if(typeof source.checkedOn!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(source.checkedOn))
   return "invalid_license_date";
 const date=Date.parse(source.checkedOn+"T00:00:00Z");
 if(!Number.isFinite(date)||date>now.getTime()+86400000||now.getTime()-date>90*86400000)
   return "outdated_license_review";
 if(typeof source.file!=="string"||!/^[a-zA-Z0-9_.-]+\.(mp4|mov|m4v)$/i.test(source.file))
   return "local_video_file_required";
 return null;
}
export function validateFreeSceneBrief(brief,now=new Date()){
 if(!brief||typeof brief!=="object"||!/^[a-z][a-z0-9-]{2,44}$/.test(brief.id||""))
   throw Error("invalid_scene_id");
 if(!SUPPORTED_EXTRA_THEMES.includes(brief.theme))throw Error("invalid_theme");
 if(brief.ownerApproved!==true||brief.rawClipsPublished!==false)throw Error("owner_review_required");
 if(!brief.label||!["en","ru","es"].every(lang=>safeText(brief.label[lang])))
   throw Error("missing_labels");
 if(!["✧","✦","☀","♡","≋","△","♧","◉"].includes(brief.symbol))throw Error("invalid_symbol");
 if(!Array.isArray(brief.tags)||brief.tags.length===0||brief.tags.length>6||
    !brief.tags.every(tag=>/^[a-z-]{3,24}$/.test(tag)))throw Error("invalid_tags");
 if(!Array.isArray(brief.sources)||brief.sources.length!==2)throw Error("two_clips_required");
 for(const source of brief.sources) {
   const issue=assessStockClip(source,now);
   if(issue)throw Error(issue);
 }
 if(brief.sources[0].sourcePage===brief.sources[1].sourcePage||
    brief.sources[0].file===brief.sources[1].file)throw Error("distinct_clips_required");
 return true;
}
export function visibleCreditLine(brief) {
 return brief.sources.filter(s=>STOCK_POLICIES[s.provider].attribution)
   .map(s=>s.author+" / CC BY 4.0 / creativecommons.org/licenses/by/4.0 (adapted)").join(" | ");
}
