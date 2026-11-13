import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { platformDictionary } from "@/lib/i18n/platform";
import type { Locale } from "@/lib/i18n/config";
export const pages = [
  "explore",
  "calendar",
  "analysis",
  "compare",
  "methodology",
  "about",
] as const;
export type Page = (typeof pages)[number];
export function PlatformShell({
  locale,
  page,
  children,
}: {
  locale: Locale;
  page: Page;
  children: React.ReactNode;
}) {
  const t = platformDictionary(locale);
  return (
    <>
      <header className="platform-header">
        <div className="platform-brand">
          <Link href="/" dir="ltr" className="font-display tracking-[.12em]">
            THERMION
          </Link>
          <LanguageSwitcher locale={locale} dict={getDictionary(locale).nav} />
        </div>
        <nav aria-label={getDictionary(locale).nav.label}>
          <Link href="/">{t.home}</Link>
          {pages.map((p) => (
            <Link
              key={p}
              href={"/" + p}
              aria-current={page === p ? "page" : undefined}
            >
              {t[p]}
            </Link>
          ))}
        </nav>
      </header>
      <main className="platform-main">
        <div className="page-heading">
          <p className="eyebrow">NASA FIRMS / MODIS + VIIRS</p>
          <h1>{t[page]}</h1>
          <p>{page === "calendar" ? t.calendarIntro : t.intro}</p>
        </div>
        {children}
        <footer className="platform-footer">
          <p>{t.notice}</p>
          <p>{t.attribution}</p>
          <a
            href="https://firms.modaps.eosdis.nasa.gov/api/"
            target="_blank"
            rel="noreferrer"
          >
            NASA FIRMS API ↗
          </a>
        </footer>
      </main>
    </>
  );
}
