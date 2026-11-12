import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 VIDEO_CONCEPT_FIELD_LABELS,enrichVideoConcept
} from "../lib/mandala/video-concept-semantic.mjs";
import {
 suggestVideoConcept,reviseVideoConcept,videoConceptIsValid
} from "../lib/mandala/auto-video-concept.mjs";
import {planAudioVisualStoryboard} from "../lib/mandala/audio-visual-storyboard.mjs";
import {getMyTubeTopic} from "../lib/mandala/mytube-content-taxonomy.mjs";

const speaking=(lines)=>({
 text:lines.join(" "),durationSeconds:lines.length*4,
 segments:lines.map((text,i)=>({
  text,startSeconds:i*4,endSeconds:(i+1)*4
 }))
});

test("Concept v2 covers exactly the 38 canonical fields with RU/EN/ES labels",()=>{
 assert.equal(VIDEO_CONCEPT_FIELD_LABELS.length,38);
 assert.equal(new Set(VIDEO_CONCEPT_FIELD_LABELS.map(f=>f.id)).size,38);
 for(const field of VIDEO_CONCEPT_FIELD_LABELS){
  for(const lang of ["ru","en","es"])assert.ok(field[lang]?.trim(),field.id+":"+lang);
 }
 const concept=suggestVideoConcept({locale:"ru"});
 assert.equal(Object.keys(concept.parameters).length,38);
 assert.equal(videoConceptIsValid(concept),true);
 assert.equal(concept.source,"catalog_example");
});

test("Russian birthday-to-mother voice generates celebration, family audience, four actual beats",()=>{
 const transcript=speaking([
  "Хочу поздравить маму с днём рождения.",
  "Спасибо за твою заботу и поддержку.",
  "Пусть новый год принесёт радость и тепло.",
  "Желаю счастья и любви."
 ]);
 const concept=suggestVideoConcept({
  locale:"ru",goal:"",theme:"energy",speechTranscript:transcript
 });
 assert.equal(concept.schemaVersion,"hh-concept-auto-v2");
 assert.equal(concept.source,"audio_transcript");
 assert.equal(concept.semanticPurpose,"celebration");
 assert.equal(concept.semanticAudience,"family");
 assert.equal(concept.meaningAxisId,"connection");
 assert.equal(concept.speechBeatsSource,"transcript");
 assert.equal(concept.sceneOutline.length,4);
 assert.match(concept.sceneOutline[1],/Спасибо/);
 assert.equal(getMyTubeTopic(concept.topicId)?.category.id,concept.categoryId);
 assert.equal(concept.parameters.audience.status,"extracted");
 assert.equal(concept.parameters.styleId.status,"suggested");
 assert.equal(concept.mediaBindingStatus,"editorial_only_unverified");
 assert.equal(videoConceptIsValid(concept),true);
});

test("English presentation and Spanish meditation get different purpose and style",()=>{
 const presentation=suggestVideoConcept({
  locale:"en",goal:"",theme:"life",speechTranscript:speaking([
   "I want a presentation of my business services for clients.",
   "Explain what problem the service solves.",
   "Demonstrate practical value for the customer.",
   "Invite them to contact us."
  ])
 });
 const meditation=suggestVideoConcept({
  locale:"es",goal:"",theme:"money",speechTranscript:speaking([
   "Quiero una meditación suave para relajarme.",
   "Respiro con calma y noto mis manos.",
   "Dejo que el cuerpo descanse.",
   "Termino despacio y con tranquilidad."
  ])
 });
 assert.equal(presentation.semanticPurpose,"presentation");
 assert.equal(presentation.semanticAudience,"client");
 assert.equal(presentation.categoryId,"goals-money");
 assert.equal(meditation.semanticPurpose,"practice");
 assert.equal(meditation.styleId,"meditative");
 assert.equal(meditation.parameters.method.value,"meditation");
 for(const concept of [presentation,meditation]){
  assert.equal(Object.keys(concept.parameters).length,38);
  assert.equal(videoConceptIsValid(concept),true);
  assert.equal(concept.parameters.creationMode.source,"render_policy");
  assert.equal(concept.parameters.delivery.status,"synchronized");
  assert.equal(concept.parameters.timelineBinding.value,null);
 }
});

