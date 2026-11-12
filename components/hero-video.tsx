'use client'

import { useEffect, useRef } from 'react'

const POSTER = '/videos/hero-poster.jpg'

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const sync = () => {
      if (reducedMotion.matches) {
        video.pause()
        video.currentTime = 0
      } else {
        video.play().catch(() => {})
      }
    }

    sync()
    reducedMotion.addEventListener('change', sync)
    return () => reducedMotion.removeEventListener('change', sync)
  }, [])

  return (
    <video
      ref={videoRef}
      aria-hidden="true"
      tabIndex={-1}
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
