import { LanguageSwitcher } from '@/components/language-switcher'
import { NavLinks } from '@/components/nav-links'
import type { Locale } from '@/lib/i18n/config'
import type { Dictionary } from '@/lib/i18n/dictionaries'
import Link from 'next/link'

export function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="flex items-center justify-between gap-6 px-6 py-6 md:px-10 md:py-9">
        <Link
          href="/"
          dir="ltr"
          className="font-display text-lg tracking-[0.12em] text-foreground md:text-[22px]"
        >
          THERMION
        </Link>
        <nav aria-label={dict.nav.label} className="flex items-center gap-4 md:gap-5">
          <NavLinks dict={dict.nav} />
          <span aria-hidden="true" className="h-3.5 w-px bg-foreground/40" />
          <LanguageSwitcher locale={locale} dict={dict.nav} />
        </nav>
      </div>
    </header>
  )
}
