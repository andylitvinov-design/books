"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { AcademyVideoPlayer } from "@/components/academy-video-player";

type Props = {
  initiallyOpen: boolean;
  summary: string;
  language: string;
  nativeLabel: string;
  nativeSuffix: string;
  youtubeTitle: string;
  videos: { src: string; poster?: string | null; type: string }[];
};

/** Closing the native disclosure stops playback without a provider command. */
export function TantraVideoTestimonials(props: Props) {
  const [youtubeSession, setYoutubeSession] = useState(0);

  const retained = useRef(new WeakMap<HTMLVideoElement, { source: string; time: number; reconstructing: boolean }>());
  useEffect(() => () => { retained.current = new WeakMap(); }, []);

  function pauseAndRemember(video: HTMLVideoElement) {
    video.pause();
    // Capture after pausing and before hiding. Repeated close notifications must
    // not replace the retained position with a backend's transient reset value.
    if (retained.current.has(video)) return;
    if (video.currentSrc && Number.isFinite(video.currentTime) && video.currentTime > 0
      && !video.ended && !video.seeking) {
      retained.current.set(video, { source: video.currentSrc, time: video.currentTime, reconstructing: false });
    }
  }
  function discardRecovery(event: SyntheticEvent<HTMLVideoElement>) {
    // Observation only: a newer user play/seek or control interaction always wins.
    retained.current.delete(event.currentTarget);
  }
  function onNativeLoadStart(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    const saved = retained.current.get(video);
    if (!saved) return;
    // Resource selection can temporarily clear currentSrc. Defer identity proof
    // until metadata, but reject a known different source immediately.
    if (!video.paused || (video.currentSrc && video.currentSrc !== saved.source)) retained.current.delete(video);
    else saved.reconstructing = true;
  }
  function onNativeMetadata(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    const saved = retained.current.get(video);
    if (!saved?.reconstructing) return;
    retained.current.delete(video); // At most one recovery per captured close.
    if (!video.paused || video.seeking || video.ended || video.currentSrc !== saved.source
      || !Number.isFinite(saved.time) || saved.time <= 0
      || !Number.isFinite(video.duration) || saved.time >= video.duration) return;
    // WebKit can rebuild a hidden decoder at frame zero while its cached DOM
    // currentTime still reports the retained position. An explicit paused seek
    // restores that frame; never start playback, reload or replace the media element.
    try {
      video.currentTime = saved.time;
    } catch {
      // A transient native backend can reject the seek. Recovery is optional:
      // leave controls intact, with no retry, playback or reload side effect.
    }
  }

  function onSummaryClickCapture(event: SyntheticEvent<HTMLElement>) {
    const details = event.currentTarget.closest("details");
    if (!details?.open) return;
    // Pause before the native default action hides the videos. WebKit can save
    // the running pipeline state when hidden, then replay it after reopening.
    // Keep default mouse/keyboard activation and every explicit media play intact.
    details.querySelectorAll("video").forEach(pauseAndRemember);
  }

  function onToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    const details = event.currentTarget;
    if (details.open) return;
    // Native controls can open/play before hydration. The observed DOM state,
    // not initiallyOpen or a missed earlier toggle, decides whether to stop.
    // Keep native playback positions. Reset only the YouTube component, removing
    // its iframe and restoring its existing explicit click-to-play poster.
    details.querySelectorAll("video").forEach(pauseAndRemember);
    setYoutubeSession((session) => session + 1);
  }

  return (
    <details className="tantra-source-disclosure tantra-review-video-section" id="tantra-russian-video-testimonials" open={props.initiallyOpen} onToggle={onToggle}>
      <summary onClickCapture={onSummaryClickCapture}>{props.summary}</summary>
      <p className="tantra-review-video-note">{props.language}</p>
      <div className="tantra-review-videos">
        {props.videos.map((video, i) => (
          <figure className="tantra-review-video" key={video.src}>
            <video controls playsInline preload="none" poster={video.poster ?? undefined}
              onLoadStart={onNativeLoadStart} onLoadedMetadata={onNativeMetadata}
              onPlay={discardRecovery} onSeeking={discardRecovery}
              onPointerDown={discardRecovery} onKeyDown={discardRecovery}>
              <source src={video.src} type={video.type} />
            </video>
            <figcaption>{props.nativeLabel} {i + 1}{props.nativeSuffix}</figcaption>
          </figure>
        ))}
        <figure className="tantra-review-video">
          <AcademyVideoPlayer key={youtubeSession} youtubeId="qM_nFUkYJ1k" title={props.youtubeTitle} />
          <figcaption>{props.youtubeTitle}</figcaption>
        </figure>
      </div>
    </details>
  );
}
