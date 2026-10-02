import type { Book } from '@/data/library';
type BookCopy = { title: string; description: string; category: string };
// Translate the complete catalog copy. The archived books are original editions,
// not silently replaced by translations or summaries.
export const spanishBooks: Record<string, BookCopy> = {
  'alchemy-homeopathy-foundations': { title: 'Libro 01. Homeopatía: fundamentos y método', description: 'Volumen fundacional de Alquimia del Alma que presenta el enfoque, sus principios básicos y la lógica inicial del método.', category: 'Alquimia del Alma' },
  'alchemy-homeopathy-remedies': { title: 'Libro 02. Remedios homeopáticos y perfiles', description: 'Continuación práctica centrada en los remedios, sus perfiles y la consulta aplicada del material.', category: 'Alquimia del Alma' },
  'alchemy-naturopathy-hormones': { title: 'Libro 03. Naturopatía: suplementos, minerales y apoyo hormonal', description: 'Volumen de naturopatía dedicado al apoyo, los suplementos y el acompañamiento desde una perspectiva sistémica.', category: 'Alquimia del Alma' },
  'alchemy-naturopathy-oils': { title: 'Libro 04. Naturopatía: aceites esenciales, hierbas y vehículos naturales', description: 'Volumen sobre hierbas, aceites esenciales y herramientas naturales de apoyo dentro de la serie Alquimia del Alma.', category: 'Alquimia del Alma' },
  'alchemy-bach-foundations': { title: 'Libro 05. Esencias florales de Bach: introducción y práctica', description: 'Introducción a las esencias florales de Bach, con un marco práctico y una presentación estructurada del tema.', category: 'Alquimia del Alma' },
  'alchemy-bach-cards': { title: 'Libro 06. Esencias florales de Bach: perfiles', description: 'Continuación de la sección de Bach con perfiles breves y material de consulta.', category: 'Alquimia del Alma' },
  'alchemy-brain-theory': { title: 'Libro 07. Trabajo con el cerebro: teoría, modelos y neurofisiología', description: 'Parte teórica de la serie sobre el trabajo con el cerebro, centrada en modelos y fundamentos neurofisiológicos.', category: 'Alquimia del Alma' },
  'alchemy-brain-protocols': { title: 'Libro 08. Trabajo con el cerebro: evaluación y protocolos', description: 'Parte aplicada de la serie sobre el trabajo con el cerebro: evaluación, protocolos y marcos de trabajo.', category: 'Alquimia del Alma' },
  'alchemy-services-workflow': { title: 'Libro 09. Servicios, proceso de trabajo y acompañamiento', description: 'Guía del enfoque del proyecto, los formatos de servicio, el proceso de acompañamiento y el marco de trabajo publicado.', category: 'Alquimia del Alma' },
  'dao-alchemy-intro': { title: '1. Introducción a la alquimia taoísta', description: 'Primer volumen de la serie taoísta, con una introducción y un mapa general del tema.', category: 'Tradición taoísta' },
  'dao-tradition-temples-symbols': { title: '2. Tradición taoísta, templos y mundo simbólico', description: 'Libro sobre la tradición taoísta, los templos y el mapa simbólico del mundo taoísta.', category: 'Tradición taoísta' },
  'dao-magic-basics': { title: '3. Magia taoísta: fundamentos', description: 'Volumen de fundamentos de la magia taoísta dentro de la biblioteca del proyecto.', category: 'Tradición taoísta' },
  'dao-talismans-symbols': { title: '4. Talismanes, caracteres y signos sagrados', description: 'Libro sobre talismanes, caracteres chinos y simbolismo sagrado en la serie taoísta.', category: 'Tradición taoísta' },
  'dao-rituals-altars': { title: '5. Rituales, altares e invocaciones', description: 'Material sobre la práctica ritual, los altares y las invocaciones en el contexto taoísta.', category: 'Tradición taoísta' },
  'dao-yijing-predictions': { title: '6. Yijing y adivinación taoísta', description: 'Volumen dedicado al Yijing y a la adivinación taoísta.', category: 'Tradición taoísta' },
  'dao-healing-basics': { title: '7. Sanación taoísta: fundamentos', description: 'Libro sobre las ideas fundamentales de la sanación taoísta y los principios básicos de esta línea de estudio.', category: 'Tradición taoísta' },
  'dao-wuxing-five-elements': { title: '8. Wuxing: cinco elementos y estados', description: 'Libro sobre el modelo Wuxing, los cinco elementos y los estados dentro de la serie taoísta.', category: 'Tradición taoísta' },
  'dao-wuxing-model-steps': { title: '9. Modelo DAO Wuxing y etapas del desarrollo', description: 'Libro sobre el modelo DAO Wuxing y las etapas del desarrollo como parte de la biblioteca taoísta.', category: 'Tradición taoísta' },
  'dao-practicum-cases-remedies': { title: '10. Práctica: evaluación, casos y remedios', description: 'Volumen práctico con material de evaluación, casos y notas sobre remedios.', category: 'Tradición taoísta' },
  'maya-egregor-gods': { title: 'Tradición maya y azteca: egregor y dioses', description: 'El egregor de la tradición, las fuerzas divinas, sus canales y materiales originales seleccionados por el autor.', category: 'Tradición maya' },
  'maya-calendar': { title: 'Energías del calendario maya', description: 'Ciclo dedicado al calendario, el tiempo, los períodos y las energías de los días mayas.', category: 'Tradición maya' },
  'maya-exorcism': { title: 'Exorcismo en la tradición maya: sintonizaciones y energías', description: 'Sintonizaciones, canales, ayudantes y formas de trabajo con energías mayas y aztecas descritas por el autor.', category: 'Tradición maya' },
  'maya-mysteries': { title: 'Misterios mayas', description: 'Mitología, Xibalbá, iniciación, rituales, lugares sagrados, dobles y modelos arquetípicos desarrollados por el autor.', category: 'Tradición maya' },
};
export function spanishBookText(book: Book): BookCopy {
  const copy = spanishBooks[book.id];
  if (!copy) throw new Error('Missing Spanish book catalog translation');
  return copy;
}
