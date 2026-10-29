"use client";

import { Check, Eye, Layers3, Sparkles, Type, Waves } from "lucide-react";
import type { VideoLocale, VideoTheme } from "@/lib/mandala/holistic-video-themes";
import {
  linesForVideoAffirmations, suggestedVideoAffirmations,
} from "@/lib/mandala/video-affirmations";
import type {
  AffirmationDensity, AffirmationFrequency, AffirmationSettings, AffirmationVisibility,
} from "@/lib/mandala/video-affirmations";
import css from "./mandala-video-affirmations.module.css";
import { MandalaPersonalAffirmations } from "./mandala-personal-affirmations";

const text = {
  en: {
    title:"Affirmations",description:"Choose 3–5 suggested phrases or add your own. The words appear in the exported video.",
    use:"Add affirmations to video",suggested:"Suggested for your theme",
    custom:"Your own affirmations",placeholder:"One affirmation per line (up to 5)",
    density:"Text density",densityLevels:["Low","Medium","High"],
    frequency:"How often phrases change",frequencyLevels:["Rarely · 8 s","Moderate · 5 s","Often · 3 s"],
    visibility:"Visibility · choose any combination",
    modes:{small:"Small background phrases",large:"Large readable phrases",frame:"Brief frame (\"25th frame\")"},
    frameNote:"Experimental: a short text frame, not proven subliminal influence. Exact frame capture varies by device.",
    privacy:"Your own words stay in this browser; they are not sent to AI, CRM or your account.",
    sample:"Text preview",notActive:"Turn on affirmations to place them in your video.",
    none:"Select at least one visibility option to show the phrases.",
    selected:"suggested",customCount:"custom",ready:"phrases in video",
  },
  ru: {
    title:"Аффирмации",description:"Выберите 3–5 готовых фраз по теме или добавьте свои. Текст попадёт в готовое видео.",
    use:"Добавить аффирмации в видео",suggested:"Готовые фразы по теме",
    custom:"Свои аффирмации",placeholder:"Каждая фраза с новой строки (до 5)",
    density:"Плотность текста",densityLevels:["Мало","Средне","Много"],
    frequency:"Как часто сменяются фразы",frequencyLevels:["Редко · 8 сек","Умеренно · 5 сек","Часто · 3 сек"],
    visibility:"Видимость · можно выбрать несколько",
    modes:{small:"Мелкие фразы на фоне",large:"Крупные читаемые фразы",frame:"Короткий кадр («25-й кадр»)"},
    frameNote:"Экспериментальный режим: короткий кадр, а не доказанное подсознательное внушение. Точность зависит от устройства.",
    privacy:"Ваши фразы остаются в браузере и не отправляются в AI, CRM или кабинет.",
    sample:"Пример надписи",notActive:"Включите аффирмации, чтобы добавить их в видео.",
    none:"Выберите хотя бы один режим видимости для показа текста.",
    selected:"готовых",customCount:"своих",ready:"фраз в видео",
  },
  es: {
    title:"Afirmaciones",description:"Elige 3–5 frases sugeridas o escribe las tuyas. Aparecerán en el vídeo exportado.",
    use:"Añadir afirmaciones al vídeo",suggested:"Frases sugeridas para el tema",
    custom:"Mis afirmaciones",placeholder:"Una frase por línea (hasta 5)",
    density:"Densidad del texto",densityLevels:["Poco","Medio","Mucho"],
    frequency:"Frecuencia de cambio",frequencyLevels:["Poco · 8 s","Normal · 5 s","Frecuente · 3 s"],
    visibility:"Visibilidad · combina opciones",
    modes:{small:"Frases pequeñas de fondo",large:"Frases grandes legibles",frame:"Fotograma breve («fotograma 25»)"},
    frameNote:"Modo experimental: un fotograma breve, no una influencia subliminal demostrada. Depende del dispositivo.",
    privacy:"Tus frases no salen del navegador ni se envían a IA, CRM o tu cuenta.",
    sample:"Vista previa de texto",notActive:"Activa las afirmaciones para incluirlas en el vídeo.",
    none:"Selecciona al menos un modo de visibilidad.",
    selected:"sugeridas",customCount:"propias",ready:"frases en vídeo",
  },
} as const;

const densityChoices: AffirmationDensity[] = ["low","medium","high"];
const visibilityChoices: AffirmationVisibility[] = ["small","large","frame"];

