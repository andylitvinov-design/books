"use client";

import { Volume2, VolumeX } from "lucide-react";
import type { OceanPracticeAudioControls } from "./ocean-practice-audio";
import styles from "./ocean-sound-toggle.module.css";

type Props = {
  locale: "en" | "ru";
  timerRunning: boolean;
  audio: OceanPracticeAudioControls;
};

export default function OceanSoundToggle({ locale, timerRunning, audio }: Props) {
  const ru = locale === "ru";
  const description = !audio.supported
    ? (ru ? "Звук недоступен на этом устройстве" : "Sound is unavailable on this device")
    : audio.enabled
      ? (ru ? "Выключить звук морских волн" : "Turn off the ocean waves")
      : (ru ? "Включить звук морских волн" : "Turn on the ocean waves");

  return <button
    type="button"
    className={styles.toggle}
    disabled={!audio.supported}
    aria-label={description}
    aria-pressed={audio.supported && audio.enabled}
    title={description}
    data-ocean-sound-toggle
    onClick={() => audio.toggle(timerRunning)}
  >
    {audio.supported && audio.enabled ? <Volume2 size={15} aria-hidden="true" /> : <VolumeX size={15} aria-hidden="true" />}
    <span>{ru ? "Волны" : "Waves"}</span>
  </button>;
}
