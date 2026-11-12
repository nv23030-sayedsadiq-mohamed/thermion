export const routes = {
  home: '/',
  explore: '/explore',
  dashboard: '/explore/dashboard',
  fireMap: '/explore/fire-map',
  fireCalendar: '/explore/fire-calendar',
  regionalAnalysis: '/explore/regional-analysis',
  about: '/about',
} as const

export type RouteKey = keyof typeof routes

export const primaryNav = [
  { key: 'home', href: routes.home },
  { key: 'explore', href: routes.explore },
] as const satisfies ReadonlyArray<{ key: 'home' | 'explore'; href: string }>
