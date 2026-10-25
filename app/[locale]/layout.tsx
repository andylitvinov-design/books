import type { Metadata } from "next";

// Match the browser's installation language across every public and private
// locale route. The separate homeopathy layout overrides this for PsiAlchemy.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    manifest: locale === "ru"
      ? "/holistic-house-app-ru.webmanifest"
      : "/holistic-house-app.webmanifest",
  };
}

export default function LocalizedHolisticLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
