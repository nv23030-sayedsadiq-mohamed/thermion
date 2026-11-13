import { PlatformShell } from "@/components/platform/shell";
import { Workspace } from "@/components/platform/workspace";
import { getLocale } from "@/lib/i18n/get-locale";
export default async function Page() {
  const locale = await getLocale();
  return (
    <PlatformShell locale={locale} page="explore">
      <Workspace locale={locale} page="explore" />
    </PlatformShell>
  );
}
