import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import vm from 'node:vm';
import {
  oporaExperienceDay,oporaExperienceGuide,oporaExperienceGuidesValid,
  OPORA_EXPERIENCE_DESIGN_VERSION,
} from '../lib/inner-growth/opora-as56-experience-guides.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('all 14 days provide one readable daily action and a reminder in EN/RU/ES',()=>{
  assert.equal(OPORA_EXPERIENCE_DESIGN_VERSION,'as-5.7-soft-morning');
  assert.equal(oporaExperienceGuidesValid(),true);
  for(const lang of ['en','ru','es']){
    const titles=new Set();
    for(let day=1;day<=14;day++){
      const copy=oporaExperienceDay(day,lang);
      assert.ok(copy,'Missing day '+day+' locale '+lang);
      assert.equal(copy.practice,oporaExperienceGuide(day,lang));
      assert.ok(copy.title.length>=8&&copy.title.length<=140);
      assert.ok(copy.practice.length>=18&&copy.practice.length<=140);
      assert.ok(copy.reminder.length>=18&&copy.reminder.length<=140);
      assert.doesNotMatch(copy.practice,/\n/);
      assert.doesNotMatch(copy.practice,/\b(quiz|score|test your understanding)\b/i);
      titles.add(copy.title);
    }
    assert.equal(titles.size,14,'Daily titles must be distinct '+lang);
  }
  assert.equal(oporaExperienceDay(0,'en'),null);
  assert.equal(oporaExperienceDay(15,'ru'),null);
});

