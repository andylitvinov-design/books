import test from 'node:test';
import assert from 'node:assert/strict';
import {aliFreeDiagnosticTurn,aliFreeDiagnosticSummary} from '../lib/assist/ali-free-diagnostic.mjs';
import {v3Context,v3ButtonsFor,V3_LABELS,v3Action} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
import {telegramInlineButtonForText,telegramInlineCallbackSelection}
  from '../lib/crm/telegram-inline-buttons.mjs';
import {TELEGRAM_DIAGNOSTIC_V2_BUTTON_LABELS}
  from '../lib/crm/telegram-diagnostic-v2.mjs';
import {validFreeMedia,safeFreeMediaReceipt,acceptedFreeMedia,
  freePackageCopy,freePackageStatusMessage,reviewPackageStatus,freePackageOwnerNotice,
  freeProgressStepTransition,freePackageStatusIntent,freeFormReceiptIntent,freePackageCaseReference,
  freeMissingCoreAnswers,freeCoreAnswersReady,freeCoreQuestion,FREE_MEDIA_BYTES} from '../lib/crm/ali-free-package-receipts.mjs';

const fakeFile='A_valid_Telegram_file_123456';
const fakeMessage='tg:1234567:555';
const photo={fileId:fakeFile,bytes:1024,messageId:fakeMessage};
test('RU/EN three diagnostic questions satisfy the protected CRM gate',()=>{
 const stories={
  ru:['Хочу наладить отношения','Мне трудно сказать о своих чувствах',
   'Сейчас мы почти не разговариваем'],
  en:['I want clarity at work','I worry about making a mistake',
   'Recently I changed my job'],
 };
 for(const [locale,answers] of Object.entries(stories)){
  let state={stage:'goal',slots:{},turns:[]};
  const expected=['challenge','situation','ready'];
  for(const [i,answer] of answers.entries()){
   const result=aliFreeDiagnosticTurn({...state,message:answer,locale});
   assert.equal(result.stage,expected[i],locale+' stage '+i);
   assert.ok(result.slots[['goal','challenge','situation'][i]],locale);
   assert.ok((result.reply.match(/[?？]/g)||[]).length<=1,'one question per message');
   state={stage:result.stage,slots:result.slots,turns:[
     ...state.turns,{role:'user',text:answer},{role:'assistant',text:result.reply}]};
  }
  assert.equal(freeCoreAnswersReady({intakeSlots:state.slots}),true);
  const summary=aliFreeDiagnosticSummary({locale,slots:state.slots});
  for(const answer of answers)assert.ok(summary.includes(answer.slice(0,15)),answer);
 }
 const legacy=aliFreeDiagnosticTurn({locale:'en',stage:'impact',
   slots:{goal:'I want clarity',challenge:'Difficulty',situation:'New job'},
   message:'It affects my confidence'});
 assert.equal(legacy.stage,'attempts','legacy optional interviews remain resumable');
});
test('three original client facts are required before drawing and handoff',()=>{
 const ctx={intakeSlots:{goal:'I want clarity',situation:'There is pressure'}};
 assert.deepEqual(freeMissingCoreAnswers(ctx),['challenge']);
 assert.equal(freeCoreAnswersReady(ctx),false);
 assert.match(freeCoreQuestion(ctx,'en'),/difficult/);
 assert.match(freeCoreQuestion(ctx,'ru'),/мешает/);
 assert.deepEqual(reviewPackageStatus(ctx),{
   answers:'missing',drawing:'missing',portrait:'missing',form:'missing',handoff:'missing',
 });
 const complete={intakeSlots:{...ctx.intakeSlots,challenge:'I have limited time'}};
 assert.equal(freeCoreAnswersReady(complete),true);
 assert.equal(freeCoreQuestion(complete,'en'),null);
 assert.equal(reviewPackageStatus(complete).answers,'received');
});
test('optional personal photo and drawing require signed metadata plus actual byte verification later',()=>{
 assert.equal(FREE_MEDIA_BYTES,5*1024*1024);
 assert.equal(validFreeMedia({photoFileId:fakeFile,photoBytes:2048,messageId:fakeMessage}),true);
 assert.equal(validFreeMedia({photoFileId:fakeFile,photoBytes:FREE_MEDIA_BYTES+1,messageId:fakeMessage}),false);
 assert.equal(validFreeMedia({photoFileId:'fake',photoBytes:1024,messageId:fakeMessage}),false);
 assert.equal(validFreeMedia({photoFileId:fakeFile,messageId:fakeMessage}),true,
   'optional declared Telegram file_size must be verified from actual downloaded bytes');
 assert.equal(safeFreeMediaReceipt({fileId:fakeFile,bytes:1024,messageId:fakeMessage})?.status,'received');
 for(const b of [0,-3,FREE_MEDIA_BYTES+1])assert.equal(
   safeFreeMediaReceipt({fileId:fakeFile,bytes:b,messageId:fakeMessage}),null);
 assert.equal(safeFreeMediaReceipt({fileId:fakeFile,bytes:1024,messageId:'bad'}),null);
 let state={intakeSlots:{goal:'Clarity',challenge:'Uncertainty',situation:'Recently changed jobs'},mediaStep:'drawing'};
 state=acceptedFreeMedia(state,'drawing',safeFreeMediaReceipt(photo));
 assert.equal(state.mediaStep,'review');
 assert.equal(state.mediaReceipts.drawing.status,'received');
 assert.equal(state.mediaReceipts.drawing.fileId,fakeFile);
 state={...state,mediaStep:'portrait',formReceipt:{status:'received',referenceCode:'HH-123456789ABC'}};
 state=acceptedFreeMedia(state,'portrait',safeFreeMediaReceipt(photo));
 assert.equal(state.mediaStep,'complete');
 assert.equal(state.mediaReceipts.drawing.status,'received');
 assert.deepEqual(reviewPackageStatus(state),
   {answers:'received',drawing:'received',form:'received',portrait:'received',handoff:'received'});
});
test('explicit skipped material stays skipped and never pretends to have received an image',()=>{
 let state={mediaStep:'drawing',intakeSlots:{challenge:'Work uncertainty'}};
 state=freeProgressStepTransition(state,'skipdrawing');
 assert.equal(state.mediaStep,'review');
 assert.equal(state.mediaReceipts.drawing.status,'skipped');
 assert.equal(state.mediaReceipts.drawing.fileId,undefined);
 assert.equal(freeProgressStepTransition(state,'skipportrait'),null);
 state={...state,mediaStep:'portrait',formReceipt:{status:'received',referenceCode:'HH-123456789ABC'}};
 state=freeProgressStepTransition(state,'skipportrait');
 assert.equal(state.mediaStep,'complete');
 assert.equal(state.mediaReceipts.drawing.status,'skipped');
 assert.equal(freeProgressStepTransition(state,'skipportrait'),null);
 assert.deepEqual(reviewPackageStatus(state),
   {answers:'missing',drawing:'skipped',form:'received',portrait:'skipped',handoff:'received'});
});
test('client checklist RU/EN/ES and empathetic retry text never falsely confirm absent uploads',()=>{
 for(const locale of ['ru','en','es']){
  const c=freePackageCopy(locale);
  const status=freePackageStatusMessage({intakeSlots:{goal:'My goal',challenge:'An obstacle',situation:'Currently difficult'},mediaReceipts:{
   portrait:{status:'skipped'}}},locale);
  assert.ok(status.includes(c.received));
  assert.ok(status.includes(c.missing));
  assert.ok(status.includes(c.skipped));
  assert.ok(c.portraitRetry.length>25&&c.drawingRetry.length>25);
  assert.ok(c.formRetry.length>25&&c.formAccepted.length>25);
  assert.ok(c.portraitRetry!==c.portraitAccepted);
  assert.ok(c.drawingRetry!==c.drawingAccepted);
  assert.ok(c.pendingForm.includes('/form'));
  for(const kind of ['portrait','drawing']){
   const stage='free_'+kind;
   const expected=kind==='portrait'?'skipportrait':'skipdrawing';
   const btn=v3ButtonsFor(locale,stage);
   assert.equal(btn.length,1);
   assert.equal(btn[0][0],V3_LABELS[locale][expected]);
   assert.equal(v3Action({inlineAction:'v3:'+expected}),expected);
   const inline=telegramInlineButtonForText(btn[0][0],locale);
   assert.equal(inline?.callback_data,'hhv3:'+locale+':'+expected);
   const selection=telegramInlineCallbackSelection(inline.callback_data);
   assert.equal(selection?.inlineAction,'v3:'+expected);
   assert.equal(v3Action({inlineAction:selection.inlineAction}),expected);
   const legacy=telegramInlineButtonForText(
     TELEGRAM_DIAGNOSTIC_V2_BUTTON_LABELS[locale][kind==='portrait'?'skipPhoto':'skipDrawing'],locale);
   assert.equal(legacy?.callback_data,
     'hhv2:'+locale+':'+(kind==='portrait'?'skipPhoto':'skipDrawing'));
   assert.notEqual(legacy.callback_data,inline.callback_data);
  }
 }
});
test('encrypted context allowlists actual verified media, not arbitrary file or owner notices',()=>{
 const ctx=v3Context({mode:'free_diagnostic',turns:[],intakeStage:'ready',
   verifiedTelegramUserId:'123456789',
   mediaStep:'drawing',intakeSlots:{goal:'My goal'},
   mediaReceipts:{portrait:{status:'received',...photo},
     drawing:{status:'received',fileId:fakeFile,bytes:100,
       messageId:fakeMessage},unknown:{status:'received',...photo}},
   mediaPending:{updateId:123,step:'drawing',fileId:fakeFile,bytes:0,
     messageId:fakeMessage,at:123},
   ownerNotices:{goal:11,portrait_skipped:12,unknown:88},
   formReceipt:{status:'received',referenceCode:'HH-123456789ABC'}});
 assert.equal(ctx.mediaStep,'drawing');
 assert.equal(ctx.verifiedTelegramUserId,'123456789');
 assert.equal(ctx.mediaReceipts.portrait.status,'received');
 assert.equal(ctx.mediaReceipts.drawing.status,'received');
 assert.equal(ctx.mediaReceipts.unknown,undefined);
 assert.equal(ctx.ownerNotices.goal,11);
 assert.equal(ctx.ownerNotices.portrait_skipped,12);
 assert.equal(ctx.ownerNotices.unknown,undefined);
 assert.equal(ctx.formReceipt.status,'received');
 assert.equal(ctx.mediaPending.updateId,123);
 assert.equal(ctx.mediaPending.bytes,0,'unknown is allowed only while verification is pending');
 const forged=v3Context({mode:'free_diagnostic',turns:[],
  verifiedTelegramUserId:'not-verified',
  mediaStep:'upload_anywhere',mediaReceipts:{portrait:{
   status:'received',fileId:'../unsafe',bytes:900,messageId:'whatever'}},
  formReceipt:{status:'received',referenceCode:'fake'}});
 assert.equal(forged.mediaStep,undefined);
 assert.equal(forged.verifiedTelegramUserId,undefined);
 assert.equal(forged.mediaReceipts.portrait,undefined);
 assert.equal(forged.formReceipt,undefined);
});
test('RU EN clients can ask naturally what arrived without triggering a fake receipt',()=>{
 for(const phrase of ['Всё получено?','Что вы получили?','Статус заявки',
   'Did you receive everything?','Check status','package status?',
   'Вы получили моё фото?','Вы получили рисунок?',
   'Did you get my photo?','Did you receive my drawing?']){
   assert.equal(freePackageStatusIntent(phrase),true,phrase);
   assert.equal(freeFormReceiptIntent(phrase),false,phrase);
 }
 for(const phrase of ['Я отправил анкету','Я заполнила форму','Анкету отправил',
   'I submitted the form','Did you get my questionnaire?','Form sent']){
   assert.equal(freeFormReceiptIntent(phrase),true,phrase);
   assert.equal(freePackageStatusIntent(phrase),false,phrase);
 }
 assert.equal(freePackageStatusIntent('My goal is to receive a promotion'),false);
 assert.equal(freeFormReceiptIntent('I want to submit my resignation'),false);
});
test('same verified intake gets one stable anonymous case reference without exposing UUID',()=>{
 const id='947a8c21-8055-4b20-9f90-310404ad1321';
 const config={encryptionKey:Buffer.alloc(32,31)};
 const reference=freePackageCaseReference(id,config);
 assert.match(reference,/^FR-[A-F0-9]{10}$/);
 assert.equal(freePackageCaseReference(id,config),reference);
 assert.notEqual(freePackageCaseReference(id,{encryptionKey:Buffer.alloc(32,11)}),reference);
 assert.doesNotMatch(reference,/947a8c21/);
 assert.throws(()=>freePackageCaseReference('not-a-uuid',config),/FREE_CASE_REFERENCE_UNAVAILABLE/);
});
test('owner receipt notifications are neutral, case-correlatable and do not carry private content',()=>{
 for(const locale of ['ru','en','es']){
  for(const stage of ['goal','challenge','situation','impact','attempts','support',
   'answers','portrait','drawing','portrait_skipped','drawing_skipped','form_pending','form','complete']){
   const msg=freePackageOwnerNotice(stage,locale);
   assert.ok(msg.startsWith('Holistic House'),stage+locale);
   assert.ok(msg.includes('/app/messages?tab=chats'));
   assert.doesNotMatch(msg,/My goal|private symptom|file_id|apiKey/i);
  }
 }
 assert.equal(freePackageOwnerNotice('not-a-stage','en'),null);
});
