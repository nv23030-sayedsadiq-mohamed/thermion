'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setLocale } from '@/lib/i18n/actions'
import type { Locale } from '@/lib/i18n/config'
import type { Dictionary } from '@/lib/i18n/dictionaries'
import { cn } from '@/lib/utils'

const options: { locale: Locale; label: string }[] = [
  { locale: 'ar', label: 'AR' },
  { locale: 'en', label: 'EN' },
]

export function LanguageSwitcher({
  locale,
  dict,
}: {
  locale: Locale
  dict: Dictionary['nav']
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function select(next: Locale) {
    if (next === locale) return
    startTransition(async () => {
      await setLocale(next)
      router.refresh()
    })
  }

  return (
    <div
      role="group"
      aria-label={dict.language}
      dir="ltr"
      className={cn('flex items-center gap-1.5', isPending && 'opacity-70')}
    >
      {options.map((option, index) => (
        <span key={option.locale} className="flex items-center gap-1.5">
          {index > 0 && (
            <span aria-hidden="true" className="h-3.5 w-px bg-foreground/40" />
          )}
          <button
            type="button"
            lang={option.locale}
            onClick={() => select(option.locale)}
            aria-pressed={option.locale === locale}
            aria-label={dict.switchTo[option.locale]}
            className={cn(
              'font-sans text-[13px] tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
              option.locale === locale
                ? 'text-accent'
                : 'text-foreground/70 hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        </span>
      ))}
    </div>
  )
}
