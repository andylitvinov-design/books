import type { Metadata } from "next";

// PsiAlchemy is a distinct educational remedy-library installation.
// It must not replace the Holistic House app on public service or Cabinet pages.
export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  applicationName: "PsiAlchemy",
  appleWebApp: { capable: true, title: "PsiAlchemy", statusBarStyle: "default" },
};

export default function PsiAlchemyHomeopathyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
