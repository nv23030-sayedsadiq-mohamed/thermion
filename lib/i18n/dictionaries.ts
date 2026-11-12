import type { Locale } from './config'

export type Dictionary = {
  meta: { title: string; description: string }
  nav: {
    label: string
    home: string
    explore: string
    language: string
    switchTo: { en: string; ar: string }
  }
  hero: {
    tagline: string
    description: string
    cta: string
  }
  placeholder: {
    explore: { title: string; body: string }
    back: string
  }
}

const en: Dictionary = {
  meta: {
    title: 'THERMION — Satellite Wildfire Monitoring',
    description:
      'Satellite-powered wildfire monitoring and environmental intelligence through NASA Earth observation data.',
  },
  nav: {
    label: 'Main navigation',
    home: 'Home',
    explore: 'Explore',
    language: 'Language',
    switchTo: { en: 'Switch to English', ar: 'Switch to Arabic' },
  },
  hero: {
    tagline: 'Understanding Earth. Detecting Change.',
    description:
      'Satellite-powered wildfire monitoring and environmental intelligence through NASA Earth observation data.',
    cta: 'Explore Platform',
  },
  placeholder: {
    explore: {
      title: 'Explore',
      body: 'The wildfire monitoring platform is in development. It will be built on NASA MODIS and VIIRS Earth observation data once the datasets become available.',
    },
    back: 'Back to Home',
  },
}

const ar: Dictionary = {
  meta: {
    title: 'ثيرميون — رصد حرائق الغابات عبر الأقمار الصناعية',
    description:
      'رصد حرائق الغابات والاستخبارات البيئية بالاعتماد على الأقمار الصناعية وبيانات رصد الأرض من ناسا.',
  },
  nav: {
    label: 'التنقل الرئيسي',
    home: 'الرئيسية',
    explore: 'استكشف',
    language: 'اللغة',
    switchTo: { en: 'التبديل إلى الإنجليزية', ar: 'التبديل إلى العربية' },
  },
  hero: {
    tagline: 'نفهم الأرض. نرصد التغيّر.',
    description:
      'رصد حرائق الغابات والاستخبارات البيئية بالاعتماد على الأقمار الصناعية وبيانات رصد الأرض من ناسا.',
    cta: 'استكشف المنصة',
  },
  placeholder: {
    explore: {
      title: 'استكشف',
      body: 'منصة رصد حرائق الغابات قيد التطوير، وستُبنى على بيانات رصد الأرض من مستشعرَي MODIS وVIIRS التابعين لناسا فور إتاحتها.',
    },
    back: 'العودة إلى الرئيسية',
  },
}

const dictionaries: Record<Locale, Dictionary> = { en, ar }

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}
