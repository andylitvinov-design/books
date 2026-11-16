/** Pure PM contracts: deterministic proposals, no network/model or paid provider. */
export const PM_SCHEMA='hh-project-management-v1';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const PR=/^https:\/\/github\.com\/andylitvinov-design\/books\/pull\/([1-9]\d{0,7})$/;
export const uuid=value=>typeof value==='string'&&UUID.test(value);
const clean=(value,max)=>typeof value==='string'?value.trim().replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,max):'';
export function sanitizeEpic(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||!uuid(input.projectId))return null;
 const title=clean(input.title,120),problem=clean(input.problem,700),outcome=clean(input.outcome,700);
 const priority=Number(input.priority);
 if(title.length<6||problem.length<12||outcome.length<12||!Number.isInteger(priority)||priority<1||priority>5)return null;
 return {projectId:input.projectId,title,problem,outcome,priority};
}
export function sanitizePRLink(value){
 const match=typeof value==='string'?PR.exec(value):null;
 return match?{url:value,number:Number(match[1]),repository:'andylitvinov-design/books'}:null;
}
function step(title,description,kind='code_change'){
 return {title:clean(title,140),description:clean(description,800),kind};
}
export function proposePlans(epic){
 if(!epic||!epic.title||!epic.outcome)throw Error('EPIC_REQUIRED');
 const goal=clean(epic.title,85);
 const result=clean(epic.outcome,140);
 return [
  {key:'quick',title:'Быстрый путь',approach:'Минимальные изменения существующего сценария без параллельного переписывания.',
   benefit:'Меньший объём и меньше затрагиваемых частей.',risk:'Может оставить некоторые ограничения прежней архитектуры.',
   steps:[step('Проверить текущий сценарий '+goal,'Провести аудит текущих функций, связанных PR и ограничений; зафиксировать воспроизводимую проблему.','product_spec'),
    step('Реализовать минимальное улучшение '+goal,'Внести ограниченное изменение в существующий код с проверяемым ожидаемым результатом: '+result),
    step('Проверить CI и результат в LIVE','Пройти обязательные проверки, защищённый merge и независимо подтвердить пользовательский сценарий.','release_verify')]},
  {key:'balanced',title:'Сбалансированный путь',approach:'Последовательная реализация с контрольными точками UX, кода и релиза.',
   benefit:'Чёткая декомпозиция и меньший риск регрессий.',risk:'Потребует больше проверок и этапов согласования.',
   steps:[step('Описать задачу и критерии результата','Уточнить текущий процесс, воспроизводимость, успешный сценарий и измеримый результат: '+result,'product_spec'),
    step('Согласовать мобильный UX '+goal,'Подготовить мобильный макет, тексты, пустые состояния и безопасные варианты взаимодействия.','product_spec'),
    step('Внести изменения в существующий модуль','Реализовать утверждённый функционал без создания второй системы или новых платных сервисов.'),
    step('Проверить функциональные регрессии','Проверить права доступа, ошибки API, критические старые функции и мобильную версию.','research'),
    step('Подтвердить выпуск на production','Пройти актуальные проверки PR, защищённый merge, deployment и независимый функциональный smoke.','release_verify')]},
  {key:'extended',title:'Расширенный путь',approach:'Доработка с дополнительной наблюдаемостью, зависимостями и качеством.',
   benefit:'Больше контроля, улучшенная поддержка и диагностика.',risk:'Самый большой объём: нужна отдельная оценка приоритета и ресурсов.',
   steps:[step('Исследовать текущее поведение и ограничения','Собрать измеряемые проблемы, текущие источники данных, ограничения доступа и стоимость.','research'),
    step('Определить архитектуру и зависимости','Определить масштаб, разделение компонентов, источник истины, критерии готовности и блокировки.','product_spec'),
    step('Согласовать макет и сценарии пользователя','Подтвердить мобильный вид, доступность, ошибки, пустые состояния и пути назад.','product_spec'),
    step('Реализовать функциональность '+goal,'Добавить проверенные возможности в существующие сервисы без дублирующих обработчиков.'),
    step('Добавить диагностику и историю событий','Добавить только безопасные подтверждённые показатели, не создавая новые cron или платные запросы.'),
    step('Проверить доступность и регрессии','Протестировать backend, авторизацию, мобильные размеры, существующие функции и критические запреты.','research'),
    step('Подтвердить Production LIVE и приёмку','Выполнить полный CI, защищённый merge, независимую проверку served SHA и пользовательского действия.','release_verify')]}
 ];
}
export function projectProgress(tasks){
 const rows=Array.isArray(tasks)?tasks:[];
 const verified=rows.filter(t=>t.state==='completed_live'||
   (t.state==='completed_verified'&&t.has_evidence===true)).length;
 const total=rows.length;
 return {verified,total,ratio:total?verified/total:null};
}
export function deliveryLabel(proof){
 if(!proof||proof.prState==='unknown')return {code:'UNKNOWN',label:'Не проверено'};
 if(proof.prState==='merged'){
  if(proof.functionalAccepted===true&&proof.codeOnProduction===true)return {code:'LIVE_VERIFIED',label:'LIVE подтверждён'};
  return proof.codeOnProduction?{code:'SERVED_UNVERIFIED',label:'Код на production · smoke ожидает'}:
   {code:'MERGED',label:'Merged · LIVE ожидает'};
 }
 if(proof.prState==='closed')return {code:'CLOSED_UNMERGED',label:'Закрыт без merge'};
 if(proof.ci==='failed')return {code:'CI_FAILED',label:'CI failed'};
 if(proof.ci==='pending')return {code:'CI_RUNNING',label:'CI проверяется'};
 if(proof.ci==='passed')return {code:'CI_GREEN',label:'CI green · Merge ожидает'};
 return {code:'PR_OPEN',label:'PR открыт'};
}