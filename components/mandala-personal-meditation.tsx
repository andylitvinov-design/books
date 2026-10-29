"use client";

import { useState } from "react";
import { Check, ChevronDown, Clipboard, Download, FileText, Leaf, RotateCcw, Sparkles } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import type { VideoTheme } from "@/lib/mandala/holistic-video-themes";
import type { GuidedMeditationFocus } from "./mandala-guided-course";
import { buildPersonalMeditationScript } from "@/lib/mandala/personal-meditation-script.mjs";
import css from "./mandala-personal-meditation.module.css";

const accents = ["calm","confidence","clarity","boundaries","acceptance","motivation","rest","gratitude"] as const;
type Accent = (typeof accents)[number];
type ImageKey = "video"|"garden"|"water"|"light"|"home";
type ToneKey = "gentle"|"grounded"|"uplifting";
type LengthKey = 3|5|8;
type Props = {
  locale:PublicLocale;theme:VideoTheme;wish:string;scene:string;sound:string;
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
    image:"Imagery",images:{video:"Current video scene",garden:"Garden",water:"Water",light:"Soft light",home:"Safe room"},
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
    image:"Образ",images:{video:"Сюжет текущего видео",garden:"Сад",water:"Вода",light:"Мягкий свет",home:"Уютная комната"},
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
    image:"Imagen",images:{video:"Escena actual",garden:"Jardín",water:"Agua",light:"Luz suave",home:"Habitación acogedora"},
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
  locale,theme,wish,scene,sound,pace,brightness,affirmations,affirmationsEnabled,focus,disabled
}:Props) {
  const t=copy[locale];
  const [selected,setSelected]=useState<Accent[]>([]);
  const [image,setImage]=useState<ImageKey>("video");
  const [tone,setTone]=useState<ToneKey>("gentle");
  const [length,setLength]=useState<LengthKey>(5);
  const [extra,setExtra]=useState("");
  const [script,setScript]=useState("");
  const [generatedFor,setGeneratedFor]=useState("");
  const [notice,setNotice]=useState("");
  const signature=JSON.stringify([locale,theme,wish,scene,sound,pace,brightness,affirmationsEnabled,affirmations,
    focus.difficulty,focus.goal,focus.goals,focus.details,selected,image,tone,length,extra]);
  const stale=Boolean(script&&generatedFor!==signature);
  const toggle=(accent:Accent)=>setSelected(current=>current.includes(accent)
    ? current.filter(item=>item!==accent)
    : current.length<3?[...current,accent]:current);
  const generate=()=>{
    if(disabled)return;
    const next=buildPersonalMeditationScript({
      locale,theme,wish,scene,sound,pace,brightness,affirmationsEnabled,affirmations,
      focus,accents:selected,image,tone,length,extra
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
            <label>{t.length}
              <select data-meditation-length value={length} disabled={disabled}
                onChange={event=>setLength(Number(event.target.value) as LengthKey)}>
                {([3,5,8] as const).map(value=><option value={value} key={value}>{value} {t.minutes}</option>)}
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
          maxLength={12000} value={script} onChange={event=>{setScript(event.currentTarget.value);setNotice("");}}/>
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
