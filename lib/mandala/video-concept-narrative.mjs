/**
 * Short, localized, deterministic prose for the existing video concept editor.
 * It describes proposed choices; it does not claim that footage was rendered.
 * @param {{locale?: string, topic?: string, mainMessage?: string, scenario?: string, motif?: string, emotionalProgram?: string[], currentState?: string|string[]|null, desiredState?: string|string[]|null, focus?:string|null, pace?: string|string[]|null, energyStart?:number|null, energyTarget?:number|null, durationSeconds?:number}} [input]
 */
export function buildVideoConceptNarrative({
  locale="en",topic="",mainMessage="",scenario="",motif="",emotionalProgram=[],
  currentState=null,desiredState=null,focus=null,pace=null,energyStart=null,energyTarget=null,durationSeconds=30
}={}){
  const clean=(value,max=240)=>String(value??"").normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f<>]/gu," ").replace(/\s+/gu," ").trim().slice(0,max);
  const subject=clean(topic),idea=clean(mainMessage,260).replace(/[.!?。]+$/u,"");
  const story=clean(scenario),symbol=clean(motif);
  const dynamic=pace==="dynamic";
  const income=dynamic&&/(?:income growth|рост доход|crecimiento de ingresos|aumentar ingresos)/iu.test(subject);
  const seconds=Number.isFinite(durationSeconds)?Math.round(durationSeconds):30;
  const current=clean(currentState,110),desired=clean(desiredState,110);
  const from=current?current+(Number.isFinite(energyStart)?" ("+energyStart+"/10)":""):"";
  const to=desired?desired+(Number.isFinite(energyTarget)?" ("+energyTarget+"/10)":""):"";
  if(income){
    if(locale==="ru")return "Динамичный "+seconds+"-секундный фильм о росте дохода: "+
      (idea||"новые возможности и уверенные действия")+". "+
      (from?"От «"+from+"» ":"От текущей ситуации ")+
      "через новые идеи, сотрудничество и конкретные шаги к "+
      (to?"«"+to+"»":"уверенности и развитию")+
      ". План — шесть разных пятитисекундных реальных видеокадров, без обещаний финансового результата.";
    if(locale==="es")return "Un vídeo dinámico de "+seconds+" segundos sobre crecimiento de ingresos: "+
      (idea||"nuevas oportunidades y acción")+". "+
      (from?"Desde «"+from+"» ":"Desde el inicio ")+
      "hacia nuevas ideas, colaboración y decisiones concretas, hasta "+
      (to?"«"+to+"»":"más confianza")+
      ". Se proponen seis escenas reales de cinco segundos, sin prometer resultados financieros.";
    return "An uplifting "+seconds+"-second film about income growth: "+
      (idea||"new opportunities and confident action")+". "+
      (from?"From "+from+" ":"From the starting point ")+
      "through fresh ideas, collaboration and practical steps toward "+
      (to?to:"more confidence and growth")+
      ". Six distinct five-second real-footage shots are planned, without promising financial results.";
  }
  // Confirmed filters build a concrete visual proposal instead of generic support copy.
  if(current&&desired){
    const values=clean(focus,150);
    const arc=Number.isFinite(energyStart)&&Number.isFinite(energyTarget)?
      energyStart+"/10 → "+energyTarget+"/10":null;
    if(locale==="ru")return [
      idea+".",
      "За "+seconds+" секунд реальные крупные планы показывают «"+current+"» и напряжённый ритм повседневности.",
      "Пауза, уважительный контакт и самостоятельный шаг предлагают движение к «"+desired+"».",
      (arc?"Желаемая динамика энергии — "+arc+".":"")+
       (values?" В фокусе — "+values+".":"")+
       " Шесть различных реальных кадров пока только запланированы."
    ].filter(Boolean).join(" ");
    if(locale==="es")return [
      idea+".",
      "En "+seconds+" segundos, tomas reales muestran «"+current+"» y un ritmo cotidiano exigente.",
      "Una pausa, un contacto respetuoso y un paso elegido abren camino hacia «"+desired+"».",
      (arc?"La energía deseada sigue "+arc+".":"")+
       (values?" El foco es "+values+".":"")+
       " Se proponen seis tomas reales distintas, aún sin verificar."
    ].filter(Boolean).join(" ");
    return [
      idea+".",
      "Over "+seconds+" seconds, real-life close-ups show “"+current+"” and a busy everyday rhythm.",
      "A pause, respectful contact and a self-chosen step open toward “"+desired+"”.",
      (arc?"The intended energy arc is "+arc+".":"")+
       (values?" The focus is "+values+".":"")+
       " Six distinct real-footage shots are proposed, not yet verified."
    ].filter(Boolean).join(" ");
  }
  const phases=Array.isArray(emotionalProgram)?emotionalProgram.slice(0,4).map(x=>clean(x,100)):[];
  const arc=phases.length===4&&phases.every(Boolean);
  if(locale==="ru"){
    const lines=[(dynamic?"Энергичная короткая визуальная история":"Короткая визуальная история")+(subject?" на тему «"+subject+"»":"")+
      (idea?": "+idea+".":".")];
    if(story||symbol)lines.push((story?"Сюжет «"+story+"»":"Сюжет")+
      (symbol?" раскрывается через образ «"+symbol+"»":" раскрывается через смену образов")+".");
    if(arc)lines.push("Эмоциональный путь проходит от «"+phases[0]+"» через «"+
      phases[1]+"» и «"+phases[2]+"» к «"+phases[3]+"».");
    return lines.join(" ");
  }
  if(locale==="es"){
    const lines=[(dynamic?"Una breve historia visual dinámica":"Una breve historia visual")+(subject?" sobre «"+subject+"»":"")+
      (idea?": "+idea+".":".")];
    if(story||symbol)lines.push((story?"El relato «"+story+"»":"El relato")+
      (symbol?" utiliza «"+symbol+"» como imagen recurrente":" avanza mediante imágenes cambiantes")+".");
    if(arc)lines.push("El recorrido emocional va de «"+phases[0]+"» a «"+
      phases[1]+"», pasa por «"+phases[2]+"» y termina con «"+phases[3]+"».");
    return lines.join(" ");
  }
  const lines=[(dynamic?"An energetic short visual story":"A short visual story")+(subject?" about "+subject:"")+
    (idea?": "+idea+".":".")];
  if(story||symbol)lines.push((story?"The scenario “"+story+"”":"The scenario")+
    (symbol?" uses “"+symbol+"” as a recurring image":" unfolds through changing images")+".");
  if(arc)lines.push("The emotional journey moves from “"+phases[0]+"” through “"+
    phases[1]+"” and “"+phases[2]+"”, ending with “"+phases[3]+"”.");
  return lines.join(" ");
}
