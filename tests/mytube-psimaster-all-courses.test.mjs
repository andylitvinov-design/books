import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  matchesMyTubeShelf,listMyTubeCourseSeries,sortMyTubeCourseLessons,
} from "../lib/video-discovery/mytube-shelves.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const archived=JSON.parse(read("data/academy/psimaster-media.generated.json"));
const originalIds=["lOkX_8TM-FA","DPdDGnU4DL8","1oshNCVzHR8",
  "uN5BFjdKVvY","h8r_fIVWM0U","ZYGjw0PtvdM"];

test("six original PsiMaster practices are real source-backed, publicly embedded recordings",()=>{
  for(const id of originalIds){
    const entries=archived.filter(row=>row.videoId===id);
    assert.ok(entries.some(row=>row.status==="verified_legacy_public_embed"),id);
  }
  const hub=read("components/library-hub.tsx");
  assert.match(hub,/freeMeditationVideos\("ru"\)/);
  assert.match(hub,/\.filter\(video=>video\.id!=="95peObUizeE"\)/);
  assert.match(hub,/\.\.\.originalPsiMasterPractices/);
  assert.match(hub,/sourceGroup:"psimaster-original-meditations"/);
});

test("original publicly embedded meditation can be a practice with unknown duration without releasing candidates",()=>{
  const original={kind:"video",youtubeId:"lOkX_8TM-FA",
    sourceGroup:"psimaster-original-meditations",contentType:"soft_meditation",
    sourceApproved:true,curation:"verified",durationVerifiedSeconds:null};
  assert.equal(matchesMyTubeShelf(original,"practices"),true);
  assert.equal(matchesMyTubeShelf(original,"courses"),false);
  assert.equal(matchesMyTubeShelf({...original,sourceApproved:false},"practices"),false);
  assert.equal(matchesMyTubeShelf({...original,editorial_status:"candidate"},"practices"),false);
  assert.equal(matchesMyTubeShelf({...original,embed_status:"unverified"},"practices"),false);
  assert.equal(matchesMyTubeShelf({...original,sourceGroup:"videos/planetary-power"},"practices"),false);
  const unrelated={...original,sourceGroup:"approved-meditations"};
  assert.equal(matchesMyTubeShelf(unrelated,"practices"),false);
  const query=read("lib/video-discovery/approved-meditations.ts");
  assert.match(query,/editorial_status='approved' and embed_status='confirmed'/);
  assert.match(query,/duration_verified_seconds between 1 and 600/);
});

test("All courses lists every series without mandatory category and keeps each ordered",()=>{
  const make=(course,n)=>({
    id:course+n,sourceGroup:course,seriesOrder:n,curation:"verified",
    sourceApproved:true,kind:"video",title:"Lesson "+n,
  });
  const first="videos/greek-mysteries-dionysus",second="videos/greek-mysteries-demeter";
  const list=[make(first,3),make(second,2),make(first,1),
    make(second,1),make(first,2)];
  const series=listMyTubeCourseSeries(list,"all","all");
  assert.equal(series.length,2);
  assert.deepEqual(series.map(item=>item.count),[3,2]);
  assert.deepEqual(sortMyTubeCourseLessons(list).map(item=>item.id),[
    first+"1",first+"2",first+"3",second+"1",second+"2"
  ]);
  assert.equal(listMyTubeCourseSeries(list,"temple","all").length,2);
  assert.equal(listMyTubeCourseSeries(list,"temple","greek").length,2);
});

test("MyTube shows course names and lessons immediately; category filters optional",()=>{
  const discovery=read("components/video-discovery.tsx");
  const feed=read("components/library-feed.tsx");
  assert.match(discovery,/const \[courseType,setCourseType\]=useState\("all"\)/);
  assert.match(discovery,/const \[courseSeriesId,setCourseSeriesId\]=useState\("all"\)/);
  assert.match(discovery,/data-mytube-course-type="all"/);
  assert.match(discovery,/data-mytube-course-series="all"/);
  assert.match(discovery,/activeCourseSeries!=="all"/);
  assert.match(feed,/data-mytube-course-heading=\{courseInfo\.id\}/);
  assert.match(feed,/visibleLimit = mytubeShelf === "courses" \? filtered\.length/);
});

test("all verified PsiMaster planetary meditations complement the original Sun and Ajna set",()=>{
  const planets=archived.filter(media=>media.logicalId==="videos/planetary-power"&&
    media.status==="verified_legacy_public_embed");
  assert.equal(planets.length,11,"entire original Planetary Power source is present");
  const ids=new Set([...originalIds,...planets.map(media=>media.videoId)]);
  assert.equal(ids.size,15,"deduplicate the two overlapping PsiMaster source channels");
  for(const title of ["Марс","Меркурий","Юпитера","Сатурна","Круг денег"]){
    assert.ok(planets.some(media=>media.lessonTitle.includes(title)),title);
  }
  const hub=read("components/library-hub.tsx");
  assert.match(hub,/psimasterMedia/);
  assert.match(hub,/media\.logicalId==="videos\/planetary-power"/);
  assert.match(hub,/media\.status==="verified_legacy_public_embed"/);
  assert.match(hub,/!curatedIds\.has\(media\.videoId\)/);
});
