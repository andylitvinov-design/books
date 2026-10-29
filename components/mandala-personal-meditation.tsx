"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Clipboard, Download, FileText, Headphones, Leaf, RotateCcw, Sparkles, Square } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import type { VideoTheme } from "@/lib/mandala/holistic-video-themes";
import type { GuidedMeditationFocus } from "./mandala-guided-course";
import { buildPersonalMeditationScript } from "@/lib/mandala/personal-meditation-script.mjs";
import { findLocalMeditationVoices, meditationNarrationEstimate, playMeditationNarration } from "@/lib/mandala/meditation-narration.mjs";
import css from "./mandala-personal-meditation.module.css";

const accents = ["calm","confidence","clarity","boundaries","acceptance","motivation","rest","gratitude"] as const;
type Accent = (typeof accents)[number];
type ImageKey = "video"|"garden"|"water"|"light"|"home"|"forest"|"coast"|"mountain";
type ToneKey = "gentle"|"grounded"|"uplifting";
type LengthKey = 3|5|8|12;
type Technique = "imagery"|"grounding"|"body-awareness"|"self-kindness"|"mindful-noticing"|"future-step";
type Attention = "mixed"|"visual"|"sound"|"body"|"external";
type Depth = "light"|"reflective";
type Ending = "return"|"reflection"|"small-step";
type Props = {
  locale:PublicLocale;theme:VideoTheme;wish:string;scene:string;sound:string;caption:string;
  audioSrc?:string|null;
  pace:"slow"|"dynamic";brightness:"soft"|"bright";
  affirmations:string[];affirmationsEnabled:boolean;
  focus:GuidedMeditationFocus;disabled:boolean;
};
const copy = {
  en:{
    title:"Personal meditation",eyebrow:"FINAL STEP · YOUR SCRIPT",
    intro:"A personal script from this editor's theme, your own request, chosen goals, imagery, sound and affirmations. No paid AI or upload.",
    filters:"Taken into account",theme:"Theme",scene:"Scene",sound:"Sound",phrases:"Affirmations",quiet:"Quiet",
    customize:"Additional meditation accents",selected:"Select up to 3 (optional)",extra:"One more personal emphasis · optional",
    placeholder:"For example: more inner steadiness before an important conversation",
    image:"Imagery",images:{video:"Current video scene",garden:"Garden",water:"Water",light:"Soft light",home:"Safe room",forest:"Forest",coast:"Coast",mountain:"Mountains"},
    method:"Practice method",methods:{imagery:"Guided imagery",grounding:"Grounding", "body-awareness":"Gentle body awareness", "self-kindness":"Self-kindness", "mindful-noticing":"Mindful noticing", "future-step":"Rehearse a small step"},
    attention:"Focus of attention",attentions:{mixed:"A little of everything",visual:"Visual images",sound:"Sounds",body:"Physical support",external:"Eyes-open surroundings"},
    depth:"Depth",depths:{light:"Light and simple",reflective:"Gentle reflection"},
    ending:"Finishing",endings:{return:"Return to the room",reflection:"A reflection prompt","small-step":"One practical next step"},
    voiceTitle:"Listen to your meditation",voiceDescription:"An installed, on-device voice reads the actual generated text with real pauses. No speech file is created.",
    listen:"Play with local voice",stopListening:"Stop narration",noVoice:"No installed local voice for this language. You can still edit and save your text.",
    voice:"Device voice",rate:"Reading speed",withMusic:"Play selected background sound quietly",audioFailure:"Background audio was not available; spoken narration can continue.",voiceEstimate:"Estimated listening",voicePart:"Part",voicePause:"Quiet pause",voiceReading:"Narration",voiceNote:"Playback requires an installed local device voice. This is a live preview, not an MP3 or a pre-rendered audio file.",voiceError:"Could not start local narration. Try another installed voice or browser.",
    tone:"Narration tone",tones:{gentle:"Very gentle",grounded:"Grounded",uplifting:"Encouraging"},
    length:"Approximate pace",minutes:"min",
    accents:{calm:"Calm",confidence:"Confidence",clarity:"Clarity",boundaries:"Boundaries",acceptance:"Acceptance",motivation:"Small steps",rest:"Rest",gratitude:"Gratitude"},
    generate:"Create personal meditation",regenerate:"Update meditation text",creating:"Script created. You can edit it below.",
    edited:"Editable script",editHint:"Edit freely before copying or saving. No text is stored online.",
    copy:"Copy text",copied:"Copied",copyError:"Copy is unavailable here; select the text and copy manually.",
    download:"Save .txt",changed:"Settings have changed. Update the text to apply them.",
    safety:"A resource-oriented reflective script, not a diagnosis or substitute for treatment. Pause or stop whenever needed. For a clinical plan, ask a qualified practitioner.",
    privacy:"Private and free: text is composed on this device, without AI calls, CRM or persistent storage."
  },
  ru:{
    title:"Персональная медитация",eyebrow:"ПОСЛЕДНИЙ ШАГ · ВАШ ТЕКСТ",
    intro:"Сценарий по запросу клиента, теме, выбранным целям, видеосюжету, звуку и аффирмациям. Бесплатно, без отправки данных в ИИ.",
    filters:"Учитываем",theme:"Тема",scene:"Сюжет",sound:"Звук",phrases:"Аффирмации",quiet:"Без звука",
    customize:"Дополнительные акценты медитации",selected:"Выберите до 3 (необязательно)",extra:"Ещё один личный акцент · необязательно",
    placeholder:"Например: больше внутренней опоры перед важным разговором",
    image:"Образ",images:{video:"Сюжет текущего видео",garden:"Сад",water:"Вода",light:"Мягкий свет",home:"Уютная комната",forest:"Лес",coast:"Морской берег",mountain:"Горы"},
    method:"Метод медитации",methods:{imagery:"Образная практика",grounding:"Заземление","body-awareness":"Бережно к телу","self-kindness":"Самоподдержка","mindful-noticing":"Наблюдение","future-step":"Репетиция шага"},
    attention:"Куда направить внимание",attentions:{mixed:"Разные ощущения",visual:"Зрительные образы",sound:"Звуки",body:"Телесная опора",external:"Внешний мир · глаза открыты"},
    depth:"Глубина",depths:{light:"Легко и просто",reflective:"Мягкая рефлексия"},
    ending:"Завершение",endings:{return:"Вернуться в комнату",reflection:"Вопрос для размышления","small-step":"Один практический шаг"},
    voiceTitle:"Прослушать медитацию",voiceDescription:"Установленный локальный голос устройства читает сформированный текст с настоящими паузами. Аудиофайл при этом не создаётся.",
    listen:"Прослушать голосом устройства",stopListening:"Остановить озвучку",noVoice:"Для этого языка нет установленного локального голоса. Текст можно редактировать и сохранить.",
    voice:"Голос устройства",rate:"Скорость чтения",withMusic:"Тихо воспроизвести выбранный звуковой фон",audioFailure:"Фоновый звук недоступен; озвучка может продолжаться.",voiceEstimate:"Примерно прослушивание",voicePart:"Этап",voicePause:"Пауза",voiceReading:"Озвучка",voiceNote:"Нужен локальный голос, установленный на устройстве. Это реальное прослушивание, но не готовый MP3 или записанная дорожка.",voiceError:"Не удалось запустить озвучку. Попробуйте другой установленный голос или браузер.",
    tone:"Тон текста",tones:{gentle:"Очень мягкий",grounded:"Заземляющий",uplifting:"Вдохновляющий"},
    length:"Примерный ритм",minutes:"мин",
    accents:{calm:"Спокойствие",confidence:"Уверенность",clarity:"Ясность",boundaries:"Границы",acceptance:"Принятие",motivation:"Маленькие шаги",rest:"Отдых",gratitude:"Благодарность"},
    generate:"Сформировать персональную медитацию",regenerate:"Обновить текст медитации",creating:"Текст готов. Его можно отредактировать ниже.",
    edited:"Текст персональной медитации",editHint:"Редактируйте свободно, затем скопируйте или сохраните. На сервер текст не записывается.",
    copy:"Скопировать",copied:"Скопировано",copyError:"Не удалось скопировать автоматически. Выделите текст вручную.",
    download:"Скачать .txt",changed:"Вы изменили фильтры. Нажмите «Обновить текст», чтобы их учесть.",
    safety:"Бережный образный текст для рефлексии, не диагноз и не замена лечению. Можно остановиться в любой момент. Клиническую программу проверяет специалист.",
    privacy:"Приватно и бесплатно: текст создаётся здесь, без внешнего ИИ, CRM и сохранения в браузере."
  },
  es:{
    title:"Meditación personal",eyebrow:"ÚLTIMO PASO · TU GUION",
    intro:"Guion a partir de tu petición, metas elegidas, escena, sonido y afirmaciones. Gratis y sin enviar datos a IA externa.",
    filters:"Se tiene en cuenta",theme:"Tema",scene:"Escena",sound:"Sonido",phrases:"Afirmaciones",quiet:"Silencio",
    customize:"Acentos adicionales",selected:"Elige hasta 3 (opcional)",extra:"Otro matiz personal · opcional",
    placeholder:"Por ejemplo: más tranquilidad antes de una conversación importante",
    image:"Imagen",images:{video:"Escena actual",garden:"Jardín",water:"Agua",light:"Luz suave",home:"Habitación acogedora",forest:"Bosque",coast:"Costa",mountain:"Montañas"},
    method:"Método",methods:{imagery:"Imágenes guiadas",grounding:"Arraigo","body-awareness":"Conciencia corporal suave","self-kindness":"Autocompasión","mindful-noticing":"Observación consciente","future-step":"Ensayar un pequeño paso"},
    attention:"Canal de atención",attentions:{mixed:"Varios sentidos",visual:"Imágenes",sound:"Sonidos",body:"Apoyo físico",external:"Entorno con ojos abiertos"},
    depth:"Profundidad",depths:{light:"Ligera",reflective:"Reflexión suave"},
    ending:"Final",endings:{return:"Volver a la habitación",reflection:"Pregunta de reflexión","small-step":"Un paso práctico"},
    voiceTitle:"Escuchar la meditación",voiceDescription:"Una voz local instalada en el dispositivo lee el texto creado con pausas reales. No se genera un archivo de audio.",
    listen:"Escuchar con voz local",stopListening:"Detener la voz",noVoice:"No hay voz local instalada para este idioma. Puedes editar y guardar el texto.",
    voice:"Voz del dispositivo",rate:"Velocidad de lectura",withMusic:"Reproducir el sonido seleccionado de fondo",audioFailure:"El sonido de fondo no está disponible; la voz puede continuar.",voiceEstimate:"Duración aproximada",voicePart:"Parte",voicePause:"Pausa",voiceReading:"Voz",voiceNote:"Necesitas una voz local instalada. Es una reproducción real, no un MP3 ni un archivo de audio renderizado.",voiceError:"No se pudo iniciar la voz local. Prueba otra voz instalada o navegador.",
    tone:"Tono de narración",tones:{gentle:"Muy suave",grounded:"Con los pies en la tierra",uplifting:"Inspirador"},
    length:"Ritmo aproximado",minutes:"min",
    accents:{calm:"Calma",confidence:"Confianza",clarity:"Claridad",boundaries:"Límites",acceptance:"Aceptación",motivation:"Pasos pequeños",rest:"Descanso",gratitude:"Gratitud"},
    generate:"Crear meditación personal",regenerate:"Actualizar el guion",creating:"Guion creado. Puedes editarlo abajo.",
    edited:"Texto editable",editHint:"Edita el guion antes de copiarlo o guardarlo. No se almacena en línea.",
    copy:"Copiar texto",copied:"Copiado",copyError:"No se puede copiar automáticamente. Selecciona el texto y cópialo.",
    download:"Guardar .txt",changed:"Has cambiado los filtros. Actualiza el texto para aplicarlos.",
    safety:"Un guion reflexivo, no diagnóstico ni sustituto de tratamiento. Puedes detenerlo cuando quieras. Un profesional debe revisar un plan clínico.",
    privacy:"Privado y gratuito: el texto se redacta en este dispositivo, sin IA externa, CRM ni almacenamiento."
  }
} as const;
const themeLabels = {
  en:{money:"Money",energy:"Energy",relationships:"Relationships",goals:"Goals",life:"Meaning",health:"Wellbeing"},
  ru:{money:"Деньги",energy:"Энергия",relationships:"Отношения",goals:"Цели",life:"Смыслы",health:"Самочувствие"},
  es:{money:"Dinero",energy:"Energía",relationships:"Relaciones",goals:"Metas",life:"Sentido",health:"Bienestar"}
} as const;

