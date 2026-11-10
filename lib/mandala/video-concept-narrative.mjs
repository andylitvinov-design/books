/**
 * Short, localized, deterministic prose for the existing video concept editor.
 * It describes proposed choices; it does not claim that footage was rendered.
 * @param {{locale?: string, topic?: string, mainMessage?: string, scenario?: string, motif?: string, emotionalProgram?: string[]}} [input]
 */
export function buildVideoConceptNarrative({
  locale="en",topic="",mainMessage="",scenario="",motif="",emotionalProgram=[]
}={}){
  const clean=(value,max=240)=>String(value??"").normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f<>]/gu," ").replace(/\s+/gu," ").trim().slice(0,max);
  const subject=clean(topic),idea=clean(mainMessage,260).replace(/[.!?。]+$/u,"");
  const story=clean(scenario),symbol=clean(motif);
  const phases=Array.isArray(emotionalProgram)?emotionalProgram.slice(0,4).map(x=>clean(x,100)):[];
  const arc=phases.length===4&&phases.every(Boolean);
  if(locale==="ru"){
    const lines=["Короткая визуальная история"+(subject?" на тему «"+subject+"»":"")+
      (idea?": "+idea+".":".")];
    if(story||symbol)lines.push((story?"Сюжет «"+story+"»":"Сюжет")+
      (symbol?" раскрывается через образ «"+symbol+"»":" раскрывается через смену образов")+".");
    if(arc)lines.push("Эмоциональный путь проходит от «"+phases[0]+"» через «"+
      phases[1]+"» и «"+phases[2]+"» к «"+phases[3]+"».");
    return lines.join(" ");
  }
  if(locale==="es"){
    const lines=["Una breve historia visual"+(subject?" sobre «"+subject+"»":"")+
      (idea?": "+idea+".":".")];
    if(story||symbol)lines.push((story?"El relato «"+story+"»":"El relato")+
      (symbol?" utiliza «"+symbol+"» como imagen recurrente":" avanza mediante imágenes cambiantes")+".");
    if(arc)lines.push("El recorrido emocional va de «"+phases[0]+"» a «"+
      phases[1]+"», pasa por «"+phases[2]+"» y termina con «"+phases[3]+"».");
    return lines.join(" ");
  }
  const lines=["A short visual story"+(subject?" about "+subject:"")+
    (idea?": "+idea+".":".")];
  if(story||symbol)lines.push((story?"The scenario “"+story+"”":"The scenario")+
    (symbol?" uses “"+symbol+"” as a recurring image":" unfolds through changing images")+".");
  if(arc)lines.push("The emotional journey moves from “"+phases[0]+"” through “"+
    phases[1]+"” and “"+phases[2]+"”, ending with “"+phases[3]+"”.");
  return lines.join(" ");
}
