'use client'

import { useEffect, useRef } from 'react'

const POSTER = '/videos/hero-poster.jpg'
const SOURCES = [
  { src: '/videos/hero.webm', type: 'video/webm; codecs="vp9"' },
  { src: '/videos/hero.mp4', type: 'video/mp4; codecs="avc1.42E01E"' },
]
const STALL_CHECK_MS = 1500

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = true
    video.defaultMuted = true
    video.setAttribute('muted', '')

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const controller = new AbortController()
    let objectUrl: string | null = null
    let lastTime = -1
    let disposed = false

    const shouldPlay = () =>
      !disposed && !reducedMotion.matches && document.visibilityState === 'visible'

    const resume = () => {
      if (!shouldPlay() || !video.currentSrc) return
      if (video.ended) video.currentTime = 0
      if (video.paused) video.play().catch(() => {})
    }

    const sync = () => {
      if (reducedMotion.matches) video.pause()
      else resume()
    }

    // Playing from an in-memory Blob means looping never waits on the network,
    // which is what caused the freezes when streaming through the preview proxy.
    const source =
      SOURCES.find(({ type }) => video.canPlayType(type) !== '') ?? SOURCES[1]

    fetch(source.src, { signal: controller.signal, cache: 'force-cache' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.blob()
      })
      .then((blob) => {
        if (disposed) return
        objectUrl = URL.createObjectURL(blob)
        video.src = objectUrl
        video.load()
        resume()
      })
      .catch(() => {
        if (disposed) return
        video.src = source.src
        video.load()
        resume()
      })

    // Some browsers drop out of `loop` or freeze on a decoder hiccup without
    // firing an event, so check that time keeps advancing and nudge it if not.
    const watchdog = window.setInterval(() => {
      if (!shouldPlay() || !video.currentSrc) return
      if (video.paused || video.ended) {
        resume()
      } else if (video.readyState >= 2 && video.currentTime === lastTime) {
        const duration = video.duration || 0
        video.currentTime =
          duration && video.currentTime > duration - 0.25 ? 0 : video.currentTime + 0.05
        video.play().catch(() => {})
      }
      lastTime = video.currentTime
    }, STALL_CHECK_MS)

    const events = ['canplay', 'pause', 'ended', 'stalled', 'suspend', 'waiting'] as const
    events.forEach((e) => video.addEventListener(e, resume))
    reducedMotion.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)

    return () => {
      disposed = true
      controller.abort()
      window.clearInterval(watchdog)
      events.forEach((e) => video.removeEventListener(e, resume))
      reducedMotion.removeEventListener('change', sync)
      document.removeEventListener('visibilitychange', sync)
      video.removeAttribute('src')
      video.load()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
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
    />
  )
}