export function MandalaPersonalMeditation({
  locale,theme,wish,scene,sound,caption,audioSrc,pace,brightness,affirmations,affirmationsEnabled,focus,disabled
}:Props) {
  const t=copy[locale];
  const [selected,setSelected]=useState<Accent[]>([]);
  const [image,setImage]=useState<ImageKey>("video");
  const [tone,setTone]=useState<ToneKey>("gentle");
  const [length,setLength]=useState<LengthKey>(5);
  const [technique,setTechnique]=useState<Technique>("imagery");
  const [attention,setAttention]=useState<Attention>("mixed");
  const [depth,setDepth]=useState<Depth>("light");
  const [ending,setEnding]=useState<Ending>("return");
  const [rate,setRate]=useState(0.9);
  const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]);
  const [voiceName,setVoiceName]=useState("");
  const [listening,setListening]=useState(false);
  const [progress,setProgress]=useState({index:0,total:0,kind:"speech"});
  const [withMusic,setWithMusic]=useState(false);
  const narratorRef=useRef<{stop:(reason?:string)=>void}|null>(null);
  const ambientRef=useRef<HTMLAudioElement>(null);
  const [extra,setExtra]=useState("");
  const [script,setScript]=useState("");
  const [generatedFor,setGeneratedFor]=useState("");
  const [notice,setNotice]=useState("");
  const signature=JSON.stringify([locale,theme,wish,scene,sound,caption,pace,brightness,affirmationsEnabled,affirmations,
    focus.difficulty,focus.goal,focus.goals,focus.details,selected,image,tone,length,extra,technique,attention,depth,ending]);
  const stale=Boolean(script&&generatedFor!==signature);
  const chosenVoice=voices.find(item=>item.name===voiceName)||voices[0];
  const estimatedSeconds=script?meditationNarrationEstimate(script,rate):0;
  useEffect(()=>{
    if(typeof window==="undefined"||!("speechSynthesis" in window))return;
    const synth=window.speechSynthesis;
    const refresh=()=>setVoices(findLocalMeditationVoices(synth.getVoices(),locale));
    refresh();
    synth.addEventListener?.("voiceschanged",refresh);
    return ()=>synth.removeEventListener?.("voiceschanged",refresh);
  },[locale]);
  useEffect(()=>()=>{
    narratorRef.current?.stop();
    ambientRef.current?.pause();
  },[]);
  useEffect(()=>{
    const onHidden=()=>{
      if(document.hidden){
        narratorRef.current?.stop();
        narratorRef.current=null;
        ambientRef.current?.pause();
        setListening(false);
      }
    };
    document.addEventListener("visibilitychange",onHidden);
    return ()=>document.removeEventListener("visibilitychange",onHidden);
  },[]);
  function stopNarration(){
    narratorRef.current?.stop();
    narratorRef.current=null;
    ambientRef.current?.pause();
    setListening(false);
    setProgress({index:0,total:0,kind:"speech"});
  }
  function toggleNarration(){
    if(listening){stopNarration();return;}
    if(typeof window==="undefined"||!("speechSynthesis" in window)||
      typeof SpeechSynthesisUtterance==="undefined"){
      setNotice(t.noVoice);return;
    }
    const local=findLocalMeditationVoices(window.speechSynthesis.getVoices(),locale);
    setVoices(local);
    const voice=local.find(item=>item.name===voiceName)||local[0];
    if(!voice){setNotice(t.noVoice);return;}
    if(withMusic&&audioSrc&&ambientRef.current){
      const player=ambientRef.current;
      player.volume=0.2;
      player.currentTime=0;
      void player.play().catch(()=>{
        setNotice(t.audioFailure);
      });
    }
    try{
      const active=playMeditationNarration({
        script,locale,rate,voice,synthesis:window.speechSynthesis,Utterance:SpeechSynthesisUtterance,
        onProgress:(index,total,kind)=>setProgress({index,total,kind}),
        onStop:reason=>{
          ambientRef.current?.pause();
          narratorRef.current=null;
          setListening(false);
          setProgress({index:0,total:0,kind:"speech"});
          if(reason==="error")setNotice(t.voiceError);
        }
      });
      narratorRef.current=active.active?active:null;
      setListening(active.active);
      if(active.active)setNotice("");
    }catch{
      ambientRef.current?.pause();
      setNotice(t.noVoice);
      setListening(false);
    }
  }
  const toggle=(accent:Accent)=>setSelected(current=>current.includes(accent)
    ? current.filter(item=>item!==accent)
    : current.length<3?[...current,accent]:current);
  const generate=()=>{
    if(disabled)return;
    stopNarration();
    const next=buildPersonalMeditationScript({
      locale,theme,wish,scene,sound,caption,pace,brightness,affirmationsEnabled,affirmations,
      focus,accents:selected,image,tone,length,extra,technique,attention,depth,ending
    });
    setScript(next);setGeneratedFor(signature);setNotice(t.creating);
  };
  async function copyScript(){
    if(!script)return;
    try{
      await navigator.clipboard.writeText(script);
      setNotice(t.copied);
    }catch{setNotice(t.copyError);}
  }
  const download=()=>{
    if(!script)return;
    const url=URL.createObjectURL(new Blob([script+"\n"],{type:"text/plain;charset=utf-8"}));
    const link=document.createElement("a");
    link.href=url;link.download="holistic-house-personal-meditation-"+locale+".txt";
    document.body.appendChild(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),3000);
  };
  return (
    <section className={css.panel} id="personal-meditation" data-video-personal-meditation
      aria-labelledby="personal-meditation-heading">
      <header className={css.heading}>
        <span className={css.icon}><Leaf size={20} aria-hidden="true"/></span>
        <div><small>{t.eyebrow}</small><h3 id="personal-meditation-heading">{t.title}</h3></div>
      </header>
      <p className={css.intro}>{t.intro}</p>
      <div className={css.context} data-meditation-context aria-label={t.filters}>
        <small>{t.filters}</small>
        <div className={css.chips}>
          <span>{t.theme}: {themeLabels[locale][theme]}</span>
          <span>{t.scene}: {scene}</span>
          <span>{t.sound}: {sound||t.quiet}</span>
          <span>{t.phrases}: {affirmationsEnabled?affirmations.length:0}</span>
        </div>
      </div>
      <div className={css.quickGrid} data-meditation-main-filters>
        <label>{t.method}
          <select data-meditation-method value={technique} disabled={disabled}
            onChange={event=>setTechnique(event.target.value as Technique)}>
            {(Object.keys(t.methods) as Technique[]).map(id=>
              <option value={id} key={id}>{t.methods[id]}</option>)}
          </select>
        </label>
        <label>{t.length}
          <select data-meditation-length value={length} disabled={disabled}
            onChange={event=>setLength(Number(event.target.value) as LengthKey)}>
            {([3,5,8,12] as const).map(value=><option value={value} key={value}>
              {value} {t.minutes}
            </option>)}
          </select>
        </label>
      </div>
      <details className={css.customize} data-meditation-accents>
        <summary><Sparkles size={16} aria-hidden="true"/>{t.customize}<ChevronDown size={16} aria-hidden="true"/></summary>
        <div className={css.customBody}>
          <p>{t.selected}</p>
          <div className={css.accentChips} role="group" aria-label={t.customize}>
            {accents.map(id=><button key={id} type="button" disabled={disabled}
              aria-pressed={selected.includes(id)} data-meditation-accent={id} onClick={()=>toggle(id)}>
              {selected.includes(id)?<Check size={13} aria-hidden="true"/>:null}{t.accents[id]}
            </button>)}
          </div>
          <div className={css.selectors}>
            <label>{t.image}
              <select data-meditation-imagery value={image} disabled={disabled}
                onChange={event=>setImage(event.target.value as ImageKey)}>
                {(Object.keys(t.images) as ImageKey[]).map(id=><option key={id} value={id}>{t.images[id]}</option>)}
              </select>
            </label>
            <label>{t.tone}
              <select data-meditation-tone value={tone} disabled={disabled}
                onChange={event=>setTone(event.target.value as ToneKey)}>
                {(Object.keys(t.tones) as ToneKey[]).map(id=><option key={id} value={id}>{t.tones[id]}</option>)}
              </select>
            </label>
            <label>{t.attention}
              <select data-meditation-attention value={attention} disabled={disabled}
                onChange={event=>setAttention(event.target.value as Attention)}>
                {(Object.keys(t.attentions) as Attention[]).map(id=>
                  <option key={id} value={id}>{t.attentions[id]}</option>)}
              </select>
            </label>
            <label>{t.depth}
              <select data-meditation-depth value={depth} disabled={disabled}
                onChange={event=>setDepth(event.target.value as Depth)}>
                {(Object.keys(t.depths) as Depth[]).map(id=>
                  <option key={id} value={id}>{t.depths[id]}</option>)}
              </select>
            </label>
            <label>{t.ending}
              <select data-meditation-ending value={ending} disabled={disabled}
                onChange={event=>setEnding(event.target.value as Ending)}>
                {(Object.keys(t.endings) as Ending[]).map(id=>
                  <option key={id} value={id}>{t.endings[id]}</option>)}
              </select>
            </label>
          </div>
          <label className={css.extra}>{t.extra}
            <textarea rows={2} maxLength={160} value={extra} disabled={disabled}
              data-meditation-extra placeholder={t.placeholder}
              onChange={event=>setExtra(event.currentTarget.value)}/>
          </label>
        </div>
      </details>
      <button type="button" className={css.generate} data-meditation-generate disabled={disabled}
        onClick={generate}>
        {script?<RotateCcw size={19} aria-hidden="true"/>:<Sparkles size={19} aria-hidden="true"/>}
        {script?t.regenerate:t.generate}
      </button>
      {script?<div className={css.result} data-meditation-result>
        <div className={css.resultHead}>
          <strong><FileText size={17} aria-hidden="true"/>{t.edited}</strong>
          <span>{script.length.toLocaleString(locale)} </span>
        </div>
        {stale?<p className={css.stale} role="status">{t.changed}</p>:null}
        <textarea data-meditation-script aria-label={t.edited} rows={15}
          maxLength={12000} value={script} onChange={event=>{stopNarration();setScript(event.currentTarget.value);setNotice("");}}/>
        <div className={css.narration} data-meditation-narration>
          <div className={css.narrationHeading}>
            <strong><Headphones size={17} aria-hidden="true"/>{t.voiceTitle}</strong>
            <small>{t.voiceEstimate}: ~{Math.max(1,Math.ceil(estimatedSeconds/60))} {t.minutes}</small>
          </div>
          <p>{t.voiceDescription}</p>
          <div className={css.narrationControls}>
            {voices.length>1?<label>{t.voice}
              <select data-meditation-voice value={voiceName||chosenVoice?.name||""} disabled={listening}
                onChange={event=>setVoiceName(event.target.value)}>
                {voices.map((voice,index)=><option value={voice.name} key={voice.voiceURI+"-"+index}>
                  {voice.name}
                </option>)}
              </select>
            </label>:null}
            <label>{t.rate}
              <select data-meditation-rate value={rate} disabled={listening}
                onChange={event=>setRate(Number(event.target.value))}>
                <option value={0.75}>0.75×</option><option value={0.9}>0.9×</option>
                <option value={1}>1×</option>
              </select>
            </label>
          </div>
          {audioSrc?<label className={css.musicChoice}>
            <input data-meditation-with-music type="checkbox" checked={withMusic}
              disabled={listening} onChange={event=>setWithMusic(event.currentTarget.checked)}/>
            {t.withMusic}
          </label>:null}
          {audioSrc?<audio ref={ambientRef} src={audioSrc} preload="none" loop hidden/>:null}
          <button type="button" className={css.listen} data-meditation-listen
            aria-pressed={listening} onClick={toggleNarration}>
            {listening?<Square size={17} aria-hidden="true"/>:<Headphones size={17} aria-hidden="true"/>}
            {listening?t.stopListening:t.listen}
          </button>
          {listening&&progress.total>0?<div className={css.narrationProgress}
            data-meditation-voice-progress aria-label={t.voiceReading}>
            <span>{progress.kind==="pause"?t.voicePause:t.voicePart} · {progress.index}/{progress.total}</span>
            <progress value={progress.index} max={progress.total} aria-label={t.voiceReading}/>
          </div>:null}
          {!voices.length?<p className={css.voiceHint} role="note">{t.noVoice}</p>:null}
          <small className={css.voiceHint}>{t.voiceNote}</small>
        </div>
        <div className={css.actions}>
          <button type="button" data-meditation-copy onClick={()=>void copyScript()}>
            <Clipboard size={16} aria-hidden="true"/>{t.copy}
          </button>
          <button type="button" data-meditation-download onClick={download}>
            <Download size={16} aria-hidden="true"/>{t.download}
          </button>
        </div>
        <p className={css.helper}>{t.editHint}</p>
      </div>:null}
      {notice?<p className={css.notice} role="status" aria-live="polite">{notice}</p>:null}
      <p className={css.safety}>{t.safety}</p>
      <p className={css.privacy}><Check size={14} aria-hidden="true"/>{t.privacy}</p>
    </section>
  );
}
