import {HomeDialogFirst} from "@/components/home-dialog-first";
import {spanishMetadata} from "@/lib/spanish-metadata";
export const metadata=spanishMetadata('/es',
  'Holistic House | Pregunta, explora y crea',
  'Empieza una conversación con Ali, explora cursos y recibe apoyo en Holistic House.');
export default function SpanishHomePage(){
  return <HomeDialogFirst locale="es"/>;
}
