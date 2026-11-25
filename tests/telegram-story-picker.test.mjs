import test from 'node:test';
import assert from 'node:assert/strict';
import {storyChoiceKeyboard,parseStoryChoice} from '../lib/mandala/telegram-story-picker.mjs';
test('five levels retain four category choices and expose all six canonical plot variants',()=>{
 const session='abcdef012345',revision=7;
 let selection={};
 for(const [step,key] of [['category','categoryId'],['subcategory','subcategoryId'],['topic','topicId'],['scenario','scenarioId'],['plot','plotId']]){
  const result=storyChoiceKeyboard({step,selection,session,revision});
  assert.equal(result.options.length,step==='plot'?6:4);
  for(const [i,row] of result.reply_markup.inline_keyboard.entries()){
   const data=row[0].callback_data;
   assert.ok(Buffer.byteLength(data)<=64);
   assert.deepEqual(parseStoryChoice(data),{session,revision,step,index:i});
  }
  selection={...selection,[key]:result.options[0].id};
 }
 assert.ok(selection.plotId);
});
test('bad callbacks and incomplete ancestry fail closed',()=>{
 assert.equal(parseStoryChoice('hh-story:bad:0:0:0'),null);
 assert.equal(parseStoryChoice('hh-story:abcdef012345:0:9:0'),null);
 assert.equal(parseStoryChoice('hh-story:abcdef012345:0:0:4'),null,'categories must reject index 4');
 assert.equal(parseStoryChoice('hh-story:abcdef012345:0:4:5')?.index,5,'plot may select sixth item');
 assert.equal(parseStoryChoice('hh-story:abcdef012345:0:4:6'),null,'sixth plot is maximum');
 assert.equal(storyChoiceKeyboard({step:'plot',session:'abcdef012345',revision:0}),null);
 assert.equal(storyChoiceKeyboard({step:'category',session:'bad',revision:0}),null);
});
