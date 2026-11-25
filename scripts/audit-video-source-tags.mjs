/** Read-only audit of all approved film/animation scene tags and source orientations. */
import original from "../data/video-catalog/original-motion-scenes-v1.json" with {type:"json"};
import master from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import ranking from "../data/video-catalog/mytube-scene-rankings-v1.json" with {type:"json"};
import {MYTUBE_VISUAL_MOTIFS,MYTUBE_VISUAL_STYLES} from "../lib/mandala/mytube-creative-choices.mjs";
import {auditVideoSceneTags} from "../lib/mandala/video-source-tag-facets.mjs";
const topicsById=Object.fromEntries(ranking.scenes.map(x=>[x.sceneId,x.topics]));
const result=auditVideoSceneTags([...master.scenes,...original.scenes],{
 topicsById,motifs:MYTUBE_VISUAL_MOTIFS,styles:MYTUBE_VISUAL_STYLES,
});
const {records,...summary}=result;
console.log(JSON.stringify(process.argv.includes("--details")?result:summary,null,2));
const total=master.scenes.length+original.scenes.length;
const geometries=Object.values(result.aspectCounts).reduce((sum,n)=>sum+n,0);
if(result.missing.length||result.total!==total||result.tagged!==total||
 geometries!==total)process.exitCode=1;
