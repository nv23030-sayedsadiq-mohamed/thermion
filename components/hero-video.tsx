'use client'

import { useEffect, useRef, useState } from 'react'

const POSTER = '/videos/hero-poster.jpg'

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = true
    video.defaultMuted = true
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let disposed = false

    const resume = () => {
      if (disposed || reducedMotion.matches || document.visibilityState !== 'visible') return
      if (video.paused) {
        void video.play().catch(() => {
          if (!disposed) setPlaying(false)
        })
      }
    }
    const sync = () => {
      if (reducedMotion.matches || document.visibilityState !== 'visible') {
        video.pause()
        setPlaying(false)
      } else resume()
    }
    const showVideo = () => setPlaying(true)
    const showPoster = () => setPlaying(false)

    video.addEventListener('playing', showVideo)
    video.addEventListener('pause', showPoster)
    video.addEventListener('error', showPoster)
    video.addEventListener('canplay', resume)
    reducedMotion.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    // Retry within a user gesture when Safari has declined muted autoplay.
    document.addEventListener('pointerdown', resume, { passive: true })
    document.addEventListener('keydown', resume)
    sync()

    return () => {
      disposed = true
      video.removeEventListener('playing', showVideo)
      video.removeEventListener('pause', showPoster)
      video.removeEventListener('error', showPoster)
      video.removeEventListener('canplay', resume)
      reducedMotion.removeEventListener('change', sync)
      document.removeEventListener('visibilitychange', sync)
      document.removeEventListener('pointerdown', resume)
      document.removeEventListener('keydown', resume)
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-center"
      style={{ backgroundImage: `url('${POSTER}')` }}
    >
      <video
        ref={videoRef}
        tabIndex={-1}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={POSTER}
        disablePictureInPicture
        onPlaying={() => setPlaying(true)}
        className={`absolute inset-0 size-full object-cover object-center ${playing ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Let Safari stream the MP4 directly, including byte-range requests. */}
        <source src="/videos/hero.mp4" type="video/mp4" />
        <source src="/videos/hero.webm" type="video/webm" />
      </video>
    </div>
  )
}
