import { Hero } from '@/components/hero'
import { SiteHeader } from '@/components/site-header'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { getLocale } from '@/lib/i18n/get-locale'

export default async function HomePage() {
  const locale = await getLocale()
  const dict = getDictionary(locale)

  return (
    <>
      <SiteHeader locale={locale} dict={dict} />
      <main>
        <Hero dict={dict.hero} />
      </main>
    </>
  )
}
