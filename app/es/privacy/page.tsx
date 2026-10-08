import Link from "next/link";
import { spanishMetadata } from "@/lib/spanish-metadata";
export const metadata = spanishMetadata("/es/privacy", "Privacidad — Holistic House", "Cómo usa Holistic House la información de cuentas y evaluaciones.");
export default function SpanishPrivacyPage() {
 return <main className="legal-page" lang="es">
  <Link href="/es" className="legal-page__brand">Holistic House</Link>
  <h1>Privacidad</h1>
  <p>Holistic House ofrece materiales educativos, herramientas de desarrollo personal y funciones opcionales vinculadas a una cuenta.</p>
  <h2>Acceso con Google</h2>
  <p>Si decides iniciar sesión con Google, usamos el perfil y la dirección de correo que Google proporciona para autenticarte, crear tu cuenta de Holistic House y protegerla. No solicitamos acceso a Google Drive, Calendar, tus contactos ni otros contenidos de Google.</p>
  <h2>Evaluaciones e información de cuenta</h2>
  <p>Las respuestas y los registros de la cuenta se usan para prestar las funciones de evaluación, historial y cuenta que solicites. La aplicación aplica controles de acceso y almacenamiento cifrado a los registros privados de evaluaciones.</p>
  <h2>Tus opciones</h2>
  <p>Puedes usar las funciones disponibles para visitantes sin iniciar sesión con Google cuando se ofrezca esa opción. Puedes solicitar la eliminación de tu cuenta desde el apartado de privacidad; este proceso elimina los datos asociados de la aplicación de acuerdo con el procedimiento mostrado.</p>
  <h2>Alcance de la información</h2>
  <p>El contenido y las evaluaciones de Holistic House sirven para la reflexión y la educación. No constituyen asesoramiento, diagnóstico o tratamiento médico ni atención de emergencia.</p>
  <p><Link href="/es/terms">Leer las Condiciones de uso</Link></p>
 </main>;
}