test("Avoid directives stay exclusions rather than requested symbols or video claims",()=>{
 const transcript=speaking([
  "Хочу спокойный ролик про свет, но без леса и воды.",
  "Никаких резких вспышек и мигания.",
  "Пусть будет больше простора.",
  "В конце мягкий рассвет."
 ]);
 const concept=suggestVideoConcept({locale:"ru",speechTranscript:transcript});
 assert.deepEqual(concept.avoidImagery.includes("forest"),true);
 assert.deepEqual(concept.avoidImagery.includes("water"),true);
 assert.deepEqual(concept.avoidImagery.includes("flashing"),true);
 assert.equal(videoConceptIsValid(concept),true);
 const blocked=planAudioVisualStoryboard({
  transcript,scenes:[],concept,aspect:"landscape"
 });
 assert.equal(blocked.canExport,false);
 assert.notEqual(blocked.status,"READY_FOR_REVIEW");
});

test("Audio changes re-key the concept, but repeated input is deterministic",()=>{
 const one=speaking([
  "Я хочу спокойное видео.","Мне важна опора.",
  "Выбираю плавные кадры.","В конце свет."
 ]);
 const two=speaking([
  "Я хочу динамичное видео.","Мне важна энергия.",
  "Выбираю движение.","В конце солнце."
 ]);
 const options={locale:"ru",goal:"Моя цель",theme:"energy"};
 const a=suggestVideoConcept({...options,speechTranscript:one});
 const b=suggestVideoConcept({...options,speechTranscript:one});
 const c=suggestVideoConcept({...options,speechTranscript:two});
 assert.deepEqual(a,b);
 assert.notEqual(a.signature,c.signature);
 assert.notDeepEqual(a.sceneOutline,c.sceneOutline);
 assert.equal(a.hasPersonalInput,true);
});

test("Manual cascades update visible parameter values without erasing owners",()=>{
 const initial=suggestVideoConcept({locale:"en",goal:"More self confidence",theme:"energy"});
 const edited=reviseVideoConcept(initial,{
  categoryId:"goals-money",subcategoryId:"",topicId:"",scenarioId:"",
  motifId:"",styleId:"cinematic"
 },"en");
 assert.equal(videoConceptIsValid(edited),true);
 assert.equal(edited.parameters.categoryId.value,edited.categoryId);
 assert.equal(edited.parameters.topicId.value,edited.topicId);
 assert.equal(edited.parameters.scenarioId.value,edited.scenarioId);
 assert.equal(edited.parameters.styleId.value,"cinematic");
 assert.equal(edited.parameters.styleId.status,"manual");
 assert.equal(edited.parameters.wordsAndVoice.source,"ideas_voice");
 assert.equal(edited.parameters.soundtrack.source,"audio");
});

