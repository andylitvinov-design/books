"use client";

import { useState } from "react";
import { Check, Eye, Layers3, Plus, SlidersHorizontal, Sparkles, Type, Waves } from "lucide-react";
import type { VideoLocale, VideoTheme } from "@/lib/mandala/holistic-video-themes";
import {
  compactCustomAffirmationInput, linesForVideoAffirmations, suggestedVideoAffirmations,
} from "@/lib/mandala/video-affirmations";
import type {
  AffirmationDensity, AffirmationFrequency, AffirmationSettings, AffirmationVisibility,
} from "@/lib/mandala/video-affirmations";
import { MandalaPersonalAffirmations } from "./mandala-personal-affirmations";
import css from "./mandala-video-affirmations.module.css";

const text = {
  en: {
    title: "Hypnoaffirmations", description: "Short affirmations appear in your video as readable text or brief “25th-frame” messages. Readable phrases can be consciously repeated.",
    science: "Brief frames are experimental; lasting effects on beliefs are not scientifically established.",
    use: "In video", suggested: "Short phrases", selected: "chosen",
    custom: "My phrases", customHint: "Up to 5 phrases, 36 characters each",
    placeholder: "One short phrase per line",
    density: "Text density", densityLevels: ["Low", "Medium", "High"],
    frequency: "Frequency", frequencyLevels: ["8 s", "5 s", "3 s"],
    displaySettings: "Display settings", views: "modes",
    visibility: "Visibility · combine options",
    modes: { small: "Small", large: "Large", frame: "25th frame" },
    frameNote: "Experimental short frame. Subliminal effects are not established; rendering varies by device.",
    privacy: "Your own phrases stay in this browser. No upload to AI or CRM.",
    sample: "Preview", off: "Off", on: "On",
    noPhrase: "Choose a phrase", none: "Choose at least one visibility mode.",
    ready: "phrases in video", customCount: "own",
  },
  ru: {
    title: "Гипноаффирмации", description: "Короткие установки появляются в видео явно — для осознанного повторения, или на мгновение — методом «25-го кадра».",
    science: "«25-й кадр» — экспериментальный режим: его влияние на убеждения научно не доказано.",
    use: "В видео", suggested: "Короткие фразы", selected: "выбрано",
    custom: "Свои фразы", customHint: "До 5 фраз, не длиннее 36 знаков",
    placeholder: "Одна короткая фраза в строке",
    density: "Плотность", densityLevels: ["Мало", "Средне", "Много"],
    frequency: "Частота", frequencyLevels: ["8 сек", "5 сек", "3 сек"],
    displaySettings: "Настройки показа", views: "режима",
    visibility: "Видимость · можно сочетать",
    modes: { small: "Мелкие", large: "Крупные", frame: "25-й кадр" },
    frameNote: "Экспериментальный короткий кадр. Подсознательный эффект не доказан; отображение зависит от устройства.",
    privacy: "Свои фразы остаются в браузере. Без отправки в AI и CRM.",
    sample: "Предпросмотр", off: "Выкл.", on: "Вкл.",
    noPhrase: "Выберите фразу", none: "Выберите хотя бы один режим видимости.",
    ready: "фраз в видео", customCount: "своих",
  },
  es: {
    title: "Hipnoafirmaciones", description: "Las frases aparecen en el vídeo de forma legible, para repetirlas conscientemente, o como breves «fotogramas 25».",
    science: "Los fotogramas breves son experimentales; no se ha demostrado que cambien las creencias.",
    use: "En vídeo", suggested: "Frases breves", selected: "elegidas",
    custom: "Mis frases", customHint: "Hasta 5 frases, 36 caracteres cada una",
    placeholder: "Una frase corta por línea",
    density: "Densidad", densityLevels: ["Poca", "Media", "Alta"],
    frequency: "Frecuencia", frequencyLevels: ["8 s", "5 s", "3 s"],
    displaySettings: "Ajustes de texto", views: "modos",
    visibility: "Visibilidad · combina opciones",
    modes: { small: "Pequeñas", large: "Grandes", frame: "Fotograma 25" },
    frameNote: "Fotograma breve experimental. No hay pruebas de efectos subliminales y depende del dispositivo.",
    privacy: "Tus frases quedan en este navegador. Sin envíos a IA ni CRM.",
    sample: "Vista previa", off: "Apagado", on: "Activo",
    noPhrase: "Elige una frase", none: "Elige al menos un modo de visibilidad.",
    ready: "frases en vídeo", customCount: "propias",
  },
} as const;

