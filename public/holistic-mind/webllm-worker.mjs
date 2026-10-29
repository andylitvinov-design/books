/**
 * Optional local-first experimental generator. This module is NOT loaded until
 * the visitor explicitly opts in. NO credentials, profile, source measurements,
 * full chat history or raw personal user messages are ever posted to this worker.
 *
 * CDN module/weights must pass supply-chain, CSP, license and mobile QA before
 * NEXT_PUBLIC_HH_LOCAL_LLM_EXPERIMENTAL can be enabled in production.
 */
const MODEL = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
const RUNTIME = "https://esm.run/@mlc-ai/web-llm@0.2.86";
let engine = null;
let loading = false;
let active = null;
const send = (type, more={}) => self.postMessage({type,...more});
const clean = x => typeof x==="string" ? x.trim().slice(0,320) : "";
function safeLocale(locale) { return ["en","ru","es"].includes(locale)?locale:"en"; }

self.onmessage = async event => {
  const {type,requestId,locale,seed} = event.data || {};
  if(type==="cancel") {
    active=null;
    if(engine?.interruptGenerate) {
      try { await engine.interruptGenerate(); } catch { /* best-effort stop */ }
    }
    return;
  }
  if(type==="load") {
    if(engine || loading) return;
    loading=true;
    try {
      // Fixed code version, fixed model ID. No provider API/tokens are used.
      // Browser CSP and model URLs should be verified in the deployment pilot.
      const runtime=await import(RUNTIME);
      if(!runtime.prebuiltAppConfig?.model_list?.some(x=>x.model_id===MODEL)) {
        throw new Error("No compatible prebuilt model");
      }
      engine=await runtime.CreateMLCEngine(MODEL,{
        initProgressCallback: progress => send("progress",{
          progress: Math.min(100,Math.max(0,Math.round((progress.progress||0)*100))),
        }),
      });
      send("ready",{model:MODEL});
    } catch {
      engine=null;
      send("error",{message:"The local model could not load on this device."});
    } finally { loading=false; }
    return;
  }
  if(type!=="generate" || !engine || typeof requestId!=="number") return;
  const text=clean(seed);
  if(!text) return;
  // One abstract editorial sentence only. No actual client utterance or PII.
  active=requestId;
  const lng=safeLocale(locale);
  const instruction={
    ru:"Перефразируй сообщение виртуального помощника одним коротким естественным предложением на русском. Не добавляй советов, диагнозов, обещаний, названий, ссылок, цен, фактов или вопросов. Не притворяйся человеком. Только одна фраза.",
    en:"Rephrase the virtual guide's text in one short natural English sentence. Add no advice, diagnosis, promises, names, links, prices, facts or questions. Never imply you are a human. One sentence only.",
    es:"Reformula el texto de la guía virtual en una sola frase natural y breve en español. Sin consejos, diagnósticos, promesas, nombres, enlaces, precios, datos ni preguntas. No finjas ser humano.",
  }[lng];
  try {
    const chunks=await engine.chat.completions.create({
      messages:[{role:"system",content:instruction},{role:"user",content:text}],
      temperature:0.35,max_tokens:80,stream:true,
    });
    let output="";
    for await(const chunk of chunks) {
      if(active!==requestId) break;
      const part=chunk.choices?.[0]?.delta?.content;
      if(typeof part==="string") {
        output+=part;
        if(output.length>220) break;
        send("partial",{requestId,text:output.slice(0,220)});
      }
    }
    if(active===requestId) send("complete",{requestId,text:output.trim().slice(0,220)});
  } catch { send("error",{requestId,message:"Local generation failed. Deterministic guidance remains available."}); }
};
