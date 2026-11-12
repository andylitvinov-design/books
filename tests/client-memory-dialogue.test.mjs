import test from 'node:test'
import assert from 'node:assert/strict'
import {memoryAwareReply} from '../lib/holistic-support/client-memory-dialogue.mjs'
const memory=[{id:'g',category:'goal',value:'Стать увереннее на встречах',privacyClass:'general'},
 {id:'s',category:'resource',value:'Частная медицинская запись',privacyClass:'sensitive'}]
const tasks=[{id:'t1',title:'Спокойно подготовиться ко встрече',status:'accepted'}]
test('RU greeting recalls only client-confirmed general goal',()=>{
 const x=memoryAwareReply({locale:'ru',message:'Привет',memories:memory,tasks})
 assert.match(x.reply,/увереннее/)
 assert.equal(x.memorySaved,false)
 assert.deepEqual(x.usedSavedMemoryIds,['g'])
 assert.doesNotMatch(x.reply,/медицинская/)
})
test('EN/ES show privacy-safe memory only in explicit request',()=>{
 for(const [locale,message,word] of [['en','what do you remember about me','allowed'],
   ['es','qué recuerdas de mí','permitiste']]){
   const x=memoryAwareReply({locale,message,memories:memory})
   assert.match(x.reply,new RegExp(word,'i'))
   assert.doesNotMatch(x.reply,/медицинская/)
   assert.equal(x.modelUsed,false)
 }
})
test('accepted task read is informational, not falsely marked complete',()=>{
 const x=memoryAwareReply({locale:'en',message:'my tasks',tasks,memories:[]})
 assert.equal(x.status,'clarify')
 assert.match(x.reply,/accepted practice/i)
 assert.equal(x.memorySaved,false)
})
test('negation never creates a memory proposal',()=>{
 for(const message of ['Не запоминай это','Do not remember this','No guardes esto']){
   const x=memoryAwareReply({locale:'en',message,memories:memory})
   assert.match(x.reply,/not save/i)
   assert.deepEqual(x.usedSavedMemoryIds,[])
 }
})
test('general dialogue falls through; absent goal keeps plain greeting',()=>{
 assert.equal(memoryAwareReply({locale:'ru',message:'хочу создать видео',memories:memory}),null)
 assert.equal(memoryAwareReply({locale:'ru',message:'привет',memories:[]}),null)
})
test('assistant never uses sensitive memory for greeting or list',()=>{
 const onlySensitive=[{id:'a',category:'goal',value:'Личная история',privacyClass:'sensitive'}]
 assert.equal(memoryAwareReply({locale:'ru',message:'привет',memories:onlySensitive}),null)
 assert.doesNotMatch(memoryAwareReply({locale:'ru',message:'покажи мою память',memories:onlySensitive}).reply,/Личная история/)
})
test('offered, declined and archived tasks are excluded from next step',()=>{
 const x=memoryAwareReply({locale:'ru',message:'мои задания',tasks:[
   {title:'не принятая',status:'offered'},{title:'отказался',status:'declined'}]})
 assert.doesNotMatch(x.reply,/не принятая|отказался/)
 assert.match(x.reply,/нет принятых/)
})

test('private task title is not quoted without separate sensitive consent',()=>{
 const privateTasks=[{id:'t',title:'private medication detail',status:'accepted'}]
 const normal=memoryAwareReply({locale:'en',message:'my tasks',tasks:privateTasks})
 assert.doesNotMatch(normal.reply,/medication/i)
 assert.match(normal.reply,/accepted practice/i)
 const explicit=memoryAwareReply({locale:'en',message:'my tasks',tasks:privateTasks,allowTaskDetails:true})
 assert.match(explicit.reply,/medication/i)
})
