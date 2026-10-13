// The signed-in Cabinet installs as its own Holistic House PWA on iOS/Android.
// This does not replace the public PsiAlchemy remedy-library manifest.
export const metadata = {
  manifest: '/holistic-house-app.webmanifest',
  appleWebApp: { capable: true, title: 'Holistic House', statusBarStyle: 'black-translucent' },
  applicationName: 'Holistic House',
}
export default function CabinetLayout({children}) { return children }