const densityChoices: AffirmationDensity[] = ["low", "medium", "high"];
const frequencyChoices: AffirmationFrequency[] = [1, 2, 3];
const visibilityChoices: AffirmationVisibility[] = ["small", "large", "frame"];

export function MandalaVideoAffirmations({
  locale, theme, settings, onChange, disabled = false, onTestPersonalization,
}: {
  locale: VideoLocale;
  theme: VideoTheme;
  settings: AffirmationSettings;
  onChange: (next: AffirmationSettings) => void;
  disabled?: boolean;
  onTestPersonalization?: () => void;
}) {
  const ui = text[locale];
  const [selectionMethod,setSelectionMethod] = useState<"manual"|"tests">("manual");
  const suggestions = settings.presetOverride?.length === 5
    ? settings.presetOverride : suggestedVideoAffirmations[locale][theme];
  const lines = linesForVideoAffirmations(locale, theme, settings);
  const customCount = settings.custom.split(/\r?\n/).filter(line => line.trim()).length;
  const densityIndex = densityChoices.indexOf(settings.density);
  const summaryModes = settings.visibility.length === 1
    ? ui.modes[settings.visibility[0]]
    : settings.visibility.length + " " + ui.views;
  const update = (change: Partial<AffirmationSettings>) => onChange({ ...settings, ...change });
  const chooseManual = () => {
    setSelectionMethod("manual");
    if (settings.presetOverride?.length) update({presetOverride: undefined, selected: [0,1,2]});
    document.getElementById("video-hypno-manual")?.scrollIntoView({behavior:"smooth",block:"nearest"});
  };
  const toggleSuggestion = (index: number) => {
    const selected = settings.selected.includes(index)
      ? settings.selected.filter(value => value !== index)
      : [...settings.selected, index].slice(0, 5);
    update({ selected, enabled: true });
  };
  const toggleVisibility = (value: AffirmationVisibility) => {
    const visibility = settings.visibility.includes(value)
      ? settings.visibility.filter(item => item !== value)
      : [...settings.visibility, value];
    update({ visibility, enabled: true });
  };

  return (
    <section className={css.panel} data-video-affirmations aria-labelledby="video-affirmations-heading">
      <div className={css.heading}>
        <div className={css.titleGroup}>
          <span className={css.emblem}><Sparkles size={18} aria-hidden="true"/></span>
          <h3 id="video-affirmations-heading">{ui.title}</h3>
        </div>
        <label className={css.enable}>
          <input type="checkbox" checked={settings.enabled}
            data-video-affirmations-enable disabled={disabled}
            onChange={event => update({ enabled: event.currentTarget.checked })}/>
          <span>{ui.use}</span>
        </label>
      </div>
      <div className={css.hypnoIntro} data-video-hypno-intro>
        <p className={css.description}>{ui.description}</p>
        <p className={css.scienceNote}>{ui.science}</p>
      </div>

      <MandalaPersonalAffirmations locale={locale} theme={theme} settings={settings}
        onChange={onChange} disabled={disabled} selectionMethod={selectionMethod}
        onManualSelect={chooseManual} onTestsSelected={()=>{setSelectionMethod("tests");onTestPersonalization?.();}}/>

      <fieldset id="video-hypno-manual" className={css.controls} disabled={disabled}>
        <legend className={css.sectionLabel}>
          {ui.suggested} <small>{settings.selected.length}/5 {ui.selected}</small>
        </legend>
        <div className={css.suggestions}>
          {suggestions.map((sentence, index) =>
            <button key={index} type="button" className={css.suggestion}
              data-video-affirmation-preset={index} aria-pressed={settings.selected.includes(index)}
              onClick={() => toggleSuggestion(index)}>
              <span>{sentence}</span>
              <span className={css.tick}><Check size={13} aria-hidden="true"/></span>
            </button>)}
        </div>

        <details className={css.customDetails} data-video-affirmations-custom>
          <summary><Plus size={16} aria-hidden="true"/>
            <span>{ui.custom}</span><small>{customCount}/5 {ui.customCount}</small>
          </summary>
          <div className={css.customBody}>
            <label htmlFor="video-custom-affirmations" className={css.smallHint}>{ui.customHint}</label>
            <textarea id="video-custom-affirmations" data-video-custom-affirmations
              rows={2} maxLength={190} value={settings.custom}
              placeholder={ui.placeholder}
              onChange={event => update({
                custom: compactCustomAffirmationInput(event.currentTarget.value),
                enabled: true,
              })}/>
          </div>
        </details>

        <details className={css.settingsDetails} data-video-affirmations-settings>
          <summary><SlidersHorizontal size={16} aria-hidden="true"/>
            <span>{ui.displaySettings}</span>
            <small>{ui.densityLevels[densityIndex]} · {ui.frequencyLevels[settings.frequency-1]} · {summaryModes}</small>
          </summary>
          <div className={css.settingsBody}>
            <div className={css.modeGrid}>
              <div className={css.modeGroup} role="group" aria-label={ui.density}>
                <div className={css.modeHeading}><Layers3 size={16} aria-hidden="true"/>{ui.density}</div>
                <div className={css.density}>
                  {densityChoices.map((item, index) =>
                    <button key={item} type="button" data-video-affirmation-density={item}
                      aria-pressed={settings.density === item}
                      onClick={() => update({ density: item })}>{ui.densityLevels[index]}</button>)}
                </div>
              </div>
              <div className={css.modeGroup} role="group" aria-label={ui.frequency}>
                <div className={css.modeHeading}><Waves size={16} aria-hidden="true"/>{ui.frequency}</div>
                <div className={css.frequencyChoices}>
                  {frequencyChoices.map((item, index) =>
                    <button key={item} type="button" data-video-affirmation-frequency={item}
                      aria-pressed={settings.frequency === item}
                      onClick={() => update({ frequency: item })}>{ui.frequencyLevels[index]}</button>)}
                </div>
              </div>
            </div>
            <div className={css.visibility}>
              <div className={css.modeHeading}><Eye size={16} aria-hidden="true"/>{ui.visibility}</div>
              <div className={css.visibilityChoices} role="group" aria-label={ui.visibility}>
                {visibilityChoices.map(item =>
                  <label key={item} data-video-affirmation-visibility={item}>
                    <input type="checkbox" checked={settings.visibility.includes(item)}
                      onChange={() => toggleVisibility(item)}/>
                    <span>{ui.modes[item]}</span>
                  </label>)}
              </div>
              {settings.visibility.includes("frame") && <p className={css.frameNote}>{ui.frameNote}</p>}
              {!settings.visibility.length && settings.enabled && <p className={css.frameNote}>{ui.none}</p>}
            </div>
          </div>
        </details>
      </fieldset>

      <div className={css.preview} data-video-affirmations-preview aria-live="polite">
        <div className={css.previewTitle}>
          <Type size={15} aria-hidden="true"/>{ui.sample}
          <span className={css.previewState} data-active={settings.enabled}>{settings.enabled ? ui.on : ui.off}</span>
        </div>
        <div className={css.previewText}>{lines[0] || ui.noPhrase}</div>
        <small>{settings.enabled && settings.visibility.length ? lines.length : 0} {ui.ready}
          {" · "}{settings.selected.length}/5 {ui.selected} · {customCount} {ui.customCount}</small>
      </div>
      <p className={css.privacy}>{ui.privacy}</p>
    </section>
  );
}
