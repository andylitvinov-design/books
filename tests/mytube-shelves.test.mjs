import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  isMyTubeMeditationPractice,isMyTubeMasterPresentation,isMyTubeEducationalVideo,matchesMyTubeShelf,
  myTubeCourseInfo,listMyTubeCourseTypes,listMyTubeCourseTraditions,
  listMyTubeCourseSeries,sortMyTubeCourseLessons,sortMyTubeMasterPresentations
} from "../lib/video-discovery/mytube-shelves.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("exactly four exclusive MyTube sections without an All section",()=>{
 const view=read("components/video-discovery.tsx");
 const css=read("components/video-discovery.module.css");
 assert.match(view,/\(\["practices","courses","masters","videos"\] as const\)\.map/);
 assert.doesNotMatch(view,/\(\["all","shorts","courses","study"\] as const\)/);
 assert.match(view,/data-mytube-format-mode=\{mode\}/);
 const playlists=read("components/mytube-course-playlists.tsx");
 assert.match(playlists,/data-mytube-course-type=\{value\}/);
 assert.match(playlists,/data-mytube-course-tradition=\{value\}/);
 assert.match(playlists,/data-mytube-course-series=\{group\.id\}/);
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
test("nine published site presentations are available in Masters without elevating unreviewed videos",()=>{
  const hub=read("components/library-hub.tsx");
  const feed=read("components/library-feed.tsx");
  const videoRegistry=hub.slice(hub.indexOf("const videoYouTubeIds:"),hub.indexOf("/** The Library and Ideas surfaces"));
  const approvedIds=[
    "Y4K4piEwwA8","s30Y42IwPcg","ILyRWyHtJoE","vqRmI79cecQ",
    "sfVFOQNr2qk","AE8Pelpo424","Cz6SxXJNZbw","Q9NvYECKWuc","eLsjFaKCBhI",
  ];
  assert.equal(new Set(approvedIds).size,9);
  for(const id of approvedIds)assert.ok(videoRegistry.includes('"'+id+'"'),id+" must be source-backed");
  assert.match(hub,/const approvedSiteMasterIds=new Set\(siteIntroductions\.map\(video=>video\.youtubeId\)\)/);
  assert.match(hub,/approvedSiteMasterIds\.has\(video\.youtubeId\)&&video\.sourceApproved===true/);
  assert.match(hub,/!video\.seriesId&&!Number\.isInteger\(video\.seriesOrder\)/);
  assert.match(hub,/mytubeSection:"masters" as const,author:"Andy"/);
  const presentation={kind:"video",youtubeId:"vqRmI79cecQ",title:"Psychotherapy — introduction in English",
    sourceGroup:"site-introduction",sourceApproved:true,curation:"published",mytubeSection:"masters"};
  assert.equal(matchesMyTubeShelf(presentation,"masters"),true);
  for(const shelf of ["practices","courses","videos"])assert.equal(matchesMyTubeShelf(presentation,shelf),false);
  assert.equal(matchesMyTubeShelf({...presentation,mytubeSection:undefined},"masters"),false);
  assert.equal(matchesMyTubeShelf({...presentation,sourceApproved:false},"masters"),false);
  assert.equal(matchesMyTubeShelf({sourceGroup:"site-introduction",title:"Our service",
    curation:"published",sourceApproved:true},"masters"),false);
  assert.match(feed,/mytubeShelf === "masters"\) \? filtered\.length/);
});
test("Masters prioritizes videos without a reviewed AI mark and keeps AI-assisted mirrors below",()=>{
  const hub=read("components/library-hub.tsx");
  const view=read("components/video-discovery.tsx");
  const mirrorSource=read("components/site-video-player.tsx");
  const catalog=hub.slice(hub.indexOf("const videoItemsByLocale:"),hub.indexOf("// Source-backed discovery indexes"));
  const aiIds=["Y4K4piEwwA8","s30Y42IwPcg","ILyRWyHtJoE",
    "AE8Pelpo424","Cz6SxXJNZbw","Q9NvYECKWuc"];
  for(const id of aiIds){
    assert.ok(mirrorSource.includes('"'+id+'"'),"AI marker needs a checked HeyGen source: "+id);
  }
  assert.equal((catalog.match(/aiAssisted: true/g)||[]).length,6);
  for(const id of ["vqRmI79cecQ","eLsjFaKCBhI","sfVFOQNr2qk"]){
    assert.ok(hub.includes('"'+id+'"'),"unmarked source video retained: "+id);
    assert.equal(aiIds.includes(id),false);
  }
  assert.match(hub,/aiAssisted:video\.aiAssisted/);
  assert.match(hub,/const approvedAiMasterIds=new Set\(siteIntroductions/);
  assert.match(hub,/aiAssisted:approvedAiMasterIds\.has\(video\.youtubeId\)/);
  assert.match(view,/if\(variant==="mytube"&&formatMode==="masters"\)return sortMyTubeMasterPresentations\(matches\)/);
  const ranked=[
    {id:"ai-1",aiAssisted:true},{id:"unmarked-en"},
    {id:"ai-2",aiAssisted:true},{id:"unmarked-ru",aiAssisted:false},
    {id:"unmarked-case"},{id:"ai-3",aiAssisted:true},
  ];
  assert.deepEqual(sortMyTubeMasterPresentations(ranked).map(item=>item.id),
    ["unmarked-en","unmarked-ru","unmarked-case","ai-1","ai-2","ai-3"]);
  assert.deepEqual(ranked.map(item=>item.id),
    ["ai-1","unmarked-en","ai-2","unmarked-ru","unmarked-case","ai-3"],
    "sorting must not mutate the ranked source feed");
  assert.deepEqual(sortMyTubeMasterPresentations(ranked.filter(item=>item.id==="ai-2"||
    item.id==="unmarked-ru")).map(item=>item.id),["unmarked-ru","ai-2"]);
  assert.deepEqual(sortMyTubeMasterPresentations([]),[]);
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
 assert.match(feed,/mytubeShelf === "courses" \|\| mytubeShelf === "practices" \|\| mytubeShelf === "videos" \|\| mytubeShelf === "masters"/);
 assert.match(view,/setSearch\(""\);setSavedOnly\(false\);setHiddenIds\(\[\]\)/);
});
