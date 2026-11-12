import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Dictionary } from '@/lib/i18n/dictionaries'
import { routes } from '@/lib/routes'

export function Hero({ dict }: { dict: Dictionary['hero'] }) {
  return (
    <section className="relative isolate flex min-h-svh items-center justify-center overflow-hidden">
      <Image
        src="/images/hero-wildfire.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-center"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-background/45" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(12,11,10,0.35)_0%,rgba(12,11,10,0)_60%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-background/60 to-transparent"
      />

      <div className="flex max-w-3xl flex-col items-center px-6 pb-10 pt-28 text-center">
        <h1
          dir="ltr"
          className="font-display text-[clamp(3.25rem,9vw,7.5rem)] font-normal leading-none tracking-[0.04em] text-foreground"
        >
          THERMION
        </h1>
        <p className="mt-5 text-balance text-xl font-normal text-foreground md:mt-6 md:text-2xl">
          {dict.tagline}
        </p>
        <p className="mt-5 max-w-md text-pretty text-sm leading-relaxed text-foreground/75 md:text-[15px]">
          {dict.description}
        </p>
        <Link
          href={routes.explore}
          className="group mt-9 inline-flex items-center gap-3 rounded-[2px] border border-accent/80 bg-background/40 px-4 py-2.5 text-sm text-foreground transition-colors hover:border-accent hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent md:px-5"
        >
          {dict.cta}
          <ArrowRight
            aria-hidden="true"
            className="size-3.5 text-accent transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
          />
        </Link>
      </div>
    </section>
  )
}
