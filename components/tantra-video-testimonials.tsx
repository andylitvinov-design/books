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
  // Only after an explicitly played decoder demonstrably stalls can its
  // original source be remounted. Reopening a disclosure alone never rebuilds.
  const [freshDecoder, setFreshDecoder] = useState<{source:string;time:number;token:number}|null>(null);

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
    // An explicit Play for another testimonial must release the competing
    // native decoder before WebKit/GStreamer tries to buffer two MP4s.
    // Never pause the selected video, seek, reload, autoplay, or touch its audio.
    // The companion may be offscreen; we still stop its old playback only if
    // it is actually running. This preserves its position for a later user Play.
    const disclosure=typeof video.closest==="function"?video.closest("details"):null;
    disclosure?.querySelectorAll("video").forEach(other=>{
      if(other!==video&&!other.paused)other.pause();
    });
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
        // The decoder may present two real frames after the saved-position
        // seek and then freeze again (verified WebKit RU390 04 Nov artifact).
        // Observe that second phase before calling playback genuinely healthy.
        // This is only armed after the user's explicit native Play and after
        // multiple actual preroll frames; never on disclosure opening.
        const onRestoredSeeked=()=>{
          const view=video.ownerDocument?.defaultView;
          const disclosure=typeof video.closest==="function"?video.closest("details"):null;
          if(!view || typeof view.requestAnimationFrame!=="function" ||
              video.paused || video.seeking || video.isConnected===false ||
              video.currentSrc!==saved.source || video.muted!==true ||
              (disclosure!==null&&!disclosure.open) ||
              Math.abs(video.currentTime-saved.time)>0.35)return;
          let monitoring=true, healthy=false;
          let startedAt:number|null=null,lastFrameAt:number|null=null;
          let lastMediaTime=saved.time-0.1;
          const frameAfterSeek:VideoFrameRequestCallback=(now,metadata)=>{
            if(!monitoring||video.paused||video.currentSrc!==saved.source)return;
            if(Number.isFinite(metadata.mediaTime)&&metadata.mediaTime>lastMediaTime+0.02){
              lastMediaTime=metadata.mediaTime;
              lastFrameAt=now;
              if(lastMediaTime>=saved.time+1.4){healthy=true;monitoring=false;return;}
            }
            try{video.requestVideoFrameCallback(frameAfterSeek)}
            catch{monitoring=false;}
          };
          const checkLateStall=(now:number)=>{
            if(!monitoring||healthy)return;
            if(video.paused||video.ended||video.isConnected===false ||
               video.currentSrc!==saved.source||video.muted!==true ||
               (disclosure!==null&&!disclosure.open)){monitoring=false;return;}
            if(startedAt===null)startedAt=now;
            if(now-startedAt>12000){monitoring=false;return;}
            if(video.seeking){view.requestAnimationFrame(checkLateStall);return;}
            if(lastFrameAt===null)lastFrameAt=now;
            if(now-lastFrameAt<1700){view.requestAnimationFrame(checkLateStall);return;}
            monitoring=false;
            // Resume the existing ONE bounded same-source reconstruction, not
            // a separate reload, another provider request or a retry loop.
            retained.current.set(video,{...saved,awaitingFrame:false,
              confirmedFrames:0,generation:(saved.generation??0)+1});
            onNativePlay({currentTarget:video} as SyntheticEvent<HTMLVideoElement>);
          };
          try{
            video.requestVideoFrameCallback(frameAfterSeek);
            view.requestAnimationFrame(checkLateStall);
          }catch{monitoring=false;}
        };
        const hasSeekEvents=typeof video.addEventListener==="function"&&
          typeof video.removeEventListener==="function";
        if(hasSeekEvents)video.addEventListener("seeked",onRestoredSeeked,{once:true});
        try { video.currentTime = saved.time; } catch {
          if(hasSeekEvents)video.removeEventListener("seeked",onRestoredSeeked);
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
    // WebKit/GStreamer may report playing without actually presenting a frame
    // after reopening. The old pause/play fallback also failed real WebKit.
    // Observe an actual user-triggered same-source stall before the single
    // muted-only decoder reconstruction below; real decoded frames and clock
    // advancement remain mandatory in the browser acceptance gate.
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
        retained.current.delete(video); // exactly one recovery after an explicit user Play
        // WebKit artifact 13349375114 proves that a PAUSE→PLAY on the same
        // backend emits "playing" but never delivers a subsequent frame.
        // Reconstruct the SAME HTTP-backed source only if a muted, visible,
        // already user-activated decoder is genuinely stuck for 1.7 seconds.
        // No reload on disclosure open, no unsolicited audible playback.
        if (video.muted !== true || video.readyState < 2 ||
            typeof video.addEventListener !== "function" ||
            typeof video.removeEventListener !== "function" ||
            typeof video.load !== "function") return;
        const disclosure = typeof video.closest === "function" ? video.closest("details") : null;
        const resumeAt = Math.max(saved.time, startedTime);
        const startAtReload = windowView.performance?.now?.() ?? 0;
        const valid = () => video.isConnected !== false &&
          video.currentSrc === saved.source && video.muted === true &&
          (disclosure === null || disclosure.open) &&
          (!windowView.performance?.now || windowView.performance.now() - startAtReload < 12000);
        if (!Number.isFinite(resumeAt) || resumeAt <= 0 || !valid()) return;
        let pending = true;
        const clear = () => {
          pending = false;
          video.removeEventListener("loadedmetadata", onMetadata);
          video.removeEventListener("seeked", onSeeked);
          video.removeEventListener("loadeddata", onDecodedWithoutSeek);
          video.removeEventListener("canplay", onDecodedWithoutSeek);
        };
        const onSeeked = () => {
          if (!pending) return;
          clear();
          // Do not override a later user seek or a hidden/unmuted video.
          if (!valid() || !video.paused || video.seeking ||
              Math.abs(video.currentTime - resumeAt) > 0.35) return;
          try {
            void video.play().catch(() => {
              // Native controls remain available; no second automatic attempt.
            });
          } catch {
            // A rejected real-media play must not be misreported as success.
          }
        };
        // On WebKit, load() can retain the DOM's saved currentTime. Assigning
        // that same time is then a no-op: neither seeking nor seeked fires.
        // Resume a user's explicit muted Play only once the SAME source has
        // decoded a real frame at the retained position. The browser release
        // test still requires new advancing decoded frames and media time.
        const onDecodedWithoutSeek = () => {
          if (!pending || !valid() || !video.paused || video.seeking ||
              video.readyState < 2 || video.videoWidth <= 0 ||
              video.videoHeight <= 0 ||
              Math.abs(video.currentTime - resumeAt) > 0.05) return;
          onSeeked(); // same-source, decoded, already-at-position path
        };
        const onMetadata = () => {
          if (!pending || !valid() || !Number.isFinite(video.duration) ||
              resumeAt >= video.duration) { clear(); return; }
          try {
            video.addEventListener("seeked", onSeeked, { once: true });
            video.addEventListener("loadeddata", onDecodedWithoutSeek, { once: true });
            video.addEventListener("canplay", onDecodedWithoutSeek, { once: true });
            video.currentTime = resumeAt; // exact retained position, no backward offset
          } catch { clear(); }
        };
        try {
          video.addEventListener("loadedmetadata", onMetadata, { once: true });
          video.pause();
          // preload=none otherwise may decline metadata after load().
          // This fetches metadata only after a demonstrated stalled user Play.
          video.preload = "metadata";
          video.load();
          // A same-element WebKit/GStreamer load may still keep the backend
          // frozen. One bounded last resort mounts a truly fresh native video
          // only after the original user's muted Play remains stalled. Never
          // force a new play on disclosure open, an unmuted source, or a seek.
          if (typeof windowView.setTimeout === "function") {
            windowView.setTimeout(() => {
              if (video.isConnected === false || video.currentSrc !== saved.source ||
                  video.muted !== true || video.seeking || video.ended ||
                  (disclosure !== null && !disclosure.open)) return;
              if (Number.isFinite(video.currentTime) && video.currentTime > resumeAt + 0.22 &&
                  video.readyState >= 2 &&
                  (video.getVideoPlaybackQuality?.().totalVideoFrames ?? 0) > 0) return;
              setFreshDecoder(previous => previous?.source === saved.source ? previous :
                {source:saved.source,time:resumeAt,token:Date.now()});
            }, 6800);
          }
        } catch { clear(); }
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
        {props.videos.map((video, i) => {
          const replacement = freshDecoder?.source === video.src ? freshDecoder : null;
          return (
          <figure className="tantra-review-video" key={video.src}>
            <video key={replacement ? `${video.src}:fresh-${replacement.token}` : video.src}
              controls playsInline preload={replacement ? "auto" : "none"} poster={video.poster ?? undefined}
              onLoadStart={onNativeLoadStart} onLoadedMetadata={event => {
                if (!replacement) { onNativeMetadata(event); return; }
                const player = event.currentTarget;
                const disclosure = player.closest("details");
                if (!player.isConnected || !disclosure?.open ||
                    player.currentSrc !== replacement.source ||
                    !Number.isFinite(player.duration) || replacement.time >= player.duration) return;
                // Fresh source, same retained position, muted, and only after
                // a proven stalled explicit Play. True frame/clock progress is
                // still required by WebKit browser acceptance.
                player.muted = true;
                player.addEventListener("seeked", () => {
                  if (!player.isConnected || !disclosure.open ||
                      player.currentSrc !== replacement.source ||
                      player.seeking || player.ended || !player.paused ||
                      Math.abs(player.currentTime - replacement.time) > 0.35) return;
                  void player.play().catch(() => {/* Native controls remain available. */});
                }, {once:true});
                try {player.currentTime = replacement.time;}
                catch {/* Native controls remain available if a seek is rejected. */}
              }}
              onPlay={onNativePlay} onPlaying={onNativePlay} onSeeking={discardRecovery}
              onKeyDown={onNativeKeyDown}>
              <source src={video.src} type={video.type} />
            </video>
            <figcaption>{props.nativeLabel} {i + 1}{props.nativeSuffix}</figcaption>
          </figure>
          );
        })}
        <figure className="tantra-review-video">
          <AcademyVideoPlayer key={youtubeSession} youtubeId="qM_nFUkYJ1k" title={props.youtubeTitle} />
          <figcaption>{props.youtubeTitle}</figcaption>
        </figure>
      </div>
    </details>
  );
}
