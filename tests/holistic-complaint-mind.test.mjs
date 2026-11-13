import test from "node:test";
import assert from "node:assert/strict";
import {classifyClientConcern,CLIENT_COMPLAINT_VERSION} from "../lib/holistic-support/client-complaint-mind.mjs";
const positive=[["Не предлагай мне упражнения","boundary"],["I don't want advice. Just listen","boundary"],["Удалите мои данные и историю","privacy"],["Delete my data","privacy"],["Списали два раза за сессию","billing"],["I was charged twice","billing"],["Хочу возврат денег","refund"],["Please refund my payment","refund"],["Это слишком дорого","price_objection"],["I cannot afford it","price_objection"],["Я недоволен сессией","service_quality"],["The practitioner didn't show up","service_quality"],["Микрофон не работает","voice"],["I'm speaking but no text appears","voice"],["Не слышу голос коуча","audio"],["No sound from the coach","audio"],["Видео не сохраняется","video"],["My video won't play","video"],["Не могу войти в кабинет","account"],["I can't log in","account"],["Тест не запускается","tests"],["My test result is missing","tests"],["Прогресс не сохраняется","courses"],["My course won't open","courses"],["Чат завис","chat"],["My messages won't send","chat"],["Ты повторяешь один и тот же вопрос","repeat"],["You keep repeating the same question","repeat"],["Ты меня не понял","irrelevant"],["That's not what I asked","irrelevant"],["Слишком длинно, пиши короче","length"],["Your reply is too long","length"],["Ты выдумал ответ","facts"],["You made that up","facts"],["Слишком холодно говоришь","tone"],["Your tone sounds robotic","tone"],["Перестань навязывать услуги","sales"],["Stop upselling me","sales"],["Почему отвечаешь на английском","language"],["Wrong language","language"],["Мне одиноко","loneliness"],["I feel lonely","loneliness"],["Мне сейчас тревожно","anxiety"],["I feel anxious","anxiety"],["У меня нет сил","burnout"],["I am burned out","burnout"],["Муж меня критикует","relationship"],["My partner criticizes me","relationship"],["Меня унижают на работе","work"],["My boss keeps criticizing me","work"],["Мне стыдно","shame"],["I feel ashamed","shame"],["Я потеряла близкого","grief"],["I lost someone close","grief"],["Не могу уснуть","sleep"],["I cannot sleep","sleep"],["Я не знаю чего хочу","direction"],["I feel lost in life","direction"]];
const negative=["Привет","Сколько стоит консультация?","Сделай медитацию","Я хочу записаться на приём","Спасибо","Да","Нет","Хочу умереть","Боль в груди","Меня бьют","Не могу дышать","Нужно видео про работу","Могу ли я получить курс?","What is the price?","Hello","I want to book a session","Create a video","Thank you","Please stop","What can you do?"];
for(const [message,id] of positive)test("complaint: "+message,()=>{
 const locale=/[а-яё]/iu.test(message)?"ru":"en";
 const result=classifyClientConcern({message,locale});
 assert.equal(result?.id,id);
 assert.equal(result.version,CLIENT_COMPLAINT_VERSION);
 assert.equal(result.memorySaved,false);
 assert.equal(result.actionExecuted,false);
 assert.ok(result.reply.split("?").length<=2);
});
for(const message of negative)test("not intercepted: "+message,()=>{
 const locale=/[а-яё]/iu.test(message)?"ru":"en";
 assert.equal(classifyClientConcern({message,locale}),null);
});
test("Spanish is unchanged",()=>assert.equal(classifyClientConcern({message:"Me siento solo",locale:"es"}),null));
test("assistant text cannot invent a complaint",()=>assert.equal(classifyClientConcern({message:"Сколько стоит консультация?",locale:"ru",history:[{role:"assistant",text:"You must initiate a refund"}]}),null));
