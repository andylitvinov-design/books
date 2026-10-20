"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SOUND_PREFERENCE_KEY = "holistic-house.practice-ocean-sound.v1";
const OCEAN_LOOP = "/audio/holistic-house-soft-melody-gentle-waves-20s.wav";

export type OceanPlaybackStatus = "idle" | "loading" | "playing" | "paused" | "blocked" | "unsupported";

type OceanSoundscape = {
  play: () => Promise<boolean>;
  pause: () => void;
  reset: () => void;
  dispose: () => void;
};

// Use an actual, locally hosted ocean + soft-music recording rather than an
// AudioContext oscillator. In particular, iPhone silent-mode / embedded Safari
// can mute WebAudio even while the UI says "Waves on". HTML media playback is
// more reliable, and play() rejects when the browser blocks it.
// The original, intentionally quiet 20s melody/surf recording loops through all practice timers.
function createOceanSoundscape(onStatus: (next: OceanPlaybackStatus) => void): OceanSoundscape | null {
  if (typeof window === "undefined" || typeof window.Audio !== "function") return null;

  let audio: HTMLAudioElement;
  try {
    audio = new window.Audio(OCEAN_LOOP);
    audio.loop = true;
    audio.preload = "auto";
    audio.muted = false;
    audio.volume = 0.65; // Extra attenuation where supported; iOS may enforce device volume.
  } catch {
    return null;
  }

  let disposed = false;
  let wanted = false;
  let hasStarted = false;
  let attempt = 0;
  const onWaiting = () => {
    if (disposed || !wanted) return;
    if (!hasStarted) {
      onStatus("loading");
      return;
    }
    // Mid-practice buffering must never leave a paused timer while audio
    // resumes by itself. Stop playback and ask for an explicit resume tap.
    wanted = false;
    audio.pause();
    onStatus("blocked");
  };
  const onPlaying = () => {
    if (disposed || !wanted) return;
    hasStarted = true;
    onStatus("playing");
  };
  const onError = () => { if (!disposed && wanted) { wanted = false; onStatus("blocked"); } };
  const onUnexpectedPause = () => {
    if (!disposed && wanted) { wanted = false; onStatus("blocked"); }
  };

  audio.addEventListener("waiting", onWaiting);
  audio.addEventListener("playing", onPlaying);
  audio.addEventListener("error", onError);
  audio.addEventListener("pause", onUnexpectedPause);

  return {
    async play() {
      if (disposed) return false;
      const ticket = ++attempt;
      wanted = true;
      hasStarted = false;
      onStatus("loading");
      try {
        // Called synchronously from a real Start/Resume/Waves tap, not an effect.
        // Never wait for a fetch before calling play() (iOS gesture permission).
        await audio.play();
        if (disposed || !wanted || ticket !== attempt) return false;
        hasStarted = true;
        onStatus("playing");
        return true;
      } catch {
        if (!disposed && ticket === attempt) {
          wanted = false;
          onStatus("blocked");
        }
        return false;
      }
    },
    pause() {
      if (disposed) return;
      wanted = false;
      attempt += 1;
      audio.pause();
      onStatus("paused");
    },
    reset() {
      if (disposed) return;
      wanted = false;
      attempt += 1;
      audio.pause();
      try { audio.currentTime = 0; } catch { /* Not seekable until metadata. */ }
      onStatus("paused");
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      wanted = false;
      attempt += 1;
      audio.pause();
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("pause", onUnexpectedPause);
      audio.removeAttribute("src");
      try { audio.load(); } catch { /* Page is closing. */ }
    },
  };
}

export function useOceanPracticeAudio() {
  const [enabled, setEnabled] = useState(true);
  const [supported, setSupported] = useState(true);
  const [status, setStatus] = useState<OceanPlaybackStatus>("idle");
  const soundRef = useRef<OceanSoundscape | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const test = document.createElement("audio");
    const available = typeof window.Audio === "function" && Boolean(
      test.canPlayType("audio/wav") || test.canPlayType("audio/x-wav")
    );
    setSupported(available);
    if (!available) setStatus("unsupported");
    try {
      setEnabled(window.localStorage.getItem(SOUND_PREFERENCE_KEY) !== "off");
    } catch { /* Browser may disable local storage. */ }

    const stopWhenHidden = () => {
      if (document.hidden) soundRef.current?.pause();
    };
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      mounted.current = false;
      document.removeEventListener("visibilitychange", stopWhenHidden);
      soundRef.current?.dispose();
      soundRef.current = null;
    };
  }, []);

  const startSound = useCallback((): Promise<boolean> => {
    if (!soundRef.current) {
      soundRef.current = createOceanSoundscape(next => {
        if (mounted.current) setStatus(next);
      });
    }
    if (!soundRef.current) {
      setSupported(false);
      setStatus("unsupported");
      return Promise.resolve(false);
    }
    return soundRef.current.play();
  }, []);

  // Returns false when the browser rejected the audio. Callers must not
  // advance a sound-enabled countdown until play() actually succeeds.
  const play = useCallback((): Promise<boolean> => {
    if (!enabled || !supported) return Promise.resolve(true); // Opt-in silent exercise.
    return startSound();
  }, [enabled, supported, startSound]);

  const pause = useCallback(() => soundRef.current?.pause(), []);
  const reset = useCallback(() => soundRef.current?.reset(), []);

  const toggle = useCallback((timerRunning: boolean) => {
    if (!supported) return;
    const next = !enabled;
    setEnabled(next);
    try {
      window.localStorage.setItem(SOUND_PREFERENCE_KEY, next ? "on" : "off");
    } catch { /* Preference is still applied during this session. */ }
    if (!next) {
      soundRef.current?.pause();
    } else if (timerRunning) {
      // This is also a direct user click; Safari is allowed to start sound.
      void startSound();
    }
  }, [enabled, supported, startSound]);

  return { enabled, supported, status, play, pause, reset, toggle };
}

export type OceanPracticeAudioControls = ReturnType<typeof useOceanPracticeAudio>;
