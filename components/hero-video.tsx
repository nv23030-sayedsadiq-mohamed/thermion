"use client";

import { useEffect, useRef } from "react";

const POSTER = "/videos/hero-poster.jpg";
const SOURCES = [
  { src: "/videos/hero.webm", type: 'video/webm; codecs="vp9"' },
  { src: "/videos/hero.mp4", type: "video/mp4" },
];

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set muting before assigning a source. The browser's initial `muted`
    // property can differ from its SSR attribute during hydration.
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const controller = new AbortController();
    let disposed = false;
    let objectUrl: string | null = null;
    let lastTime = -1;
    let playPending = false;

    const shouldPlay = () =>
      !disposed &&
      !reducedMotion.matches &&
      document.visibilityState === "visible";

    const resume = () => {
      if (!shouldPlay() || !video.getAttribute("src") || playPending) return;
      if (video.ended) video.currentTime = 0;
      if (!video.paused) return;
      playPending = true;
      void video
        .play()
        .catch(() => {})
        .finally(() => {
          playPending = false;
        });
    };
    const sync = () => {
      lastTime = -1;
      if (!shouldPlay()) video.pause();
      else resume();
    };

    // WebKit needs direct MP4 streaming for reliable byte-range requests on iPad.
    // Other browsers use a local copy so proxy streaming cannot freeze loops.
    const webkit =
      /Apple/.test(navigator.vendor) ||
      /iPad|iPhone|iPod/.test(navigator.userAgent);
    const source = webkit
      ? SOURCES[1]
      : (SOURCES.find(({ type }) => video.canPlayType(type) !== "") ??
        SOURCES[1]);
    const loadSource = (src: string) => {
      if (disposed) return;
      video.src = src;
      video.load();
      resume();
    };

    const events = ["canplay", "pause", "ended", "stalled"] as const;
    events.forEach((event) => video.addEventListener(event, resume));
    reducedMotion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    document.addEventListener("pointerdown", resume, { passive: true });
    document.addEventListener("touchend", resume, { passive: true });
    document.addEventListener("keydown", resume);
    window.addEventListener("pageshow", sync);

    if (webkit) {
      loadSource(source.src);
    } else {
      void fetch(source.src, {
        signal: controller.signal,
        cache: "force-cache",
      })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.blob();
        })
        .then((blob) => {
          if (disposed) return;
          objectUrl = URL.createObjectURL(blob);
          loadSource(objectUrl);
        })
        .catch(() => loadSource(source.src));
    }

    const watchdog = window.setInterval(() => {
      if (!shouldPlay() || !video.currentSrc) return;
      if (video.paused || video.ended) resume();
      else if (video.readyState >= 2 && lastTime === video.currentTime) {
        const nextTime = video.currentTime + 0.05;
        if (Number.isFinite(video.duration) && video.duration > 0) {
          video.currentTime = nextTime >= video.duration - 0.25 ? 0 : nextTime;
        }
      }
      lastTime = video.currentTime;
    }, 1500);

    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(watchdog);
      events.forEach((event) => video.removeEventListener(event, resume));
      reducedMotion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      document.removeEventListener("pointerdown", resume);
      document.removeEventListener("touchend", resume);
      document.removeEventListener("keydown", resume);
      window.removeEventListener("pageshow", sync);
      video.pause();
      video.removeAttribute("src");
      video.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  return (
    <video
      ref={videoRef}
      aria-hidden="true"
      tabIndex={-1}
      autoPlay
      loop
      playsInline
      preload="auto"
      poster={POSTER}
      disablePictureInPicture
      className="pointer-events-none absolute inset-0 -z-20 size-full object-cover object-center"
    />
  );
}