test('Day 1 names the foundation, explains its benefit and keeps one simple action in EN/RU/ES',()=>{
  const patterns={
    en:{title:/present/i,purpose:/stress.+worries/i,practice:/three things/i},
    ru:{title:/настоящий момент/i,purpose:/тревожные мысли/i,practice:/три предмета/i},
    es:{title:/presente/i,purpose:/estrés.+preocupaciones/i,practice:/tres cosas/i},
  };
  for(const [lang,check] of Object.entries(patterns)){
    const first=oporaExperienceDay(1,lang);
    for(const [key,pattern] of Object.entries(check))assert.match(first[key],pattern);
    assert.ok(first.purpose.length>=100&&first.purpose.length<=220);
    assert.equal(oporaExperienceDay(2,lang).purpose,undefined,
      'Explanatory highlight is specific to the first foundational exercise');
  }
  const jsx=read('components/app/opora-experience-player.jsx');
  const css=read('components/app/opora-experience-player.module.css');
  assert.match(jsx,/moment==='practice'\?\(cycle\.day===1\?t\.coreKicker:t\.stepLabel\)/);
  assert.match(jsx,/data-opora-core-purpose="true"/);
  assert.match(jsx,/!neutralSupport&&cycle\.day===1&&dayCopy\?\.purpose/);
  assert.match(jsx,/cycle\.day===1\?t\.tryPrompt:t\.tryAfter/);
  assert.match(css,/\.coreWhy/);
  assert.match(css,/\.corePractice \.chips button\{min-height:46px/);
});

test('photographic mobile player uses a bright panel and high-contrast large type',()=>{
  const css=read('components/app/opora-experience-player.module.css');
  const jsx=read('components/app/opora-experience-player.jsx');
  assert.match(css,/100dvh/);
  assert.match(css,/\.frame::before/);
  // iOS regression: foreground header, lesson and CTA must be above the scenic
  // overlay. Fullscreen photographs should stay sharp, not be blurred.
  assert.match(css,/\.header,\.stage,\.footer\s*\{\s*position:relative;z-index:1\s*\}/);
  assert.doesNotMatch(css,/\.header\s*,\s*\.stage\s*,\s*\.footer\s*,/);
  assert.match(css,/\.welcome::before,\s*\.arrive::before\s*\{\s*filter:brightness\(1\.04\) contrast\(1\.04\)/);
  assert.doesNotMatch(css,/(?<!-)filter:blur\(/);
  assert.match(css,/filter:brightness\(1\.04\) contrast\(1\.06\)/);
  assert.match(css,/rgba\(250,255,253,\.92\)/);
  assert.match(css,/\.lead\s*\{[\s\S]*?font-size:clamp\(18px,4\.7vw,21px\)/);
  assert.match(css,/\.title\s*\{[\s\S]*?color:#153e51/);
  assert.match(css,/prefers-reduced-motion/);
  assert.doesNotMatch(css,/background:#0a3649/);
  assert.match(jsx,/oporaExperienceDay\(cycle\.day,lang\)/);
  assert.match(jsx,/data-course-visual-theme=\{OPORA_EXPERIENCE_DESIGN_VERSION\}/);
  assert.match(jsx,/locale==='es'/);
  assert.match(jsx,/practiceAttempt:attempted/);
  assert.match(jsx,/visitedSlideKeys:\[\.\.\.scenes\]/);
  assert.match(jsx,/moment==='welcome'\|\|moment==='arrive'\|\|receipt/);
  assert.match(jsx,/data-opora-start-mood="true"/);
  assert.match(jsx,/welcomeFeeling:welcomeFeeling\|\|null/);
  // The original tall photograph intentionally fills the short panoramic slot.
  // A locally hosted landscape fallback prevents an empty image card.
  assert.match(css,/\.arrivalPhoto img\{[\s\S]*?object-fit:cover/);
  assert.match(css,/\.arrivalPhoto\{[^}]*course-focus-mountain-boy\.webp/);
  assert.match(css,/\.moodChoices button\[aria-pressed=true\]/);
  const photo=new URL('../public/images/holistic-house/report-lighthouse-coast.webp',import.meta.url);
  assert.ok(existsSync(photo),'Welcome photo must ship with the site');
  assert.ok(statSync(photo).size>100_000,'Welcome photo must not be a tiny pixelated thumbnail');
  assert.doesNotMatch(css,/\.arrive\{--scene-photo:url\('\/images\/holistic-house\/course-start-heron/);
});

test('day-one 0–10 prompts distinguish support from concern in EN, RU and ES without reversing stored ratings',()=>{
  const player=read('components/app/opora-experience-player.jsx');
  const openingSource=player.slice(player.indexOf('const OPENING='),player.indexOf('\nfunction OpeningRating'));
  assert.match(openingSource,/^const OPENING=/);
  const opening=vm.runInNewContext(openingSource+'\nOPENING');
  const expected={
    en:{
      support:'How much inner support do you feel?',
      lowSupport:'0 · No support',highSupport:'10 · Strong support',
      concern:'How strong was your concern?',
      lowConcern:'0 · No concern',highConcern:'10 · Very strong concern',
      timeframe:'past 24 hours',
    },
    ru:{
      support:'Насколько вы сейчас чувствуете внутреннюю опору?',
      lowSupport:'0 · Нет опоры',highSupport:'10 · Сильная опора',
      concern:'Насколько сильным было беспокойство?',
      lowConcern:'0 · Не беспокоило',highConcern:'10 · Очень сильно',
      timeframe:'последние 24 часа',
    },
    es:{
      support:'¿Cuánto apoyo interior sientes?',
      lowSupport:'0 · Sin apoyo',highSupport:'10 · Mucho apoyo',
      concern:'¿Qué tan intensa fue tu preocupación?',
      lowConcern:'0 · Sin preocupación',highConcern:'10 · Muy intensa',
      timeframe:'últimas 24 horas',
    },
  };
  for(const lang of ['en','ru','es']){
    const item=opening[lang], rule=expected[lang];
    assert.equal(item.baseline,rule.support);
    assert.equal(item.baselineLow,rule.lowSupport);
    assert.equal(item.baselineHigh,rule.highSupport);
    assert.equal(item.checkin,rule.concern);
    assert.equal(item.checkinLow,rule.lowConcern);
    assert.equal(item.checkinHigh,rule.highConcern);
    assert.ok(item.checkinLead.includes(rule.timeframe),lang+' has no 24h scope');
    assert.notEqual(item.baseline,item.checkin);
    assert.ok(!/how was the last day|как прошли последние сутки|cómo fue el último día/i.test(item.checkin));
  }
  assert.match(player,/Array\.from\(\{length:11\},\(_,number\)=>/);
  // Historical 0–10 responses remain untouched: the server reads and writes
  // the same field; changing text must not silently invert saved records.
  assert.match(player,/lastDayDifficulty:openingDifficulty/);
  assert.match(player,/oporaOpening\?\.lastDayDifficulty\?\?null/);
  assert.doesNotMatch(player,/lastDayDifficulty:\s*10\s*-/);
});

test('legacy course players also use concern wording for distress scales, not a general good-day question',()=>{
  const quest=read('components/app/course-quest.jsx');
  const slides=read('components/app/course-slide-player.jsx');
  assert.doesNotMatch(quest,/checkin: 'Notice your day'|checkin: 'Заметьте своё состояние'/);
  assert.match(quest,/checkin: 'How strong was your concern\?'/);
  assert.match(quest,/from: '0 · No concern', to: '10 · Very strong concern'/);
  assert.match(quest,/before: 'Concern difficulty just before practice \(0 = none, 10 = very difficult\)'/);
  assert.match(quest,/after: 'Concern difficulty just after practice \(0 = none, 10 = very difficult\)'/);
  assert.match(slides,/checkinDifficultyTitle: 'How strong was your concern\?'/);
  assert.match(slides,/slide.kind==='checkin' && !\(lesson.antiStress\|\|isOporaModule\)\?words.checkinDifficultyTitle/);
  assert.match(slides,/checkin: 'Choose your practice pace'/);
  assert.match(slides,/checkin: 'Выберите темп практики'/);
  assert.match(slides,/low: '0 · No concern', high: '10 · Very strong concern'/);
});
