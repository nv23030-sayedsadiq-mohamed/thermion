'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment } from 'react'
import type { Dictionary } from '@/lib/i18n/dictionaries'
import { primaryNav } from '@/lib/routes'
import { cn } from '@/lib/utils'

export function NavLinks({ dict }: { dict: Dictionary['nav'] }) {
  const pathname = usePathname()

  return (
    <ul className="flex items-center gap-4 md:gap-5">
      {primaryNav.map((item, index) => {
        const active =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        return (
          <Fragment key={item.key}>
            {index > 0 && (
              <li aria-hidden="true" className="h-3.5 w-px bg-foreground/40" />
            )}
            <li>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent md:text-sm',
                  active ? 'text-accent' : 'text-foreground/90 hover:text-foreground',
                )}
              >
                {dict[item.key]}
              </Link>
            </li>
          </Fragment>
        )
      })}
    </ul>
  )
}
