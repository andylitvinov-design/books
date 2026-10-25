import { PublicSiteHeader } from "@/components/public-site-header";
import { AlchemyExampleReport } from "@/components/alchemy-example-report";

export const metadata = {title:"Alquimia del Alma — informe de ejemplo | Holistic House",robots:{index:false,follow:true}};
export default function SpanishAlchemyExampleReportPage(){
 return <><PublicSiteHeader locale="es"/><AlchemyExampleReport locale="es"/></>;
}
