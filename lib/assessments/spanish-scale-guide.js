// Spanish presentation for existing, versioned scale guides. Never change scores,
// source categories, thresholds, test definitions or data provenance.
export const SPANISH_SCALE_AXES = Object.freeze({
  "stress": [
    "Estrés y exigencias",
    "Observa cuándo aumentan las exigencias y cómo afectan a tu día.",
    "Detecta una carga que puedas reducir o compartir esta semana.",
    "Descanso y un ritmo sostenible"
  ],
  "anxiety": [
    "Ansiedad y tensión",
    "Observa cuándo aparece la preocupación, cuánto dura y qué te ayuda a sentir estabilidad.",
    "Identifica una situación que te genere tensión y una pausa que te ayude.",
    "Conexión con el presente y respuestas flexibles"
  ],
  "mood": [
    "Estado de ánimo y emociones",
    "Observa los cambios de ánimo y su contexto, sin juzgarte.",
    "Anota un momento que haya influido en tu bienestar esta semana.",
    "Hábitos de apoyo y conciencia emocional"
  ],
  "sleep": [
    "Sueño y recuperación",
    "Observa la sensación de descanso, los horarios de sueño y cómo influyen en el día siguiente.",
    "Prueba una rutina nocturna más suave y observa cómo te sientes al despertar.",
    "Rutinas amables de recuperación"
  ],
  "energy": [
    "Energía y cuerpo",
    "Observa tu energía y las molestias físicas sin dar por supuesta una causa psicológica.",
    "Reconoce tus momentos de mayor y menor energía y reserva una pausa reparadora.",
    "Ritmo sostenible, descanso y consulta médica cuando corresponda"
  ],
  "clarity": [
    "Claridad mental",
    "Observa cuándo piensas con mayor claridad y qué condiciones lo facilitan o dificultan.",
    "Dedica un momento breve a una tarea sin distracciones y observa cómo te va.",
    "Pausas de atención y planificación"
  ],
  "focus": [
    "Concentración y atención",
    "Observa qué tareas te resulta más fácil comenzar y mantener.",
    "Elige una tarea pequeña y comprueba qué te ayuda a concentrarte.",
    "Objetivos realistas y periodos breves de concentración"
  ],
  "emotional_regulation": [
    "Flexibilidad emocional",
    "Observa tus emociones, cómo las expresas y qué respuestas encajan con cada situación.",
    "Nombra una emoción sin exigir que desaparezca.",
    "Nombrar emociones y elegir cómo expresarlas"
  ],
  "relationships": [
    "Relaciones y apoyo",
    "Observa cuándo el contacto con otras personas resulta amable o agotador.",
    "Identifica una relación o un lugar donde el contacto se sienta seguro.",
    "Comunicación y límites personales"
  ],
  "intimacy": [
    "Cercanía emocional",
    "Observa qué tipo y ritmo de cercanía te resultan cómodos y voluntarios.",
    "Reconoce un límite o una necesidad que quieras expresar a tu propio ritmo.",
    "Expresar necesidades y elegir tu ritmo"
  ],
  "boundaries": [
    "Límites y consentimiento",
    "Observa cuándo quieres decir sí, no o hacer una pausa; una puntuación no demuestra consentimiento.",
    "Practica identificar una preferencia sin presión ni obligación de actuar.",
    "Peticiones respetuosas y límites claros"
  ],
  "sexual_wellbeing": [
    "Bienestar sexual y elección",
    "Observa tus preferencias y tu comodidad, sin asumir que debes sentir un nivel determinado de deseo.",
    "Reconoce una preferencia personal sin juzgarla.",
    "Autoaceptación y diálogo sin presión"
  ],
  "embodiment": [
    "Conciencia corporal",
    "Observa las sensaciones que te resultan cómodas y respeta tu derecho a parar.",
    "Detente unos instantes si te apetece y observa una sensación neutral o agradable.",
    "Atención corporal suave y voluntaria"
  ],
  "resource": [
    "Recursos y resiliencia",
    "Observa qué personas, actividades o rutinas te ayudan a recuperarte.",
    "Identifica un recurso disponible que puedas utilizar sin exigirte demasiado.",
    "Encontrar apoyos accesibles"
  ],
  "self_support": [
    "Apoyo interior",
    "Observa cómo te tratas cuando aparecen dificultades.",
    "Prueba a dirigirte una frase amable durante una tarea difícil.",
    "Autocompasión y decisiones pequeñas"
  ],
  "functioning": [
    "Actividad cotidiana",
    "Observa qué actividades del día a día se han vuelto más fáciles o difíciles.",
    "Elige una tarea diaria que puedas adaptar, en lugar de exigirte más.",
    "Pasos prácticos y apoyo adecuado"
  ],
  "personality": [
    "Tendencias de personalidad",
    "Observa cómo se manifiesta una tendencia según el contexto; ningún rasgo es un defecto.",
    "Observa una situación donde ese rasgo te ayudó o cambió de intensidad.",
    "Flexibilidad voluntaria sin intentar corregir una puntuación"
  ],
  "meaning": [
    "Sentido y dirección",
    "Observa qué actividades tienen sentido para ti y hacia dónde deseas avanzar.",
    "Elige un paso pequeño relacionado con algo que valoras.",
    "Pequeñas acciones acordes con tus valores"
  ]
});
const period = Object.freeze({
  'right now':'en este momento','past seven days':'los últimos siete días','past two weeks':'las últimas dos semanas',
  'past month':'el último mes','past 30 days':'los últimos 30 días','past four weeks':'las últimas cuatro semanas',
  'past six months':'los últimos seis meses','in general':'en general',
  'general self-description':'descripción general de ti mismo','the period given in the questions':'el periodo indicado en las preguntas',
});
const safely = (value) => String(value || '').toLowerCase();
export function localizeScaleGuideSpanish(guide) {
  if (!guide?.scales?.length) return guide;
  const scales = guide.scales.map(row => {
    const axis = SPANISH_SCALE_AXES[row.axis];
    const isSymptom = ['symptom_screening', 'symptom_measure', 'screening_count'].includes(row.type);
    const isTraditional = row.type === 'traditional';
    const symptomWatch = row.type === 'screening_count'
      ? 'Observa los ejemplos de dificultades de atención o actividad durante los últimos seis meses y su influencia en tu vida diaria. El número no mide gravedad ni progreso diario.'
      : 'Observa los síntomas comunicados y su influencia en tu vida diaria. Esta puntuación no determina un diagnóstico; consulta con un profesional sanitario si te preocupa.';
    const symptomAction = 'Anota una observación concreta y, si tienes dudas o molestias, coméntalas con un profesional sanitario cualificado.';
    const traditionalWatch = 'Observa si este tema emocional aparece en tu experiencia y en qué circunstancias. Una coincidencia no es diagnóstico ni recomendación de esencias.';
    const safeGeneric = 'Observa cómo cambia esta experiencia según el contexto y el momento, sin emitir juicios.';
    return {
      ...row,
      originalLabel: row.label,
      label: axis?.[0] || 'Indicador del cuestionario',
      axisLabel: axis?.[0] || (isTraditional ? 'Tema emocional simbólico' : 'Indicador descriptivo'),
      watch: isSymptom ? symptomWatch : isTraditional ? traditionalWatch : axis?.[1] || safeGeneric,
      action: isSymptom ? symptomAction : isTraditional ? 'Si lo deseas, reflexiona sobre cuándo aparece este tema; no requiere tratamiento.' : axis?.[2] || 'Elige una observación pequeña para la próxima semana.',
      skill: row.skill && !isSymptom && !isTraditional ? axis?.[3] || 'Reflexión y atención al contexto' : null,
      timeframe: period[safely(row.timeframe)] || period[safely(guide.timeframe)] || 'el periodo indicado en las preguntas',
    };
  });
  const topics = [...new Set(scales.map(row => row.axisLabel))].join(', ');
  const screeningCount = scales.some(row => row.type === 'screening_count');
  const symbolic = guide.kind === 'traditional';
  return {
    ...guide, language: 'es', scales,
    purpose: symbolic ? 'Reflexión temática simbólica, no una evaluación clínica.'
      : screeningCount ? 'Cuestionario de cribado de dificultades de atención o actividad. No establece un diagnóstico.'
      : 'Autoobservación de ' + topics.toLowerCase() + '. Los resultados dependen de las preguntas originales y no constituyen un diagnóstico.',
    timeframe: period[safely(guide.timeframe)] || 'el periodo indicado en las preguntas',
    disclaimer: screeningCount
      ? 'En la interpretación original del recuento, 0–3 está por debajo del umbral de cribado y 4–6 está en él o por encima. No es un diagnóstico, una medida de gravedad ni una probabilidad de TDAH. Un resultado inferior no descarta dificultades; consulta con profesionales cuando te preocupe. Los seis meses son el periodo de las preguntas, no una frecuencia de repetición.'
      : symbolic ? 'Es una reflexión simbólica tradicional, no una prueba médica ni psicológica validada.'
      : 'La puntuación describe respuestas declaradas, no un diagnóstico clínico. Los rasgos de personalidad no necesitan corregirse. Las prácticas sugeridas son voluntarias.',
  };
}
