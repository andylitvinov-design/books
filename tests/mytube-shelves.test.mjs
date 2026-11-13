import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  isMyTubeMeditationPractice,isMyTubeMasterPresentation,isMyTubeEducationalVideo,matchesMyTubeShelf,
  myTubeCourseInfo,listMyTubeCourseTypes,listMyTubeCourseTraditions,
  listMyTubeCourseSeries,sortMyTubeCourseLessons
} from "../lib/video-discovery/mytube-shelves.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("exactly four exclusive MyTube sections without an All section",()=>{
 const view=read("components/video-discovery.tsx");
 const css=read("components/video-discovery.module.css");
 assert.match(view,/\(\["practices","courses","masters","videos"\] as const\)\.map/);
 assert.doesNotMatch(view,/\(\["all","shorts","courses","study"\] as const\)/);
 assert.match(view,/data-mytube-format-mode=\{mode\}/);
 assert.match(view,/data-mytube-course-type=\{type\}/);
 assert.match(view,/data-mytube-course-tradition=\{traditionId\}/);
 assert.match(view,/data-mytube-course-series=\{series\.id\}/);
 assert.match(css,/\.mytube \.mytubeFormatTabs\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 for(const name of ["Практики","Курсы","Мастера","Видео","Practices","Courses","Masters","Videos","Prácticas","Cursos","Maestros","Vídeos"]){
   assert.ok(view.includes('"'+name+'"'),"translated label "+name);
 }
});
test("practice shelf is a strict approved meditation of verified 1–900s, not a teaser or talk",()=>{
 const base={id:"v",sourceGroup:"approved-meditations",sourceApproved:true,curation:"verified",
  editorial_status:"approved",embed_status:"confirmed",rights_status:"embed_approved",
  contentType:"soft_meditation",durationVerifiedSeconds:900};
 assert.equal(isMyTubeMeditationPractice(base),true);
 assert.equal(isMyTubeMeditationPractice({...base,durationVerifiedSeconds:901}),false);
 assert.equal(isMyTubeMeditationPractice({...base,durationVerifiedSeconds:601}),true);
 assert.equal(isMyTubeMeditationPractice({...base,durationVerifiedSeconds:null}),false);
 assert.equal(isMyTubeMeditationPractice({...base,contentType:"explanation"}),false);
 assert.equal(isMyTubeMeditationPractice({...base,editorial_status:"draft"}),false);
 assert.equal(matchesMyTubeShelf({title:"Quick intro",sourceGroup:"site-introduction"},"practices"),false);
 assert.equal(matchesMyTubeShelf(base,"masters"),false);
});
test("published owner-library talks occupy Videos without weakening the other three shelves",()=>{
 const talk={id:"owner-v",sourceGroup:"owner-library",sourceApproved:true,
  curation:"published",youtubeId:"AbCdEfGhIj0",title:"An encouraging talk"};
 assert.equal(isMyTubeEducationalVideo(talk),true);
 assert.equal(matchesMyTubeShelf(talk,"videos"),true);
 assert.equal(matchesMyTubeShelf(talk,"practices"),false);
 assert.equal(matchesMyTubeShelf(talk,"courses"),false);
 assert.equal(matchesMyTubeShelf(talk,"masters"),false);
 assert.equal(isMyTubeEducationalVideo({...talk,sourceApproved:false}),false);
 assert.equal(isMyTubeEducationalVideo({...talk,curation:"candidate"}),false);
 assert.equal(isMyTubeEducationalVideo({...talk,youtubeId:"not-a-youtube-id"}),false);
 assert.equal(isMyTubeEducationalVideo({...talk,sourceGroup:"site-introduction"}),false);
});
test("course type and Greek tradition are genuine multi-episode series ordered 1 to last",()=>{
 const items=[7,2,1,5,3,4,6].map(n=>({
   id:"d"+n,sourceGroup:"videos/greek-mysteries-dionysus",seriesId:"greek-dionysus",
   seriesTitle:"Канал Диониса",seriesOrder:n,curation:"verified",
 }));
 const demeter={sourceGroup:"videos/greek-mysteries-demeter",seriesId:"greek-demeter",
   seriesTitle:"Канал Деметры",seriesOrder:1,curation:"verified"};
 assert.equal(myTubeCourseInfo(items[0]).type,"temple");
 assert.equal(myTubeCourseInfo(items[0]).tradition,"greek");
 assert.deepEqual(listMyTubeCourseTypes([...items,demeter]),["temple"]);
 assert.deepEqual(listMyTubeCourseTraditions([...items,demeter],"temple"),["greek"]);
 assert.deepEqual(listMyTubeCourseSeries([...items,demeter],"temple","greek").map(x=>x.id),
   ["greek-dionysus","greek-demeter"]);
 assert.deepEqual(sortMyTubeCourseLessons(items).map(x=>x.seriesOrder),[1,2,3,4,5,6,7]);
 assert.equal(matchesMyTubeShelf(items[0],"courses"),true);
 const shortCourseLesson={sourceGroup:"videos/greek-mysteries-demeter",
    seriesOrder:2,durationVerifiedSeconds:90};
 assert.equal(matchesMyTubeShelf(shortCourseLesson,"courses"),true,"course membership beats short duration");
});
test("Masters requires actual presentation metadata or a specific introductory title",()=>{
 assert.equal(isMyTubeMasterPresentation({title:"Meet the master — Maria",curation:"published"}),true);
 assert.equal(isMyTubeMasterPresentation({title:"Знакомство с мастером",curation:"verified"}),true);
 assert.equal(isMyTubeMasterPresentation({title:"Masterclass in Reiki",curation:"verified"}),false);
 assert.equal(isMyTubeMasterPresentation({sourceGroup:"site-introduction",title:"Our service",curation:"published"}),false);
 assert.equal(isMyTubeMasterPresentation({sourceGroup:"master-presentations",sourceApproved:false}),false);
 assert.equal(matchesMyTubeShelf({}, "all"),false);
});
test("MyTube routes preserve numbered original course order and do not change other Library layout",()=>{
 const page=read("app/[locale]/mytube/page.tsx");
 const view=read("components/video-discovery.tsx");
 const hub=read("components/library-hub.tsx");
 assert.match(page,/buildPublicVideoDiscoveryItems\(locale,videos,approvedMeditations\)/);
 assert.match(hub,/seriesOrder: lesson\.order/);
 assert.match(hub,/mytubeLessonOrder:Number\.isInteger\(media\.order\)/);
 assert.match(view,/sortMyTubeCourseLessons\(matches\)/);
 assert.match(view,/variant!=="mytube"&&<>/);
 assert.match(view,/mytubeShelf=\{variant==="mytube"\?formatMode:undefined\}/);
});

test("numbered short course lessons stay in courses; full MyTube playlists are not paginated",()=>{
 const shortLesson={kind:"video",id:"lesson9",sourceGroup:"videos/greek-mysteries-dionysus",
   seriesId:"greek-dionysus",seriesOrder:9,contentType:"soft_meditation",
   durationVerifiedSeconds:300,sourceApproved:true,curation:"verified"};
 assert.equal(matchesMyTubeShelf(shortLesson,"courses"),true);
 assert.equal(matchesMyTubeShelf(shortLesson,"practices"),false);
 const longSeries=Array.from({length:12},(_,i)=>({...shortLesson,id:"lesson"+i,seriesOrder:12-i}));
 assert.deepEqual(sortMyTubeCourseLessons(longSeries).map(item=>item.seriesOrder),
   Array.from({length:12},(_,i)=>i+1));
 const feed=read("components/library-feed.tsx");
 const view=read("components/video-discovery.tsx");
 assert.match(feed,/visibleLimit = mytubeShelf === "courses" \? filtered\.length/);
 assert.match(view,/setSearch\(""\);setSavedOnly\(false\);setHiddenIds\(\[\]\)/);
});
