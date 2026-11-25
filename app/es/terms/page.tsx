import Link from "next/link";
import { metadataBaseFor } from "@/data/site-metadata";
export const metadata = { metadataBase: metadataBaseFor(), title: "Condiciones de uso — Holistic House", description: "Condiciones para utilizar los materiales y las funciones de cuenta de Holistic House.", alternates: { canonical: "/es/terms", languages: { es: "/es/terms", en: "/terms" } } };
export default function SpanishTermsPage() {
 return <main className="legal-page" lang="es">
  <Link href="/es" className="legal-page__brand">Holistic House</Link>
  <h1>Condiciones de uso</h1>
  <p>Utiliza los materiales y las funciones de cuenta de Holistic House de manera respetuosa y exclusivamente para fines personales lícitos. Mantén privado tu método de inicio de sesión y el acceso a tu cuenta.</p>
  <h2>Finalidad educativa</h2>
  <p>Los materiales, las evaluaciones y los informes sirven para la reflexión y la educación. No constituyen asesoramiento, diagnóstico o tratamiento médico ni atención de emergencia. Solicita ayuda profesional cualificada o atención de urgencia cuando sea necesario.</p>
  <h2>Tu información</h2>
  <p>Eres responsable de la información que decidas introducir. No compartas datos privados de otra persona sin su permiso.</p>
  <h2>Disponibilidad</h2>
  <p>Podemos mejorar, modificar o suspender funciones para proteger a los usuarios y mantener el servicio.</p>
  <p><Link href="/es/privacy">Leer el aviso de privacidad</Link></p>
 </main>;
}