test("Existing STT endpoint remains the only transcript transport; UI feeds audio to concept",()=>{
 const endpoint=readFileSync(new URL(
  "../app/api/holistic-support/audio-storyboard/route.js",import.meta.url),"utf8");
 const editor=readFileSync(new URL(
  "../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 const panel=readFileSync(new URL(
  "../components/mandala-video-concept.tsx",import.meta.url),"utf8");
 const scene=readFileSync(new URL(
  "../lib/mandala/audio-visual-storyboard.mjs",import.meta.url),"utf8");
 const semantic=readFileSync(new URL(
  "../lib/mandala/video-concept-semantic.mjs",import.meta.url),"utf8");
 assert.match(endpoint,/requireSameOrigin\(request,config\)/);
 assert.match(endpoint,/HH_AUDIO_STT_FREE_CONFIRMED/);
 assert.match(editor,/speechTranscript=\{voiceTranscript\}/);
 assert.match(editor,/concept:speechConcept/);
 assert.match(editor,/setActiveWorkspace\("phrases"\);setIdeasSubtab\("concept"\)/);
 assert.match(panel,/data-video-concept-all-parameters/);
 assert.match(panel,/data-video-concept-from-audio/);
 assert.match(scene,/isSafeMontageScene\(scene,sceneExclusions\)/);
 assert.match(scene,/validateMontageClips\(ids,scenes,sceneExclusions/);
 assert.doesNotMatch(semantic,/\bfetch\s*\(|\bXMLHttpRequest\b|\blocalStorage\b/);
});


test("anxiety without a clear cause uses inner support rather than invented family or bridge",()=>{
 const goal="Anxiety for No Clear Reason";
 const suggestion=suggestVideoConcept({locale:"en",theme:"health",goal,
  phrases:["My family supports me","I need to see a bridge","My mum will help me"]});
 assert.equal(suggestion.semanticAudience,null,"editorial Ideas cannot establish a recipient");
 assert.equal(suggestion.parameters.audience.status,"unknown");
 assert.equal(suggestion.meaningAxisId,"anchor");
 assert.equal(suggestion.motifId,"nest");
 assert.equal(suggestion.parameters.intent.source,"goal");
 assert.notEqual(suggestion.mainMessage,goal);
 assert.match(suggestion.mainMessage,/steadiness|support/i);
 assert.match(suggestion.emotionalProgram[0],/uncertainty/i);
 assert.match(suggestion.emotionalProgram.at(-1),/answer/i);
 assert.equal(suggestion.sceneOutline.length,4);
 assert.notDeepEqual(suggestion.emotionalProgram,["Arrive","Support","Explore","Integrate"]);
 assert.equal(videoConceptIsValid(suggestion),true);
 assert.equal(suggestion.mediaBindingStatus,"editorial_only_unverified");
});
test("anxiety meaning remains grounded in Russian and Spanish without invented recipient",()=>{
 for(const [locale,goal] of [
  ["ru","Тревога без понятной причины"],
  ["es","Ansiedad sin razón clara"]
 ]){
  const p=suggestVideoConcept({locale,goal,theme:"relationships",
   phrases:["Для семьи и близких","For my family"]});
  assert.equal(p.semanticAudience,null,locale);
  assert.equal(p.meaningAxisId,"anchor",locale);
  assert.equal(p.motifId,"nest",locale);
  assert.equal(p.emotionalProgram.length,4,locale);
  assert.ok(p.mainMessage.length>18,locale);
  assert.equal(p.parameters.mainMessage.source,"editorial",locale);
  assert.equal(videoConceptIsValid(p),true,locale);
 }
});
test("family audience needs an explicit recipient; a story about family is not for family",()=>{
 const distress=suggestVideoConcept({locale:"en",goal:"Anxiety when I see my family"});
 assert.equal(distress.semanticAudience,null);
 const greeting=suggestVideoConcept({locale:"ru",goal:"Хочу поздравить маму с днём рождения"});
 assert.equal(greeting.semanticAudience,"family");
 assert.equal(greeting.semanticPurpose,"celebration");
 assert.equal(greeting.motifId,"flower");
 assert.match(greeting.mainMessage,/поздравлен/i);
 assert.notEqual(greeting.mainMessage,greeting.goal);
 const forClient=suggestVideoConcept({locale:"en",goal:"A presentation of services for clients"});
 assert.equal(forClient.semanticAudience,"client");
 assert.equal(forClient.semanticPurpose,"presentation");
 assert.match(forClient.mainMessage,/value/i);
});
test("author-supplied audio remains actual speech while editorial main idea differs",()=>{
 const transcript=speaking([
  "I am worried without knowing why.",
  "I want to find a calmer moment.",
  "Maybe I can slow down for a breath.",
  "I can stop without forcing an answer."
 ]);
 const p=suggestVideoConcept({locale:"en",speechTranscript:transcript,goal:"Old unrelated text"});
 assert.equal(p.goal,"I am worried without knowing why");
 assert.equal(p.parameters.intent.source,"speech");
 assert.equal(p.parameters.mainMessage.source,"editorial");
 assert.match(p.sceneOutline[0],/worried/i);
 assert.equal(p.speechBeatsSource,"transcript");
 assert.equal(p.semanticAudience,null);
 assert.equal(p.motifId,"nest");
 assert.equal(p.emotionalProgram.length,4);
 assert.equal(Object.keys(p.parameters).length,38);
});
