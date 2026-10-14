import { deepFreeze } from '../../lib/assessments/contracts.js'

// OPORA: original, transparent Russian translation of the public-domain GAD-7.
// This exact wording has NOT undergone independent psychometric validation.
// Do not claim equivalence to the separately validated Zolotareva 2023 version.
// Pfizer expressly permits reproduction, translation, display and distribution.
const TEXT = [
  "Чувство нервозности, тревоги или напряжения",
  "Невозможность остановить или контролировать беспокойство",
  "Чрезмерное беспокойство по разным поводам",
  "Трудности с расслаблением",
  "Такое сильное беспокойство, что трудно усидеть на месте",
  "Повышенная раздражительность",
  "Страх, будто может произойти что-то ужасное"
]

export const GAD7_RU_V1 = deepFreeze({
  id: "0ebde4b1-0309-5470-be00-3c79a9fb85e1",
  key: 'gad-7',
  version: 'v1',
  instrumentLocale: 'ru',
  translationVersion: 'hh-original-ru-v1-unvalidated',
  timeframe: 'past-2-weeks',
  scoringKey: 'configured',
  scoringVersion: 'v1',
  resultVersion: 'v1',
  title: 'Шкала тревожных симптомов GAD-7',
  source: {
    title: 'GAD-7 · Spitzer, Kroenke, Williams и соавт.',
    url: 'https://www.phqscreeners.com/select-screener',
    permission: 'no-permission-required-to-reproduce-translate-display-distribute',
    permissionUrl: 'https://www.phqscreeners.com/select-screener',
    status: 'original-Russian-translation-of-licensed-GAD7-not-validated',
    reviewedAt: '2026-10-14',
    languageNote: 'Самостоятельный русский перевод Holistic House, не тождественный проверенной адаптации Золотарёвой (2023) и не клинически валидированный отдельно.',
    nonDiagnostic: true,
  },
  answerScale: {min:0,max:3},
  responseAnchors: ['Ни разу','Несколько дней','Более половины дней','Почти каждый день'],
  scoring: {dimensions: [
    {
      key:'symptoms.gad7.total',method:'sum',
      items:TEXT.map((_,i)=>'gad7.'+String(i+1).padStart(2,'0')),
      min:0,max:21,dimensionClass:'symptoms',
      sourceConstruct:'Частота тревожных симптомов за последние две недели',
    },
  ]},
  questions: TEXT.map((text,i)=>({id:'gad7.'+String(i+1).padStart(2,'0'),text,required:true})),
  optionalContext: [],
  suggestedRepeatDays: 14,
  contentHash:"sha256:aa5b9c76459c929972279aaf144249f7dcdec2797ade31180298de939e51811e",
})
