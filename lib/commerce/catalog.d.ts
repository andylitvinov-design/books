export type ServiceLocale = 'en' | 'ru' | 'es'
export type PublicServiceProduct = {
  id: string
  title: string
  description: string
  amountMinor: number
  currency: string
  durationMinutes: number
  kind: string
}
export function serviceLocale(value: unknown): ServiceLocale
export function publicServiceCatalog(locale?: string): PublicServiceProduct[]
export function formatServiceAmount(amountMinor: number, locale?: string): string
