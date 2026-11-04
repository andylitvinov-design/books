"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type SyntheticEvent } from "react";
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

  const retained = useRef(new WeakMap<HTMLVideoElement, { source: string; time: number; reconstructing: boolean; awaitingFrame?: boolean; generation?: number; confirmedFrames?: number; restoreMutedOnOpen?: boolean }>());
  useEffect(() => () => { retained.current = new WeakMap(); }, []);

  function pauseAndRemember(video: HTMLVideoElement) {
    // A native <details> close can notify us at both click-capture and toggle.
    // Do not call pause() again on an already paused player: WebKit/GStreamer
    // can demote its decoder after a redundant pause, leaving a later play()
    // reporting "playing" with no advancing time or decoded frames.
    if (!video.paused) video.pause();
    // Capture after pausing and before hiding. Repeated close notifications must
    // not replace the retained position with a backend's transient reset value.
    const existing = retained.current.get(video);
    if (existing?.awaitingFrame) {
      existing.awaitingFrame = false;
      existing.generation = (existing.generation ?? 0) + 1;
      existing.confirmedFrames = 0;
    }
    // WebKitGTK/GStreamer may suspend muted <video> when its <details>
    // becomes invisible. Preserve the user-visible mute choice while hiding:
    // pause FIRST, then unmute only the paused, same-source hidden player.
    // Restore the original mute setting after the disclosure is visible.
    const preserveDecoder = (saved: { source: string; restoreMutedOnOpen?: boolean }) => {
      if (video.paused && video.muted === true && video.currentSrc === saved.source) {
        saved.restoreMutedOnOpen = true;
        video.muted = false;
      }
    };
    if (existing) {
      preserveDecoder(existing);
      return;
    }
    if (video.currentSrc && Number.isFinite(video.currentTime) && video.currentTime > 0
      && !video.ended && !video.seeking) {
      const saved = { source: video.currentSrc, time: video.currentTime, reconstructing: false,
        restoreMutedOnOpen: false };
      retained.current.set(video, saved);
      preserveDecoder(saved);
    }
  }
  function onNativePlay(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    const saved = retained.current.get(video);
    if (!saved || saved.awaitingFrame) return;
    // Native disclosure opening never seeks or plays. User play/playing is
    // the sole trigger for checking a retained, same-source decoder position.
    if (video.paused || video.seeking || video.ended ||
        video.currentSrc !== saved.source ||
        !Number.isFinite(saved.time) || saved.time <= 0 ||
        !Number.isFinite(video.duration) || saved.time >= video.duration ||
        typeof video.requestVideoFrameCallback !== 'function') {
      retained.current.delete(video);
      return;
    }
    saved.awaitingFrame = true;
    saved.confirmedFrames = 0;
    const generation = saved.generation ?? 0;
    const onFrame: VideoFrameRequestCallback = (_now, metadata) => {
      if (retained.current.get(video) !== saved ||
          (saved.generation ?? 0) !== generation) return;
      if (video.paused || video.seeking || video.ended ||
          video.isConnected === false || video.currentSrc !== saved.source ||
          !Number.isFinite(metadata.mediaTime)) {
        retained.current.delete(video);
        return;
      }
      if (metadata.mediaTime < saved.time - 0.25) {
        // A hidden WebKit/GStreamer decoder can restart at frame zero.
        // Its first post-reopen presented frame is still PREROLL: seeking at
        // that instant was observed to leave WebKit seeking forever (ES390).
        // Require several actual advancing decoded frames from the new
        // pipeline before one same-source position restoration. No timer,
        // autoplay, reload, blind retries or fake clock progress.
        saved.confirmedFrames = (saved.confirmedFrames ?? 0) + 1;
        if (saved.confirmedFrames < 4 || metadata.mediaTime < 0.5) {
          try { video.requestVideoFrameCallback(onFrame); }
          catch { retained.current.delete(video); }
          return;
        }
        retained.current.delete(video);
        try { video.currentTime = saved.time; } catch {
          // Refused native seek leaves native controls available.
        }
        return;
      }
      saved.confirmedFrames = (saved.confirmedFrames ?? 0) + 1;
      if (saved.confirmedFrames >= 2) {
        retained.current.delete(video); // native resume is genuinely healthy
      } else {
        try { video.requestVideoFrameCallback(onFrame); }
        catch { retained.current.delete(video); }
      }
    };
    try { video.requestVideoFrameCallback(onFrame); }
    catch { retained.current.delete(video); }
    // WebKit/GStreamer may report playing without a new decoded frame after
    // hydration + disclosure reopen. A blind BACKWARD seek is unsafe (real
    // artifact 13277168340: seeking without seeked). If a genuine user Play on
    // a previously-muted, same-source ready decoder stalls for 1.7 seconds,
    // give the *existing* player one bounded PAUSED -> PLAYING restart instead.
    // The guard never runs on disclosure open, never seeks/loads/replaces a
    // player and preserves the user's mute/volume and native controls. A failed
    // restart still fails the strict decoded-frame and media-clock browser QA.
    const windowView=video.ownerDocument?.defaultView;
    if(windowView && typeof windowView.requestAnimationFrame==="function") {
      const startedTime=video.currentTime;
      let startAt:number|null=null;
      const observeClock=(now:number)=>{
        if(retained.current.get(video)!==saved || (saved.generation??0)!==generation ||
          video.paused || video.seeking || video.ended || video.isConnected===false ||
          video.currentSrc!==saved.source)return;
        if(startAt===null)startAt=now;
        if(now-startAt<1700){windowView.requestAnimationFrame(observeClock);return;}
        if((saved.confirmedFrames??0)!==0 || video.currentTime>startedTime+0.1)return;
        retained.current.delete(video); // one observation, never retry
        // A single explicit-play recovery is valid only for a muted player:
        // asynchronous unmuted play() could violate browser user activation
        // and turn an ordinary unmuted user click into unsolicited audio.
        if (video.muted === true && video.readyState >= 2) {
          try {
            video.pause();
            void video.play().catch(() => {
              // No automatic retry or seek. Leave native controls available.
            });
          } catch {
            // Native controls remain authoritative if recovery is rejected.
          }
        }
      };
      windowView.requestAnimationFrame(observeClock);
    }
  }
  function discardRecovery(event: SyntheticEvent<HTMLVideoElement>) {
    // Real user native seeking always overrides a pending frame recovery.
    retained.current.delete(event.currentTarget);
  }
  function onNativeKeyDown(event: KeyboardEvent<HTMLVideoElement>) {
    // Keyboard seek overrides saved state; Space/Enter play keeps it.
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
      discardRecovery(event);
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
    if (details.open) {
      // The user sees the same mute selection on reopening; never autoplay,
      // seek, load, or replace an existing native media element.
      details.querySelectorAll("video").forEach(video => {
        const saved = retained.current.get(video);
        if (saved?.restoreMutedOnOpen && video.currentSrc === saved.source && video.paused) {
          video.muted = true;
          saved.restoreMutedOnOpen = false;
        }
      });
      return;
    }
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
              onPlay={onNativePlay} onPlaying={onNativePlay} onSeeking={discardRecovery}
              onKeyDown={onNativeKeyDown}>
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
