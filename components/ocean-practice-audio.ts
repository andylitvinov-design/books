"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SOUND_PREFERENCE_KEY = "holistic-house.practice-ocean-sound.v1";

type OceanSoundscape = {
  play: () => void;
  pause: () => void;
  dispose: () => void;
};

// A quiet, royalty-free ocean-and-ambient soundscape synthesized on the device.
// No CDN, large audio files, network requests, or autoplay. Build only after a tap.
function createOceanSoundscape(): OceanSoundscape | null {
  if (typeof window === "undefined") return null;
  const AudioContextType = window.AudioContext
    || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextType) return null;

  let context: AudioContext;
  try {
    context = new AudioContextType();
  } catch {
    return null;
  }

  const master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);

  // Continuous rolling surf. Filtered noise and an eleven-second swell sound
  // more like distant waves than a conspicuous metronome or alert.
  const length = Math.round(context.sampleRate * 8);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const samples = buffer.getChannelData(0);
  let softNoise = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    softNoise = softNoise * 0.94 + white * 0.06;
    samples[i] = white * 0.55 + softNoise * 0.95;
  }
  // Match both ends of the eight-second bed to avoid audible loop clicks.
  const crossfade = Math.max(1, Math.round(context.sampleRate * 0.4));
  const tail = samples.slice(length - crossfade);
  for (let i = 0; i < crossfade; i += 1) {
    const blend = (i + 1) / crossfade;
    samples[length - crossfade + i] = tail[i] * (1 - blend) + samples[i] * blend;
  }

  const surf = context.createBufferSource();
  surf.buffer = buffer;
  surf.loop = true;
  const lowPass = context.createBiquadFilter();
  lowPass.type = "lowpass";
  lowPass.frequency.value = 1050;
  const surfGain = context.createGain();
  surfGain.gain.value = 0.14;
  surf.connect(lowPass).connect(surfGain).connect(master);

  const swell = context.createOscillator();
  swell.type = "sine";
  swell.frequency.value = 0.09;
  const swellDepth = context.createGain();
  swellDepth.gain.value = 0.095;
  swell.connect(swellDepth).connect(surfGain.gain);

  // Very soft, consonant ambient tones beneath the sea. No speech or beat.
  const padFilter = context.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 500;
  padFilter.connect(master);
  const pad = [130.81, 196.0, 261.63].map((frequency, index) => {
    const tone = context.createOscillator();
    tone.type = "sine";
    tone.frequency.value = frequency;
    const gain = context.createGain();
    gain.gain.value = [0.012, 0.008, 0.005][index];
    tone.connect(gain).connect(padFilter);
    tone.start();
    return tone;
  });
  surf.start();
  swell.start();

  let playing = false;
  let disposed = false;
  let suspendId: ReturnType<typeof setTimeout> | null = null;

  const fadeTo = (level: number, seconds: number) => {
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(level, now + seconds);
  };

  return {
    play() {
      if (disposed) return;
      playing = true;
      if (suspendId !== null) clearTimeout(suspendId);
      suspendId = null;
      // Invoked from the user's Start/Resume or sound-toggle click. Required
      // by Safari/iOS and Chrome audio gesture policies.
      void context.resume().then(() => {
        if (playing && !disposed) fadeTo(0.7, 0.9);
      }).catch(() => {});
    },
    pause() {
      if (disposed) return;
      playing = false;
      fadeTo(0, 0.3);
      if (suspendId !== null) clearTimeout(suspendId);
      suspendId = setTimeout(() => {
        suspendId = null;
        if (!playing && !disposed) void context.suspend().catch(() => {});
      }, 360);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      playing = false;
      if (suspendId !== null) clearTimeout(suspendId);
      try {
        surf.stop();
        swell.stop();
        pad.forEach(tone => tone.stop());
      } catch { /* Nodes may already have stopped on page dismissal. */ }
      void context.close().catch(() => {});
    },
  };
}

export function useOceanPracticeAudio() {
  const [enabled, setEnabled] = useState(true);
  const [supported, setSupported] = useState(true);
  const soundRef = useRef<OceanSoundscape | null>(null);

  useEffect(() => {
    const available = Boolean(window.AudioContext
      || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    setSupported(available);
    try {
      setEnabled(window.localStorage.getItem(SOUND_PREFERENCE_KEY) !== "off");
    } catch { /* Local storage may be disabled in private browsing. */ }
    const stopWhenHidden = () => {
      if (document.hidden) soundRef.current?.pause();
    };
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      document.removeEventListener("visibilitychange", stopWhenHidden);
      soundRef.current?.dispose();
      soundRef.current = null;
    };
  }, []);

  const play = useCallback(() => {
    if (!enabled) return;
    if (!soundRef.current) soundRef.current = createOceanSoundscape();
    if (!soundRef.current) {
      setSupported(false);
      return;
    }
    soundRef.current.play();
  }, [enabled]);

  const pause = useCallback(() => soundRef.current?.pause(), []);

  const toggle = useCallback((timerRunning: boolean) => {
    if (!supported) return;
    const next = !enabled;
    setEnabled(next);
    try {
      window.localStorage.setItem(SOUND_PREFERENCE_KEY, next ? "on" : "off");
    } catch { /* Preference remains available for the current page. */ }
    if (!next) {
      soundRef.current?.pause();
    } else if (timerRunning) {
      if (!soundRef.current) soundRef.current = createOceanSoundscape();
      if (soundRef.current) soundRef.current.play();
      else setSupported(false);
    }
  }, [enabled, supported]);

  return { enabled, supported, play, pause, toggle };
}

export type OceanPracticeAudioControls = ReturnType<typeof useOceanPracticeAudio>;
