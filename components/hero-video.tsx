'use client'

import { useEffect, useRef } from 'react'

const POSTER = '/videos/hero-poster.jpg'

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // React does not reliably set `muted` on the DOM node during hydration, and
    // browsers block autoplay of unmuted video, so enforce it imperatively.
    video.muted = true
    video.defaultMuted = true
    video.setAttribute('muted', '')

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const sync = () => {
      if (reducedMotion.matches) {
        video.pause()
        return
      }
      if (video.paused) video.play().catch(() => {})
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync()
    }

    sync()
    video.addEventListener('canplay', sync)
    reducedMotion.addEventListener('change', sync)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      video.removeEventListener('canplay', sync)
      reducedMotion.removeEventListener('change', sync)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <video
      ref={videoRef}
      aria-hidden="true"
      tabIndex={-1}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster={POSTER}
      disablePictureInPicture
      className="pointer-events-none absolute inset-0 -z-20 size-full object-cover object-center"
    >
      <source src="/videos/hero.webm" type="video/webm" />
      <source src="/videos/hero.mp4" type="video/mp4" />
    </video>
  )
}
