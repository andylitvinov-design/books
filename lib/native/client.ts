'use client'

declare global {
  interface Window {
    Capacitor?: { isNativePlatform?: () => boolean }
  }
}

export const nativeSavedRemediesKey = 'psialchemy-public-saved-remedies-v1'

export function isNativePsiAlchemy() {
  return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true
}

export async function sharePublicRemedyUrl(url: string, title: string) {
  if (!isNativePsiAlchemy()) return false
  const { Share } = await import('@capacitor/share')
  await Share.share({ title, url, dialogTitle: title })
  return true
}

export async function openExternalNativeUrl(url: string) {
  if (!isNativePsiAlchemy()) return false
  const { Browser } = await import('@capacitor/browser')
  await Browser.open({ url })
  return true
}

export async function readNativeSavedRemedies() {
  if (!isNativePsiAlchemy()) return [] as string[]
  const { Preferences } = await import('@capacitor/preferences')
  const result = await Preferences.get({ key: nativeSavedRemediesKey })
  try { return Array.isArray(JSON.parse(result.value || '[]')) ? JSON.parse(result.value || '[]') : [] } catch { return [] }
}

export async function writeNativeSavedRemedies(savedSlugs: string[]) {
  if (!isNativePsiAlchemy()) return
  const { Preferences } = await import('@capacitor/preferences')
  await Preferences.set({ key: nativeSavedRemediesKey, value: JSON.stringify(savedSlugs) })
}
