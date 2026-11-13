import { PlatformShell } from "@/components/platform/shell";
import { Documentation } from "@/components/platform/documentation";
import { getLocale } from "@/lib/i18n/get-locale";
export default async function Page() {
  const locale = await getLocale();
  return (
    <PlatformShell locale={locale} page="about">
      <Documentation locale={locale} page="about" />
    </PlatformShell>
  );
}
