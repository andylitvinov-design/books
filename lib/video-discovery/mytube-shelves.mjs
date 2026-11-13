/**
 * MyTube's three editorial shelves. All inputs are already approved PUBLIC
 * video cards from the canonical catalog, never unpublished practitioner media.
 * Third-party practice length must be independently verified, not guessed.
 */
const PRACTICE_TYPES=new Set(["soft_meditation","energy_boost_practice"]);
export const MYTUBE_PRACTICE_MAX_SECONDS=15*60;
const ORIGINAL_PSIMASTER_PRACTICES="psimaster-original-meditations";
const MASTER_GROUPS=new Set(["master-presentations","practitioner-presentations","practitioner-introduction"]);
const MASTER_INTRO=/^(?:знакомство с (?:мастером|практиком)|представление мастера|презентация мастера|(?:meet|introducing) (?:our |the )?(?:master|practitioner)\b|(?:presentaci[oó]n|conoce) (?:del? |al? )?(?:maestro|terapeuta)\b)/iu;
const KNOWN_COURSE_GROUPS=new Set([
 "tantra-reiki","reiki-yggdrasil","kundalini-reiki",
 "videos/greek-mysteries-dionysus","videos/greek-mysteries-demeter",
 "videos/egypt-osiris","videos/maya-archetypes","videos/planetary-power",
 "videos/strength-protection","videos/energy-pump-ups","videos/sun-meditations",
 "mysteries/archetypes-of-gods","mysteries/guidance-of-gods",
 "symbolic/artifacts-talismans","reiki/master-shamanic-healing","reiki/yggdrasil/faq"
]);
const TYPES=["temple","reiki","psychology","somatic","other"];
const TRADITIONS=["greek","egyptian","maya","other"];
const LESSON_WORD=/\b(?:course|lesson|lecture|seminar|training|curso|lecci[oó]n)\b|курс|урок|лекция|занятие|семинар/iu;
const text=value=>typeof value==="string"?value:"";
// A numbered lesson belongs to its explicit course even when the lesson
// lasts less than ten minutes and has a practice-oriented content tag.
const isNumberedCourseLesson=video=>{
 const group=text(video.sourceGroup);
 return group!=="approved-meditations"&&
   (Boolean(video.seriesId)||KNOWN_COURSE_GROUPS.has(group)||
    /^(?:videos|reiki|mysteries|symbolic)\//.test(group))&&
   (Number.isInteger(video.seriesOrder)||Number.isInteger(video.mytubeLessonOrder));
};

export function isMyTubeMeditationPractice(video={}){
 const seconds=video.durationVerifiedSeconds;
 // The archived owner's already-public recordings are verified at the source,
 // but have UNKNOWN duration. This exception does not approve unreviewed
 // database candidates, other legacy lessons or arbitrary external videos.
 if(video.sourceGroup===ORIGINAL_PSIMASTER_PRACTICES){
   // Owner-approved public PsiMaster originals may have unknown video length;
   // if later verified over 15 minutes they are not mislabeled short practices.
   // This cannot approve candidate-only third-party rows.
   return PRACTICE_TYPES.has(video.contentType)&&
     video.sourceApproved===true&&video.curation==="verified"&&
     /^[A-Za-z0-9_-]{11}$/.test(text(video.youtubeId))&&
     (seconds==null||(Number.isInteger(seconds)&&seconds>=1&&seconds<=MYTUBE_PRACTICE_MAX_SECONDS))&&
     !video.editorial_status&&!video.embed_status&&!video.rights_status;
 }
 return !isNumberedCourseLesson(video)&&PRACTICE_TYPES.has(video.contentType)&&
   Number.isInteger(seconds)&&seconds>=1&&seconds<=MYTUBE_PRACTICE_MAX_SECONDS&&
   video.sourceApproved!==false&&
   // The dedicated short catalog has all approval, rights, embed and metadata
   // gates; other sources require a reviewed/public record with verified length.
   (video.sourceGroup!=="approved-meditations"||
     (video.editorial_status==="approved"&&video.embed_status==="confirmed"&&
      video.rights_status==="embed_approved"))&&
   (video.sourceApproved===true||video.curation==="verified"||video.curation==="published");
}
export function isMyTubeMasterPresentation(video={}){
 if(video.sourceApproved===false)return false;
 const group=text(video.sourceGroup);
 if(MASTER_GROUPS.has(group)||video.mytubeSection==="masters")return true;
 // A master-class lecture is NOT an introduction to an individual master.
 return MASTER_INTRO.test(text(video.title))&&
   (video.curation==="published"||video.curation==="verified");
}
export function isMyTubeCourse(video={}){
 if(video.sourceApproved===false||isMyTubeMasterPresentation(video)||
    isMyTubeMeditationPractice(video))return false;
 const group=text(video.sourceGroup);
 if(video.seriesId||Number.isInteger(video.seriesOrder)||
   Number.isInteger(video.mytubeLessonOrder)||KNOWN_COURSE_GROUPS.has(group)||
   /^(?:videos|reiki|mysteries|symbolic)\//.test(group))return true;
 return Number.isFinite(video.durationVerifiedSeconds)&&
   video.durationVerifiedSeconds>MYTUBE_PRACTICE_MAX_SECONDS&&
   (video.contentType==="course_lesson"||LESSON_WORD.test(text(video.title)));
}
export function matchesMyTubeShelf(video,shelf){
 if(shelf==="practices")return isMyTubeMeditationPractice(video);
 if(shelf==="masters")return isMyTubeMasterPresentation(video);
 if(shelf==="courses")return isMyTubeCourse(video);
 return false;
}
export function myTubeCourseInfo(video={}){
 if(!isMyTubeCourse(video))return null;
 const group=text(video.sourceGroup),title=text(video.title);
 let type="other",tradition="";
 if(group.startsWith("videos/greek-")||/\bgreek\b|греческ|\bgrieg[ao]\b/iu.test(group)){
   type="temple";tradition="greek";
 }else if(group.startsWith("videos/egypt")||/египетск|\begypt/iu.test(group)){
   type="temple";tradition="egyptian";
 }else if(group.startsWith("videos/maya")||/майя|\bmaya\b/iu.test(group)){
   type="temple";tradition="maya";
 }else if(/^(?:mysteries|symbolic)\//.test(group)||/храмов|temple|templo/iu.test(title)){
   type="temple";tradition="other";
 }else if(/^(?:reiki\/|tantra-reiki$|reiki-yggdrasil$|kundalini-reiki$)/.test(group)){
   type="reiki";
 }else if(/psycholog|психолог|psychotherap|психотерап/iu.test(group+" "+title)){
   type="psychology";
 }else if(/somatic|телесн|bodywork/iu.test(group+" "+title)){
   type="somatic";
 }
 const id=text(video.seriesId)||group||"standalone:"+text(video.youtubeId||video.id);
 const label=text(video.seriesTitle)||text(video.description)||title||id;
 return {id,label,type,tradition};
}
export function listMyTubeCourseTypes(items=[]){
 const found=new Set(items.map(myTubeCourseInfo).filter(Boolean).map(x=>x.type));
 return TYPES.filter(type=>found.has(type));
}
export function listMyTubeCourseTraditions(items=[],type="temple"){
 if(type!=="temple")return [];
 const found=new Set(items.map(myTubeCourseInfo).filter(x=>x?.type===type).map(x=>x.tradition));
 return TRADITIONS.filter(tradition=>found.has(tradition));
}
export function listMyTubeCourseSeries(items=[],type="all",tradition="all"){
 const selectedType=type||"all",selectedTradition=tradition||"all";
 const found=new Map();
 for(const item of items){
   const info=myTubeCourseInfo(item);
   if(!info||(selectedType!=="all"&&info.type!==selectedType)||
     (selectedType==="temple"&&selectedTradition!=="all"&&info.tradition!==selectedTradition))continue;
   if(!found.has(info.id))found.set(info.id,{id:info.id,label:info.label,count:0});
   found.get(info.id).count++;
 }
 return [...found.values()];
}
/** Stable source order for ties; the first numbered lesson is always first. */
export function sortMyTubeCourseLessons(items=[]){
 const groupOrder=new Map();
 return items.map((item,index)=>{
   const group=myTubeCourseInfo(item)?.id||"unclassified:"+index;
   if(!groupOrder.has(group))groupOrder.set(group,groupOrder.size);
   return {item,index,groupOrder:groupOrder.get(group)};
 }).sort((a,b)=>{
   const sequence=item=>Number.isInteger(item.seriesOrder)?item.seriesOrder:
     Number.isInteger(item.mytubeLessonOrder)?item.mytubeLessonOrder:Number.MAX_SAFE_INTEGER;
   // Keep each course contiguous when viewing All, then play lesson 1 through last.
   return a.groupOrder-b.groupOrder||
     sequence(a.item)-sequence(b.item)||a.index-b.index;
 }).map(({item})=>item);
}
