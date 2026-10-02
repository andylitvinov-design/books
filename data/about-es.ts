// Complete Spanish translation of the published English About biography.
// Names, dates, qualifications and scope are preserved; no new health claims.
import type { aboutBiography } from './about-biography';

export const aboutEs: (typeof aboutBiography)['en'] = {
  meta: {
    title: 'Sobre mí — Andy y Holistic House',
    description: 'Conoce a Andy y su recorrido por el trabajo personal profundo, la conciencia corporal, los arquetipos, las tradiciones de los templos y el Reiki.',
  },
  eyebrow: 'Déjame presentarme',
  photoAlt: 'Andy ante un escritorio antiguo en una biblioteca',
  intro: [
    'Déjame presentarme.',
    'Soy Andy. Facilito prácticas individuales y grupales que integran arquetipos, imágenes interiores, conciencia corporal y tradiciones de los templos.',
    'Crecí en Ucrania y he vivido en distintos países del mundo.',
  ],
  sections: [
    {
      heading: 'Experiencia',
      items: [
        '24 años facilitando procesos de crecimiento personal y grupal, desde 2002.',
        '22 años explorando y facilitando prácticas transpersonales basadas en tradiciones de los templos, desde 2004, entre ellas Tantra Reiki, Kundalini Reiki y Reiki Rúnico.',
        '15 años de experiencia con constelaciones familiares y empresariales, desde 2011.',
      ],
    },
    {
      heading: 'Especializaciones y formación',
      items: [
        '1. Dreams Alive / trabajo con imágenes guiadas: exploración de tensiones y experiencias del niño interior mediante imágenes y material inconsciente.',
        '2. Trabajo corporal: exploración de patrones del desarrollo temprano y del niño interior mediante la conciencia corporal y el contacto consciente, siempre con consentimiento.',
        '3. Trabajo arquetípico de los templos: exploración de objetivos personales y empresariales mediante constelaciones sistémicas y arquetipos de las tradiciones de los templos.',
        '4. Alquimia taoísta: exploración de experiencias de la mente y el cuerpo mediante modelos energéticos y simbólicos tradicionales, incluido mi marco educativo de Homeopatía Psíquica.',
      ],
    },
    {
      heading: 'Talleres de tantra',
      paragraphs: [
        'Desde 2004 he participado en talleres de tantra de distintas escuelas y tradiciones de todo el mundo. Entre los enfoques que he conocido a lo largo de los años, el de ISTA ha sido uno de los más fascinantes y transformadores para mí.',
        'Aun así, mi principal interés sigue siendo el trabajo personal profundo.',
      ],
    },
    {
      heading: 'Imaginación guiada',
      paragraphs: [
        'Una parte central de mi formación ha sido la imaginación afectiva guiada de Hanscarl Leuner.',
        'Este enfoque tiende un puente entre la tradición de la psicología profunda de Jung y los enfoques psicoanalíticos de Freud.',
      ],
    },
    {
      heading: 'Trabajo corporal',
      paragraphs: [
        'En el trabajo corporal, mi formación ha recibido la influencia de enfoques europeos orientados al cuerpo y del análisis Bodynamic.',
        'Estos enfoques exploran las conexiones entre las experiencias del desarrollo temprano y los patrones que se mantienen en el cuerpo.',
      ],
    },
    {
      heading: 'Estudio de las tradiciones de los templos',
      paragraphs: [
        'Una de las mayores influencias para mí ha sido el estudio de las tradiciones de los templos.',
        'Esto incluye los misterios de los templos griegos, los misterios de Dioniso y Deméter y las tradiciones de los templos egipcios.',
        'Estos estudios han profundizado mi comprensión de los arquetipos y del fluir transpersonal, que llevo 20 años explorando y compartiendo en distintos países.',
      ],
    },
    {
      heading: 'Iniciaciones de Reiki',
      paragraphs: [
        'Mi punto de partida para aprender a sentir este fluir fue una serie de iniciaciones de Reiki, incluido Tantra Reiki, un linaje que dentro de su tradición se describe como vinculado a enseñanzas inspiradas en Osho.',
      ],
    },
  ],
  explore: {
    heading: 'Explora mi trabajo',
    links: [
      { label: 'Libro (en inglés)', href: 'https://designrr.page/?id=377444&token=639498968&h=5264' },
      { label: 'Remedios (en inglés)', href: '/en/homeopathy' },
      { label: 'Servicios (en inglés)', href: '/en/services' },
    ],
  },
  cabinet: {
    heading: 'Área de clientes',
    body: 'Tu área personal está disponible mediante el enlace privado que has recibido.',
    prompt: '¿Necesitas tu enlace?',
    action: 'Contactar con Andy',
    href: 'https://t.me/AndyTherapist',
  },
};

export const aboutIntroEs = {
  title: 'Alquimia psíquica con Andy',
  description: 'Una breve presentación de mi enfoque: homeopatía, constelaciones sistémicas e hipnoterapia.',
  transcript: [
    'Hola, soy Andy Li. Te doy la bienvenida a una sesión personal de Alquimia Psíquica.',
    'Mi enfoque combina la homeopatía con las constelaciones sistémicas y la hipnoterapia para explorar patrones más profundos en las emociones y las relaciones y encontrar nuevas soluciones.',
    'Te invito a leer los testimonios y dejar una solicitud en la página web.',
    'Me encantará explorar tu situación contigo y encontrar nuevos recursos y soluciones.',
  ].join('\n\n'),
};
