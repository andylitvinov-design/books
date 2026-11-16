/**
 * Deterministic ranking of published educational offers.
 * The quiz answers stay in the browser; no server profile is created.
 */
const normalize = v => String(v ?? "").toLocaleLowerCase();
const matches = {
  stress:/стресс|stress|antiestr[eé]s|антистресс|опора|opora|calm|спокой|relax|relaj|устойчив|сон|sleep|balance|баланс/iu,
  relationships:/отнош|relationship|relaci[oó]n|love|amor|любов|семь|family|pareja|партн|близост/iu,
  energy:/энерг|energy|energ[ií]a|reiki|рейки|kundalini|кундалин|телес|vital|ресурс|тантра/iu,
  growth:/развит|обуч|практик|учеб|learn|study|course|curso|formaci[oó]n|growth|crecimiento|practitioner|традиц|tradition|temple|храм|осознан|архетип/iu
};
function rank(item, answers) {
  const haystack=[item.id,item.title,item.description,item.topic,item.direction].map(normalize).join(" ");
  const goal=answers.goal;
  let score=goal && matches[goal]?.test(haystack)?40:0;
  if(goal==="stress" && item.id==="study-opora") score+=35;
  if(goal==="energy" && item.direction==="reiki") score+=12;
  if(goal==="growth" && item.kind==="program") score+=10;
  if(goal==="relationships" && /психолог|psycholog|coaching|коуч|arquetip|архетип/i.test(haystack)) score+=8;
  if(answers.format==="guided" && item.kind==="program") score+=8;
  if(answers.format==="course" && item.kind==="course") score+=10;
  if(answers.format==="practice" && item.id==="study-opora") score+=11;
  if(answers.format==="personal" && item.kind==="program") score+=3;
  if(answers.time==="short" && item.id==="study-opora") score+=10;
  if(answers.time==="long" && item.kind==="program") score+=8;
  if(answers.level==="new" && item.cost==="free") score+=9;
  if(answers.level==="experienced" && item.kind==="program") score+=6;
  if(answers.level==="professional" && item.kind==="program") score+=10;
  if(answers.support==="self" && item.cost==="free") score+=5;
  if(answers.support==="teacher" && item.kind==="program") score+=8;
  return score;
}
export function rankPublishedStudyCourses(items,answers={},kind="courses"){
  if(!Array.isArray(items))return [];
  return items.filter(x=>x && x.id && x.href && x.cost!=="archive" && (kind==="programs"?x.kind==="program":["course","video"].includes(x.kind)))
    .map((item,index)=>({item,index,score:rank(item,answers)}))
    .sort((a,b)=>b.score-a.score || a.index-b.index)
    .map(x=>x.item);
}
export function studyGoalHasDirectMatch(items,goal){
  return Boolean(goal && Array.isArray(items) && items.some(item=>matches[goal]?.test([item?.title,item?.description,item?.id,item?.direction].map(normalize).join(" "))));
}