export function MandalaVideoAffirmations({
  locale, theme, settings, onChange, disabled = false,
}: {
  locale: VideoLocale;
  theme: VideoTheme;
  settings: AffirmationSettings;
  onChange: (next: AffirmationSettings) => void;
  disabled?: boolean;
}) {
  const ui = text[locale];
  const suggestions = settings.presetOverride?.length === 5
    ? settings.presetOverride : suggestedVideoAffirmations[locale][theme];
  const lines = linesForVideoAffirmations(locale,theme,settings);
  const customCount = settings.custom.split(/\r?\n/).filter(line=>line.trim()).length;
  const update = (change: Partial<AffirmationSettings>) => onChange({...settings,...change});
  const toggleSuggestion = (index: number) => {
    const selected = settings.selected.includes(index)
      ? settings.selected.filter(value=>value!==index)
      : [...settings.selected,index].slice(0,5);
    update({selected,enabled:true});
  };
  const toggleVisibility = (value: AffirmationVisibility) => {
    const visibility = settings.visibility.includes(value)
      ? settings.visibility.filter(item=>item!==value)
      : [...settings.visibility,value];
    update({visibility,enabled:true});
  };

  return (
    <section className={css.panel} data-video-affirmations aria-labelledby="video-affirmations-heading">
      <div className={css.heading}>
        <div className={css.titleGroup}>
          <span className={css.emblem}><Sparkles size={19} aria-hidden="true"/></span>
          <h3 id="video-affirmations-heading">{ui.title}</h3>
        </div>
        <label className={css.enable}>
          <input type="checkbox" checked={settings.enabled}
            data-video-affirmations-enable disabled={disabled}
            onChange={event=>update({enabled:event.currentTarget.checked})}/>
          <span>{ui.use}</span>
        </label>
      </div>
      <p className={css.description}>{ui.description}</p>
      <MandalaPersonalAffirmations locale={locale} theme={theme} settings={settings} onChange={onChange} disabled={disabled}/>
      <fieldset className={css.controls} disabled={disabled}>
        <legend className={css.sectionLabel}>{ui.suggested} <small>{settings.selected.length}/5 {ui.selected}</small></legend>
        <div className={css.suggestions}>
          {suggestions.map((sentence,index)=>
            <button key={index} type="button" className={css.suggestion}
              data-video-affirmation-preset={index} aria-pressed={settings.selected.includes(index)}
              onClick={()=>toggleSuggestion(index)}>
              <span>{sentence}</span>
              <span className={css.tick}><Check size={14} aria-hidden="true"/></span>
            </button>)}
        </div>

        <label className={css.sectionLabel} htmlFor="video-custom-affirmations">
          {ui.custom} <small>{Math.min(5,customCount)}/5 {ui.customCount}</small>
        </label>
        <textarea id="video-custom-affirmations" data-video-custom-affirmations
          rows={3} maxLength={500} value={settings.custom}
          placeholder={ui.placeholder}
          onChange={event=>update({custom:event.currentTarget.value,enabled:true})}/>

        <div className={css.modeGrid}>
          <div className={css.modeGroup} role="group" aria-label={ui.density}>
            <div className={css.modeHeading}><Layers3 size={17} aria-hidden="true"/>{ui.density}</div>
            <div className={css.density}>
              {densityChoices.map((item,index)=>
                <button key={item} type="button" data-video-affirmation-density={item}
                  aria-pressed={settings.density===item}
                  onClick={()=>update({density:item})}>{ui.densityLevels[index]}</button>)}
            </div>
          </div>
          <div className={css.modeGroup}>
            <label className={css.modeHeading} htmlFor="video-affirmation-frequency">
              <Waves size={17} aria-hidden="true"/>{ui.frequency}
            </label>
            <input id="video-affirmation-frequency" type="range" min={1} max={3} step={1}
              data-video-affirmation-frequency value={settings.frequency}
              aria-valuetext={ui.frequencyLevels[settings.frequency-1]}
              onChange={event=>update({frequency:Number(event.currentTarget.value) as AffirmationFrequency})}/>
            <div className={css.frequencyLabels}>
              <span>{ui.frequencyLevels[0]}</span>
              <strong>{ui.frequencyLevels[settings.frequency-1]}</strong>
              <span>{ui.frequencyLevels[2]}</span>
            </div>
          </div>
        </div>
        <div className={css.visibility}>
          <div className={css.modeHeading}><Eye size={17} aria-hidden="true"/>{ui.visibility}</div>
          <div className={css.visibilityChoices} role="group" aria-label={ui.visibility}>
            {visibilityChoices.map(item=>
              <label key={item} data-video-affirmation-visibility={item}>
                <input type="checkbox" checked={settings.visibility.includes(item)}
                  onChange={()=>toggleVisibility(item)}/>
                <span>{ui.modes[item]}</span>
              </label>)}
          </div>
          {settings.visibility.includes("frame") ? <p className={css.frameNote}>{ui.frameNote}</p> : null}
          {!settings.visibility.length && settings.enabled ? <p className={css.frameNote}>{ui.none}</p> : null}
        </div>
      </fieldset>
      <div className={css.preview} data-video-affirmations-preview aria-live="polite">
        <div className={css.previewTitle}><Type size={16} aria-hidden="true"/>{ui.sample}</div>
        <div className={css.previewText}>{settings.enabled && settings.visibility.length && lines.length
          ? lines[0] : ui.notActive}</div>
        <small>{settings.selected.length} {ui.selected} · {Math.min(5,customCount)} {ui.customCount} · {settings.enabled?lines.length:0} {ui.ready}</small>
      </div>
      <p className={css.privacy}>{ui.privacy}</p>
    </section>
  );
}
