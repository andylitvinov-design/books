import { energyworkSlides } from '@/data/academy/energywork-ai-curriculum'
import { formatReikiInitiationRequest } from '@/data/academy/reiki-initiation-request.js'

const labels = {
  en: { course: 'Reiki Practitioner · Private course update', start: 'Course started', answer: 'Answer saved',
    'answer-edit': 'Answer edited', milestone: 'Lesson completed', complete: 'Course completed',
    application: 'Initiation request submitted', lesson: 'Lesson', introduction: 'Introduction', cleared: 'Answer cleared' },
  ru: { course: 'Рейки-практик · Для преподавателя', start: 'Курс начат', answer: 'Ответ сохранён',
    'answer-edit': 'Ответ изменён', milestone: 'Урок пройден', complete: 'Курс пройден',
    application: 'Заявка на инициацию отправлена', lesson: 'Урок', introduction: 'Введение', cleared: 'Ответ удалён' },
  es: { course: 'Practicante de Reiki · Para el docente', start: 'Curso iniciado', answer: 'Respuesta guardada',
    'answer-edit': 'Respuesta editada', milestone: 'Lección completada', complete: 'Curso completado',
    application: 'Solicitud de iniciación enviada', lesson: 'Lección', introduction: 'Introducción', cleared: 'Respuesta borrada' },
}
const questions = new Map(energyworkSlides().filter(slide => slide.question).map(slide => [slide.id, slide.question]))
// Earlier clients saved a separate second answer to the combined Tantra question.
questions.set('tan-study-03', { prompt: { en: 'For what purposes can the Tantra Reiki flow be used?',
  ru: 'Для каких целей можно использовать поток Тантра Рейки?' } })

export default function ReikiCourseEvent({ event, locale }) {
  const copy = labels[locale] || labels.en
  const contentLocale = locale === 'ru' ? 'ru' : 'en'
  const question = questions.get(event.questionId)
  const choice = question?.type === 'choice' && question.options?.find(option => option.id === event.answer)
  const answer = event.kind === 'application' ? formatReikiInitiationRequest(event.answer, contentLocale) : event.answer
  const lesson = event.lesson === 0 ? copy.introduction : event.lesson ? `${copy.lesson} ${event.lesson}` : null
  return <>
    <strong>{copy.course}</strong>
    <p>{[lesson, copy[event.kind]].filter(Boolean).join(' · ')}</p>
    {event.questionId && <p>{question?.prompt[contentLocale] || event.questionId}</p>}
    {typeof event.answer === 'string' && <p style={{ whiteSpace: 'pre-wrap' }}>{choice?.label?.[contentLocale] || answer || copy.cleared}</p>}
  </>
}
