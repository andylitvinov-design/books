import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {buildTaskBrief}=require('../commander-task-input.js');

test('noisy owner voice request about unfinished PR classification preserves real goal',()=>{
 const raw='Надо провести анализ всех пиар которые сохранились не разобраны и классифицировать их по категориям Произнести по категориям я уже стал твою задачу нужно найти PR с этой задачей доделать';
 const prompt=buildTaskBrief(raw);
 assert.ok(prompt.includes(raw));
 for(const required of ['Основное поручение: Классифицировать неразобранные PR',
  'найти и доделать ранее начатую реализацию','Найти ранее поставленную задачу и PR',
  'открытых и Draft PR','постраничной загрузкой','Категория → Задача → PR',
  'Доработать найденный исходный PR','неразобранные','не подставлять номера по догадке']){
  assert.ok(prompt.toLowerCase().includes(required.toLowerCase()),required);
 }
 assert.doesNotMatch(prompt,/Преобразовать свободное описание в проверяемые подзадачи/);
 assert.doesNotMatch(prompt,/#\d{4}/);
});
test('explicit task authoring still generates editable task breakdown, not a regression',()=>{
 const prompt=buildTaskBrief('Добавь диктовку и разбор задачи в Agent Commander на iPhone');
 assert.match(prompt,/Добавить кнопку микрофона/);
 assert.match(prompt,/Преобразовать свободное описание в проверяемые подзадачи/);
 assert.match(prompt,/На поддерживаемом устройстве/i);
 for(const part of ['1. ЧТО НАДО ВЫПОЛНИТЬ','2. КАКОЙ РЕЗУЛЬТАТ СЧИТАЕТСЯ ХОРОШИМ',
 '3. ОРИЕНТИРЫ КАЧЕСТВА','4. КОНТЕКСТ БИЗНЕСА И ПРОЕКТА'])assert.ok(prompt.includes(part));
});
test('continuation does not invent PR IDs and produces actionable completion plan',()=>{
 const raw='Я уже ставил задачу про нижнее меню, найди PR и доделай';
 const prompt=buildTaskBrief(raw);
 assert.match(prompt,/Найти ранее начатую задачу/);
 assert.match(prompt,/Доделать обнаруженную реализацию/);
 assert.match(prompt,/не подставлять номера по догадке/);
 assert.doesNotMatch(prompt,/#\d{4}/);
});
test('video from audio gets its own concept and scene chain, not generic decomposition',()=>{
 const prompt=buildTaskBrief('Создай видеоряд на основе аудио с расшифровкой и подбором сцен');
 assert.match(prompt,/защищённую расшифровку аудио/);
 assert.match(prompt,/ключевые фразы/);
 assert.match(prompt,/редактируемый видеоконцепт/);
 assert.doesNotMatch(prompt,/Преобразовать свободное описание/);
});
test('general task preserves owner goal and has a concrete fallback',()=>{
 const raw='Улучшить каталог услуг и тесты для клиентов';
 const prompt=buildTaskBrief(raw);
 assert.match(prompt,/Выполнить главное поручение владельца/);
 assert.ok(prompt.includes(raw));
 assert.match(prompt,/Notion AI/);
 assert.ok(prompt.length<=8500);
 assert.equal(buildTaskBrief('коротко'),'');
});

test('Cyrillic piar from speech is routed to PR Monitor business context',()=>{
 const prompt=buildTaskBrief('Классифицировать все пиары по категориям');
 assert.match(prompt,/Проект: отдельный Agent Commander/);
 assert.match(prompt,/Категория → Задача → PR/);
 assert.doesNotMatch(prompt,/Преобразовать свободное описание/);
});
