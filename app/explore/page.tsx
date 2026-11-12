import Link from 'next/link'
import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { getLocale } from '@/lib/i18n/get-locale'

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getLocale())
  return { title: `${dict.placeholder.explore.title} — THERMION` }
}

export default async function ExplorePage() {
  const locale = await getLocale()
  const dict = getDictionary(locale)

  return (
    <>
      <SiteHeader locale={locale} dict={dict} />
      <main className="flex min-h-svh items-center justify-center px-6">
        <div className="max-w-lg text-center">
          <h1 className="font-display text-4xl tracking-wide text-foreground md:text-5xl">
            {dict.placeholder.explore.title}
          </h1>
          <p className="mt-5 text-pretty text-sm leading-relaxed text-foreground/70 md:text-[15px]">
            {dict.placeholder.explore.body}
          </p>
          <Link
            href="/"
            className="mt-9 inline-flex rounded-[2px] border border-accent/80 px-5 py-2.5 text-sm text-foreground transition-colors hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            {dict.placeholder.back}
          </Link>
        </div>
      </main>
    </>
  )
}
