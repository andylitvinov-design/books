"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Award, Smartphone, BookOpen, Check, ClipboardCopy, Clock3, Compass, HandHeart, LockKeyhole, PlayCircle, Sparkles, Sprout, BarChart3, Heart, Leaf, MessageCircle, ExternalLink, ChevronDown } from "lucide-react";
import { AcademyVideoPlayer } from "@/components/academy-video-player";
import { ReikiLessonIntroAudio } from "@/components/reiki-lesson-intro-audio";
import { ReikiCourseReferralShare } from "@/components/reiki-course-referral-share";
import { appFetch } from "@/lib/app/client-fetch";
import { whatsappEnquiryUrl, telegramEnquiryUrlFromWhatsApp } from "@/lib/whatsapp-enquiry";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";
import { useOceanPracticeAudio } from "./ocean-practice-audio";
import OceanSoundToggle from "./ocean-sound-toggle";
import {
  ENERGYWORK_COURSE_ID, ENERGYWORK_COURSE_VERSION,
  energyworkPhases, energyworkLessons, energyworkInitiationRequirements,
  energyworkPathChoices, energyworkSlides,
  type EnergyworkLocale, type EnergyworkPath, type EnergyworkSlide,
} from "@/data/academy/energywork-ai-curriculum";
import {
  ENERGYWORK_FIRST_LESSON_NEXT, ENERGYWORK_FIRST_LESSON_STORAGE_KEY,
  energyworkCreateFirstLessonHandoff, energyworkReadFirstLessonHandoff,
} from "@/data/academy/energywork-first-lesson";
import { energyworkLessonRanges, energyworkAdvanceAlreadyStored, ENERGYWORK_REVIEW_MIN_CHARS, ENERGYWORK_TANTRA_STUDY_QUESTION_IDS, ENERGYWORK_KUNDALINI_STUDY_QUESTION_IDS, ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS, energyworkReikiStudyAnswerComplete, energyworkTantraStudyAnswerComplete, energyworkCombinedTantraAnswer } from "@/data/academy/energywork-ai-schema";
import { readReikiInitiationRequest, writeReikiInitiationRequest, reikiInitiationRequestValid, formatReikiInitiationRequest } from "@/data/academy/reiki-initiation-request.js";
import styles from "./energywork-ai-learner.module.css";

type Props = { locale: EnergyworkLocale; startAtExperience?: boolean };
type AnswerMap = Record<string, string>;
const TANTRA_STUDY_HINT_ANCHORS: Record<string, string> = {
  "tan-06": "#tantra-original-author-research",
  "tan-study-02": "#tantra-original-author-research",
  "tan-study-03": "#tantra-full-source",
  "tan-study-04": "#tantra-full-source",
  "tan-study-06": "#tantra-original-master-programme",
  "tan-study-07": "#tantra-original-master-programme",
};
type StoredProgress = {
  accountId: string; enrolled: boolean; courseVersion: string;
  slideId?: string; pathId?: EnergyworkPath | null; answers?: AnswerMap;
  revision?: number; savedAt?: string; status?: "active" | "completed";
  sharingWithTeacher?: boolean;
  enrollmentLead?: { id: string; status: string; createdAt: string } | null;
  applicationLead?: { id: string; status: string; submittedAt: string } | null;
};
type SyncStatus = "checking" | "guest" | "consent" | "ready" | "unavailable";
type ReikiBootstrap = { account?: { id?: string; displayName?: string; onboardingState?: string } };
type FirstLessonHandoff = { answers: Record<string, string> };
type SaveCommand = {
  action: "save";
  version: string; slideId: string; nextSlideId: string;
  answer?: string;
  secondaryAnswer?: string;
};

const programmeSystemDescriptions: Record<EnergyworkLocale, Record<EnergyworkPath, string>> = {
  en: {
    tantra: "presence & connection",
    kundalini: "grounding & energy",
    yggdrasil: "runes & World Tree",
  },
  ru: {
    tantra: "присутствие и контакт",
    kundalini: "опора и энергия",
    yggdrasil: "руны и Древо",
  },
};

const copy = {
  en: {
    shortTitle: "Reiki Practitioner",
    journey: "Five Reiki lessons",
    lesson: "Lesson",
    completedLabel: "completed",
    startFree: "Start free program",
    benefits: "What to expect from your learning",
    shortLessons: "Short lessons",
    shortLessonsDetail: "Clear guidance",
    practicalTasks: "Practical tasks",
    practicalTasksDetail: "Learn at your pace",
    privateProgress: "Private progress",
    privateProgressDetail: "Save by choice",
    eyebrow: "HOLISTIC HOUSE ACADEMY · INTERACTIVE PREVIEW",
    preview: "Guest preview · Answers are not saved.",
    previewHelp: "Sign in with Google and consent to private saving. Guest reflections are not stored and will disappear after leaving.",
    program: "Discover your Reiki journey",
    programmeIntro: "Three Reiki traditions — discover each approach.",
    programmeRead: "Guide",
    systemDetails: "About this practice",
    openLesson: "Open lesson",
    lessonLocked: "Opens as you progress",
    intro: "Introduction",
    slidesWord: "slides",
    saveAndContinue: "Save progress & continue",
    returnAnytime: "Pick up here anytime from My Courses.",
    tomorrowChoice: "Save and finish for today",
    continueNow: "Continue to the next lesson",
    continueNowSave: "Continue — save lesson 1 first",
    lessonChoices: "Choose what to do after this lesson",
    chooseNext: "Choose how to continue",
    decisionKicker: "Lesson complete",
    decisionTitle: "Your progress, your pace",
    decisionIntro: "Save your place and return tomorrow, or explore the next lesson now.",
    decisionStep: "Lesson complete · Next step",
    decisionSave: "Save and return tomorrow",
    decisionGuestSave: "Sign in to save for tomorrow",
    decisionSaveDetail: "Your course and private notes will be waiting in My Courses.",
    decisionGuestSaveDetail: "Continue with Google to save your first lesson privately.",
    decisionContinue: "Continue now",
    decisionContinueDetail: "Go straight to the next lesson with your progress kept safe.",
    decisionContinueGuestDetail: "First save lesson one to unlock the next lesson.",
    saveTodayDetail: "Return anytime from My Courses",
    saveGuestDetail: "Save your first lesson with Google",
    accountSaveTitle: "Save your Reiki course",
    accountSaveText: "Continue with Google to keep your lessons and reflections in your personal Holistic House account.",
    installPageSaved: "Your course progress is saved",
    installPageTitle: "Your Reiki course, always close",
    installPageText: "Add Holistic House to your phone for easy access to My Courses. Installing is optional.",
    installPageLater: "Not now — go to My Courses",
    installPageContinue: "Continue learning",
    installPageNote: "Installing the app does not activate lesson reminders. Notifications require separate permission.",
    installOption: "Install Holistic House on my phone",
    backCourse: "Course details",
    step: "Slide",
    of: "of",
    continue: "Continue",
    back: "Back",
    stop: "Explore all five steps now. Sign in to save your place as you learn.",
    stopSaved: "Your progress is saved in My Courses. Revisit any step you have reached.",
    optional: "Optional reflection",
    experienceBadge: "Your starting point",
    experienceNote: "Choose one answer to continue. You can change it later.",
    blank: "You can leave this unanswered.",
    notes: "My reflection",
    placeholder: "Write here (optional)…",
    sunReflectionPlaceholder: "What did you notice? (optional)…",
    value: "Your choice",
    audio: "Original English audio",
    unavailable: "This recording is not available. You can continue using the written teaching.",
    welcomeOffer: "One course · 5 lessons · 3 Reiki systems",
    welcomeRequirement: "Study all five lessons in order.",
    welcomeGiftTitle: "A personal initiation with Andrey — your gift",
    welcomeGiftText: "After all five lessons and your application, arrange a free personal introductory Level 1 initiation in one of the three Reiki systems of your choice. After the initiation, you can begin practising that system at the introductory level.",
    welcomeTeacher: "Want to go further? You can explore personal Reiki initiation with Andrey when you feel ready.",
    pathway: "All lessons are part of your course",
    picked: "Completed",
    fiveLessons: "Five sequential lessons",
    meditationReport: "Meditation report",
    lessonQuestion: "Course question",
    optionalForLearning: "Optional for now. A written answer is required for personal initiation review.",
    tantraAnswerRequired: "Answer required to continue.", tantraStudyHint: "Need a hint? Read the guide", tantraAnswerPlaceholder: "Write a short answer…", required: "Required",
    feedbackBadge: "Your review",
    saveReview: "Save review",
    reviewMissing: "Write at least 50 characters to save your review.",
    feelingPlaceholder: "Share your meditation experience: what did you feel, notice or discover?",
    feedbackPrivacy: "Your reflection stays private unless you choose to share it.",
    feedbackCharacters: "characters", feedbackMinimum: "minimum 50",
    voicesLabel: "Learner experiences",
    voicesFullText: "Full learner review",
    voicesNoQuote: "No verified comments for this exact recording are available here yet.",
    voicesSource: "Original review",
    voicesComments: "Video comments",
    voicesNote: "Other people's experiences are not a standard to meet.",
    voicesPrevious: "Previous review",
    voicesNext: "Next review",
    voicesNavigation: "Browse learner reviews",
    milestoneLabel: "Well done — keep going!",
    initiationVideoNoteTitle: "A video meditation is not an initiation",
    initiationVideoNoteText: "Listening to a recorded meditation does not initiate you. Initiation is always personal. To receive a personal meditation from Andrey, complete all five lessons and write to him.",
    firstMilestoneLabel: "Your Reiki journey is underway",
    firstSaveTitle: "Your reflections, gently kept",
    firstSaveText: "Your answers and your Flight to the Sun review will be carefully saved in My Courses. Return to them whenever you like, and edit or rewrite them at any time.",
    firstSaveAssurance: "Only you decide what to share. Your reflections stay private.",
    firstSaveConsent: "I am at least 18 and agree to save my lesson progress and answers privately in my Holistic House account.",
    firstSavePolicy: "Privacy Policy",
    firstSaveGoogle: "Save with Google & continue",
    firstSaveAccount: "Save to My Courses & continue",
    firstSaveNext: "Continue to saving",
    firstSaveError: "We couldn't save your lesson yet. Your answers are still here — please try again.",
    firstSignInCancelled: "Google sign-in wasn't completed. Please try again to save and continue.",
    firstSaveReady: "Lesson 1 is saved in My Courses.",
    committed: "I'm committed!",
    reviewTitle: "Personal initiation readiness",
    reviewNeeded: "To request personal initiation, add five meditation reports and answer all study questions in Tantra, Kundalini and Yggdrasil Reiki.",
    reviewDone: "Your meditation reports and study answers are ready for review.",
    reviewSaveNeeded: "Your answers are complete in this preview. Sign in and consent to private saving before requesting a personal initiation. Guest entries cannot be transferred automatically; copy your notes first.",
    reviewPrivate: "Saved responses are private. Nothing is sent to the teacher automatically; you decide what to share.",
    reportMissing: "Add report",
    questionMissing: "Answer question",
    backToReview: "Return to initiation checklist",
    reportReady: "Report recorded",
    questionReady: "Answer recorded",
    readyCount: "items completed",
    initiateRequest: "Request free Level 1 introduction in",
    finish: "Course completed",
    finalAcceptedHeading: "Your application has been received!",
    finalPendingHeading: "One last step — send your initiation request",
    finalReviewChecklist: "Review your lesson answers",
    finalEnableShare: "Allow private sharing & continue",
    finalContactHeading: "Write to Andrey personally",
    finalContactNote: "I've completed the Reiki Practitioner course and want to take the next step. Open a private chat with this message already prepared — no private course answers are included.",
    finalRevisit: "Revisit a previous lesson",
    finishNote: "Your reflections are private when signed in and saving is enabled. In guest mode, copy them before leaving.",
    summary: "Your personal course journal",
    nothing: "You did not add written reflections; that is completely fine.",
    copy: "Copy my notes",
    copied: "Notes copied",
    failed: "Copy unavailable. Please select the text and copy it manually.",
    restart: "Start again",
    source: "Explore the original course",
    teacher: "Request teacher-guided Level 1",
    noInitiation: "Studying the material, completing the course or sending a request does not automatically provide initiation.",
    continuePath: "Continue to the next lesson",
    checking: "Checking saved course…", consentTitle: "Save your learning privately",
    consentText: "I agree to save my course progress and answers privately. I can delete my course record.",
    teacherShareConsent: "Also share my learning progress, reviews and answers with Andrey in his private practitioner CRM. No public posting or marketing.",
    initiationLetterHeading: "Your personal Reiki initiation request",
    initiationLetterHint: "Your selected free initiation, optional donation-based choices, contact details and motivation will be shared privately with Andrey only when you confirm below.",
    initiationConfirm: "I agree to send my initiation choices, name, city, preferred chat time, motivation and course answers to Andrey's private CRM.",
    initiationSend: "Send my initiation request",
    initiationSent: "Your request is securely recorded in Andrey's private CRM. He will contact you personally to discuss the next step and arrange a suitable time.",
    initiationTooShort: "Complete your personal initiation form on the previous lesson slide.",
    initiationShareNeeded: "Enable teacher sharing to send your application.",
    initiationNotReady: "Complete your lesson reports and answers to request personal initiation.",
    enableSave: "Start & save my course", signIn: "Sign in with Google to save",
    guestHint: "To start Lesson 2, save Lesson 1 in your private account.",
    saved: "Saved privately", saving: "Saving…", offline: "Saving is unavailable. Your answers are not stored on the server.",
    retry: "Retry", saveFailed: "Could not save. Your answer is still on this screen; retry before continuing.",
    conflict: "Your course changed in another session. Reload the saved version before continuing.",
    reload: "Reload saved progress", print: "Print / Save PDF",
    resetConfirm: "Delete this course, its saved answers, and both related CRM leads (including any initiation request)? Your other courses remain.",
    signupError: "Could not start Google sign-in. Try again from the My Courses cabinet.",
    accountError: "Account needs attention. Open your personal cabinet to complete sign-in and consent.",
    myCourses: "My Courses",
  },
  ru: {
    shortTitle: "Практик Рейки",
    journey: "Пять уроков Рейки",
    lesson: "Урок",
    completedLabel: "пройдено",
    startFree: "Начать бесплатный курс",
    benefits: "Что ждёт вас на курсе",
    shortLessons: "Короткие уроки",
    shortLessonsDetail: "Понятные шаги",
    practicalTasks: "Практические задания",
    practicalTasksDetail: "В своём темпе",
    privateProgress: "Личный прогресс",
    privateProgressDetail: "По вашему выбору",
    eyebrow: "АКАДЕМИЯ HOLISTIC HOUSE · ИНТЕРАКТИВНЫЙ ПРОСМОТР",
    preview: "Гостевой просмотр · Ответы не сохраняются.",
    previewHelp: "Войдите через Google и согласитесь на приватное сохранение. Гостевые ответы не записываются и исчезнут после выхода.",
    program: "Откройте свой путь в Рейки",
    programmeIntro: "Три системы Рейки — познакомьтесь с каждой.",
    programmeRead: "Описание",
    systemDetails: "Об этой практике",
    openLesson: "Открыть урок",
    lessonLocked: "Откроется по мере прохождения",
    intro: "Введение",
    slidesWord: "слайдов",
    saveAndContinue: "Сохранить прогресс и продолжить",
    returnAnytime: "Вернуться к уроку можно через «Мои курсы».",
    tomorrowChoice: "Сохранить и закончить на сегодня",
    continueNow: "Продолжить следующий урок",
    continueNowSave: "Продолжить — сначала сохранить урок 1",
    lessonChoices: "Что сделать после урока",
    chooseNext: "Выбрать следующий шаг",
    decisionKicker: "Урок завершён",
    decisionTitle: "Ваш прогресс — в вашем ритме",
    decisionIntro: "Сохранить результаты и вернуться завтра или продолжить следующий урок прямо сейчас?",
    decisionStep: "Урок завершён · Следующий шаг",
    decisionSave: "Сохранить и продолжить завтра",
    decisionGuestSave: "Войти и сохранить до завтра",
    decisionSaveDetail: "Прогресс и личные записи будут ждать вас в «Моих курсах».",
    decisionGuestSaveDetail: "Для приватного сохранения первого урока потребуется вход через Google.",
    decisionContinue: "Продолжить сейчас",
    decisionContinueDetail: "Перейти к следующему уроку с сохранением прогресса.",
    decisionContinueGuestDetail: "Для следующего урока сначала нужно сохранить первый.",
    saveTodayDetail: "Вернуться в любое время из «Моих курсов»",
    saveGuestDetail: "Сохранить первый урок через Google",
    accountSaveTitle: "Сохраните свой курс Рейки",
    accountSaveText: "Войдите через Google, чтобы сохранить уроки и личные заметки в кабинете Holistic House.",
    installPageSaved: "Прогресс курса сохранён",
    installPageTitle: "Ваш курс Рейки всегда рядом",
    installPageText: "Добавьте Holistic House на телефон, чтобы быстро открывать «Мои курсы». Установка необязательна.",
    installPageLater: "Не сейчас — перейти в «Мои курсы»",
    installPageContinue: "Продолжить обучение",
    installPageNote: "Установка приложения не включает напоминания об уроках. Для уведомлений потребуется отдельное разрешение.",
    installOption: "Установить Holistic House на телефон",
    backCourse: "Описание курса",
    step: "Слайд",
    of: "из",
    continue: "Продолжить",
    back: "Назад",
    stop: "Изучайте все пять этапов. Войдите в кабинет, чтобы сохранять свой прогресс.",
    stopSaved: "Ваш прогресс сохранён в разделе «Мои курсы». Возвращайтесь к пройденным урокам.",
    optional: "Необязательная рефлексия",
    experienceBadge: "Ваш уровень знакомства",
    experienceNote: "Выберите один вариант, чтобы продолжить. Позже его можно изменить.",
    blank: "Можно оставить без ответа.",
    notes: "Моё наблюдение",
    placeholder: "Напишите здесь (необязательно)…",
    sunReflectionPlaceholder: "Что вы почувствовали? (необязательно)…",
    value: "Ваш выбор",
    audio: "Оригинальное видео на английском",
    unavailable: "Запись пока недоступна. Можно продолжить изучение по тексту.",
    welcomeOffer: "Один курс · 5 уроков · 3 системы Рейки",
    welcomeRequirement: "Проходите все пять уроков по очереди.",
    welcomeGiftTitle: "Личная инициация с Андреем — в подарок",
    welcomeGiftText: "После пяти уроков и заполнения заявки вас ждёт бесплатная персональная вводная инициация I ступени в одной из трёх систем на выбор. Андрей лично согласует с вами встречу. После инициации вы сможете начать практику в выбранной системе.",
    welcomeTeacher: "Захочется пойти дальше? Когда будете готовы, можно обсудить с Андреем личную Рейки-инициацию.",
    pathway: "Все уроки входят в одну программу",
    picked: "Завершено",
    fiveLessons: "Пять последовательных уроков",
    meditationReport: "Отчёт после медитации",
    lessonQuestion: "Вопрос по уроку",
    optionalForLearning: "Пока можно пропустить. Письменный ответ понадобится для рассмотрения личной инициации.",
    tantraAnswerRequired: "Ответ обязателен для продолжения.", tantraStudyHint: "Подсказка: читать материал", tantraAnswerPlaceholder: "Ваш краткий ответ…", required: "Обязательно",
    feedbackBadge: "Ваш отзыв",
    saveReview: "Сохранить отзыв",
    reviewMissing: "Напишите хотя бы 50 символов, чтобы сохранить отзыв.",
    feelingPlaceholder: "Расскажите о медитации: какие ощущения, мысли или открытия вы заметили?",
    feedbackPrivacy: "Отзыв остаётся личным, если вы не решите поделиться им.",
    feedbackCharacters: "символов", feedbackMinimum: "минимум 50",
    voicesLabel: "Отзывы участников",
    voicesFullText: "Полный текст отзыва",
    voicesNoQuote: "Подтверждённых отзывов именно об этой записи пока нет.",
    voicesSource: "Источник отзыва",
    voicesComments: "Комментарии к видео",
    voicesNote: "Ваш опыт не обязан совпадать с чужим.",
    voicesPrevious: "Предыдущий отзыв",
    voicesNext: "Следующий отзыв",
    voicesNavigation: "Переключение отзывов",
    milestoneLabel: "Отличный результат!",
    initiationVideoNoteTitle: "Видеомедитация — это ещё не инициация",
    initiationVideoNoteText: "Прослушанная видеомедитация сама по себе не является инициацией. Инициация всегда персональна. Чтобы получить персональную медитацию от Андрея, завершите все пять уроков курса и напишите ему.",
    firstMilestoneLabel: "Ваш путь в Рейки начался",
    firstSaveTitle: "Ваши впечатления будут бережно сохранены",
    firstSaveText: "Ваши ответы и отзыв о «Полёте к Солнцу» будут бережно сохранены в вашем кабинете. Вы сможете в любой момент к ним вернуться, изменить или переписать.",
    firstSaveAssurance: "Только вы решаете, чем делиться. Ваши записи остаются личными.",
    firstSaveConsent: "Мне исполнилось 18 лет, и я согласен(на) на приватное хранение прогресса и ответов курса в Holistic House.",
    firstSavePolicy: "Политика конфиденциальности",
    firstSaveGoogle: "Сохранить через Google и продолжить",
    firstSaveAccount: "Сохранить в кабинете и продолжить",
    firstSaveNext: "Продолжить к сохранению",
    firstSaveError: "Пока не получилось сохранить урок. Ваши ответы на месте — попробуйте ещё раз.",
    firstSignInCancelled: "Вход через Google не завершён. Повторите вход, чтобы сохранить урок и продолжить.",
    firstSaveReady: "Первый урок сохранён в «Моих курсах».",
    committed: "I'm committed!",
    reviewTitle: "Готовность к личной инициации",
    reviewNeeded: "Для заявки заполните пять отчётов и ответы на вопросы, по Тантра, Кундалини и Иггдрасиль Рейки. Учёбу можно продолжать без них.",
    reviewDone: "Ваши отчёты и ответы на вопросы готовы к просмотру.",
    reviewSaveNeeded: "Ответы заполнены в предварительном просмотре. Для заявки на личную инициацию войдите в кабинет и согласитесь на приватное сохранение. Гостевые записи автоматически не переносятся — сначала скопируйте их.",
    reviewPrivate: "Ответы сохраняются приватно. Преподавателю они автоматически не отправляются; вы сами решаете, чем поделиться.",
    reportMissing: "Заполнить отчёт",
    questionMissing: "Ответить на вопрос",
    backToReview: "Вернуться к подготовке инициации",
    reportReady: "Отчёт есть",
    questionReady: "Ответ есть",
    readyCount: "пунктов заполнено",
    initiateRequest: "Запросить бесплатную вводную инициацию I ступени —",
    finish: "Курс завершён",
    finalAcceptedHeading: "Ваша заявка принята!",
    finalPendingHeading: "Последний шаг — отправьте заявку на инициацию",
    finalReviewChecklist: "Проверить ответы уроков",
    finalEnableShare: "Разрешить приватную передачу и продолжить",
    finalContactHeading: "Напишите Андрею лично",
    finalContactNote: "Я завершил(а) курс Reiki Practitioner и хочу двигаться дальше. Откройте личный чат с готовым сообщением — ответы и личные данные из курса не передаются.",
    finalRevisit: "Вернуться к предыдущим урокам",
    finishNote: "После входа и согласия ваши ответы сохраняются приватно. В гостевом режиме скопируйте их перед выходом.",
    summary: "Ваш личный учебный дневник",
    nothing: "Вы не записали наблюдения, и это совершенно нормально.",
    copy: "Скопировать записи",
    copied: "Записи скопированы",
    failed: "Копирование недоступно. Выделите текст и скопируйте вручную.",
    restart: "Начать заново",
    source: "Материалы курса",
    teacher: "Запросить 1-ю ступень у преподавателя",
    noInitiation: "Просмотр материалов, окончание курса или отправка заявки не предоставляют инициацию автоматически.",
    continuePath: "Перейти к следующему уроку",
    checking: "Проверяем сохранённый курс…", consentTitle: "Сохранить обучение приватно",
    consentText: "Я согласен(на) приватно сохранять прогресс и ответы курса. Данные курса можно удалить.",
    teacherShareConsent: "Также разрешаю передавать Андрею мои ответы, отзывы и прогресс в его закрытую CRM. Без публикаций и рекламных рассылок.",
    initiationLetterHeading: "Ваша заявка на личную Рейки-инициацию",
    initiationLetterHint: "Выбранная бесплатная инициация, дополнительные варианты за донейшн, контакты и мотивация попадут к Андрею только после подтверждения отправки.",
    initiationConfirm: "Я согласен(на) отправить Андрею в закрытую CRM выбранные инициации, имя, город, удобное время для связи в чате, мотивацию и ответы курса.",
    initiationSend: "Отправить заявку на инициацию",
    initiationSent: "Заявка сохранена в закрытой CRM Андрея. Он лично свяжется с вами, чтобы обсудить следующий шаг и согласовать удобное время.",
    initiationTooShort: "Заполните анкету личной инициации на предыдущем слайде.",
    initiationShareNeeded: "Для заявки разрешите передачу материалов преподавателю.",
    initiationNotReady: "Заполните ответы и отчёты, чтобы отправить заявку.",
    enableSave: "Начать с сохранением", signIn: "Войти через Google для сохранения",
    guestHint: "Чтобы перейти ко второму уроку, сохраните первый в личном кабинете.",
    saved: "Сохранено приватно", saving: "Сохраняем…", offline: "Сохранение недоступно. Ответы не записываются на сервер.",
    retry: "Повторить", saveFailed: "Не удалось сохранить. Ответ остался на экране; повторите перед переходом.",
    conflict: "Курс изменился в другой вкладке. Загрузите сохранённую версию перед продолжением.",
    reload: "Загрузить прогресс", print: "Печать / Сохранить PDF",
    resetConfirm: "Удалить курс, ответы и оба связанных лида в CRM, включая заявку на инициацию? Остальные курсы останутся.",
    signupError: "Не удалось начать вход через Google. Попробуйте через раздел «Мои курсы».",
    accountError: "Завершите вход и согласие в личном кабинете.",
    myCourses: "Мои курсы",
  },
} as const;

const MEDITATION_REPORT_IDS = new Set(["flight-04", "tan-04", "kun-04", "ygg-04"]);
// Previously saved reviews may contain the old 0–10 feeling prefix.
// Display only the written reflection; keep existing private records readable.
const legacyMeditationPrefix = /^Feeling:(?:10|[0-9])\/10\n([\s\S]*)$/;
function meditationReviewText(value: string) {
  const legacy = legacyMeditationPrefix.exec(value);
  return legacy ? legacy[1] : value;
}

// Keep the historic "skipped" choice ID readable in encrypted progress.
// Use the current supportive wording without claiming any particular sensation.
function flightPracticeResponse(value: string, locale: EnergyworkLocale) {
  if (value === "tried") return locale === "ru"
    ? "Я попробовал(а) в комфортном варианте"
    : "I tried it in a way that suited me";
  if (value === "skipped") return locale === "ru"
    ? "Мне нужно ещё попрактиковаться"
    : "I need more practice";
  return value;
}

const experienceGuidance: Record<EnergyworkLocale, Record<string, string>> = {
  en: {
    beginner: "Welcome! No Reiki experience is needed.",
    energywork: "Use your experience to compare the three Reiki traditions.",
    "reiki-1-2": "Review the foundations at your own pace.",
    master: "Compare the three traditions at your own pace.",
  },
  ru: {
    beginner: "Добро пожаловать! Опыт Рейки не требуется.",
    energywork: "Ваш опыт поможет сравнить три традиции Рейки.",
    "reiki-1-2": "Повторите основы в удобном темпе.",
    master: "Сравните три традиции Рейки в своём темпе.",
  },
};

function safePreviewNotes(slides: EnergyworkSlide[], answers: AnswerMap, locale: EnergyworkLocale) {
  const lines = [
    copy[locale].shortTitle,
    "Course: " + ENERGYWORK_COURSE_ID + " · " + ENERGYWORK_COURSE_VERSION,
    "",
    ...slides.flatMap((slide) => {
      const answer = answers[slide.id];
      const secondary = slide.secondaryQuestion ? answers[slide.secondaryQuestion.id] : undefined;
      if (!answer?.trim() && !secondary?.trim()) return [];
      const shared = Boolean(slide.secondaryQuestion && answer?.trim() && secondary?.trim() &&
        answer.trim() === secondary.trim());
      const prompt = shared && slide.secondaryQuestion
        ? [slide.question?.prompt[locale] || "", slide.secondaryQuestion.prompt[locale]].join("\n")
        : slide.question?.prompt[locale] || "";
      const choice = slide.question?.options?.find((option) => option.id === answer);
      return [slide.title[locale],
        ...(answer?.trim() ? [prompt,
          slide.id === "end-01" ? formatReikiInitiationRequest(answer, locale) :
            choice?.label[locale] ?? (slide.id === "flight-03" ? flightPracticeResponse(answer, locale) : answer), ""] : []),
        ...(secondary?.trim() && slide.secondaryQuestion && !shared
          ? [slide.secondaryQuestion.prompt[locale], secondary, ""] : []),
      ];
    }),
  ];
  return lines.filter((value) => value !== undefined).join("\n").trim();
}

function learnerHighlights(answers: AnswerMap, locale: EnergyworkLocale) {
  const highlights: string[] = [];
  const present = (id: string) => answers[id]?.trim();
  const experience = energyworkSlides(null).find((item) => item.id === "welcome-02")
    ?.question?.options?.find((option) => option.id === present("welcome-02"));
  if (experience) highlights.push(locale === "ru"
    ? "Ваш исходный опыт: " + experience.label.ru + "."
    : "Your starting experience: " + experience.label.en + ".");
  if (present("intention-03")) highlights.push(locale === "ru"
    ? "Ваше собственное намерение: «" + present("intention-03") + "»."
    : "Your own intention: “" + present("intention-03") + "”.");
  if (present("presence-03")) highlights.push(locale === "ru"
    ? "Вы отметили комфорт короткой паузы на " + present("presence-03") + " из 10 — это только ваша самооценка, не медицинская шкала."
    : "You rated the comfort of a short pause " + present("presence-03") + "/10 — a personal check-in, not a medical score.");
  const practicesToRevisit = Object.entries(answers).filter(([id, value]) =>
    /^(flight-03|presence-02|intention-04|boundaries-03|ygg-03|tan-03|kun-03)$/.test(id) && value === "skipped").length;
  if (practicesToRevisit) highlights.push(locale === "ru"
    ? "Практики для повторения: " + practicesToRevisit + ". Можно вернуться к ним в удобном темпе."
    : "Practices to revisit: " + practicesToRevisit + ". Return to them at your own pace.");
  if (reikiInitiationRequestValid(present("end-01"))) {
    const request = readReikiInitiationRequest(present("end-01"));
    const selected = energyworkPathChoices.find((choice) => choice.id === request.freeInitiation)?.title[locale] ?? "";
    highlights.push(locale === "ru" ? "Ваш выбор бесплатной личной инициации: " + selected + "." :
      "Your free personal initiation choice: " + selected + ".");
  }
  return highlights;
}

function PracticeTimer({ locale, durationSeconds = 120 }: { locale: EnergyworkLocale; durationSeconds?: number }) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [running, setRunning] = useState(false);
  const deadline = useRef(0);
  const pendingStart = useRef(0);
  const ocean = useOceanPracticeAudio();

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      const time = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setRemaining(time);
      if (time === 0) {
        setRunning(false);
        ocean.pause();
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [running, ocean.pause]);

  // Suspend both timer and audio on hidden mobile tabs or an interrupted session.
  // It never resumes audibly without another explicit user tap.
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        pendingStart.current += 1;
        if (running) setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
        setRunning(false);
        ocean.pause();
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, [running, ocean.pause]);

  // Browser media must begin before a sound-enabled practice clock starts.
  async function toggle() {
    if (running) {
      pendingStart.current += 1;
      setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
      setRunning(false);
      ocean.pause();
    } else {
      const ticket = ++pendingStart.current;
      const soundStarted = await ocean.play();
      if (ticket !== pendingStart.current || !soundStarted || document.hidden) return;
      deadline.current = Date.now() + (remaining || durationSeconds) * 1000;
      if (remaining === 0) setRemaining(durationSeconds);
      setRunning(true);
    }
  }

  function reset() {
    pendingStart.current += 1;
    ocean.reset();
    setRunning(false);
    setRemaining(durationSeconds);
  }

  useEffect(() => {
    if (!running || !ocean.enabled || !["blocked", "paused"].includes(ocean.status)) return;
    setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
    setRunning(false);
  }, [running, ocean.enabled, ocean.status]);

  return <div className={styles.practiceTimer} role="group" aria-label={locale === "ru" ? "Таймер необязательной практики" : "Optional practice timer"}>
    <span><Clock3 size={17} aria-hidden="true" />{locale === "ru" ? "Мягкая практика · по желанию" : "Gentle practice · optional"}
      <OceanSoundToggle locale={locale} timerRunning={running} audio={ocean} />
    </span>
    <strong aria-label={locale === "ru" ? "Осталось секунд" : "Seconds remaining"}>
      {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
    </strong>
    <button type="button" onClick={toggle} disabled={ocean.enabled && ocean.status === "loading"}>{running ? (locale === "ru" ? "Пауза" : "Pause") :
      (remaining < durationSeconds && remaining > 0 ? (locale === "ru" ? "Продолжить" : "Resume") :
        (locale === "ru" ? (durationSeconds === 60 ? "Начать 1 минуту" : "Начать 2 минуты") : (durationSeconds === 60 ? "Start 1 minute" : "Start 2 minutes")))}</button>
    <button type="button" onClick={reset}>{locale === "ru" ? "Сбросить" : "Reset"}</button>
    {ocean.enabled && ocean.status === "blocked" ? <small role="alert">{locale === "ru" ? "Звук не запустился. Проверьте громкость и попробуйте снова или выключите волны." : "Sound did not start. Check volume and try again, or turn Waves off."}</small> : null}
    {ocean.enabled && ocean.status === "loading" ? <small role="status">{locale === "ru" ? "Загружается аудио…" : "Loading waves and soft music…"}</small> : null}
  </div>;
}


/** Review buttons only change the quote, never the current course slide. */
/** Compact, accessible carousel: review arrows never advance the lesson. */
function MeditationVoices({ slide, locale, youtubeId }: {
  slide: EnergyworkSlide;
  locale: EnergyworkLocale;
  youtubeId?: string;
}) {
  const t = copy[locale];
  const entries = slide.testimonials ?? [];
  const [active, setActive] = useState(0);
  const currentReview = entries[active];
  return (
    <div className={styles.voicesCard} data-meditation-voices>
      <div className={styles.voicesHeading}>
        <span className={styles.voicesEyebrow}><MessageCircle size={17} aria-hidden="true" />{t.voicesLabel}</span>
        {currentReview ? (
          <span className={styles.voicesIndex} aria-live="polite">
            {String(active + 1).padStart(2, "0")} / {String(entries.length).padStart(2, "0")}
          </span>
        ) : null}
      </div>
      {currentReview ? (
        <div data-meditation-review-carousel data-review-count={entries.length}>
          <blockquote className={styles.voiceQuote} aria-live="polite" aria-atomic="true" key={currentReview.id}>
            <span className={styles.voicesQuoteMark} aria-hidden="true">“</span>
            <p data-review-fulltext role="region" tabIndex={0} aria-label={t.voicesFullText}>{currentReview.quote[locale]}</p>
            <cite>{currentReview.attribution[locale]}</cite>
          </blockquote>
          {entries.length > 1 ? (
            <div className={styles.voicesControls} role="group" aria-label={t.voicesNavigation}>
              <button type="button" data-review-prev aria-label={t.voicesPrevious}
                onClick={() => setActive((index) => (index - 1 + entries.length) % entries.length)}>
                <ArrowLeft size={20} aria-hidden="true" />
              </button>
              <span className={styles.voicesCount} aria-hidden="true">
                {entries.map((entry, number) => (
                  <span key={entry.id} className={number === active ? styles.voiceDotActive : styles.voiceDot} />
                ))}
              </span>
              <button type="button" data-review-next aria-label={t.voicesNext}
                onClick={() => setActive((index) => (index + 1) % entries.length)}>
                <ArrowRight size={20} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className={styles.voicesEmpty}>{t.voicesNoQuote}</p>
      )}
      {(currentReview || youtubeId) ? (
        <div className={styles.voicesReferences}>
          {currentReview?.sourcePath ? (
            <Link className={styles.voicesLink} href={"/" + locale + "/academy/" + currentReview.sourcePath}>
              {t.voicesSource}<ExternalLink size={14} aria-hidden="true" />
            </Link>
          ) : null}
          {youtubeId ? (
            <a className={styles.voicesLink} href={"https://www.youtube.com/watch?v=" + youtubeId}
              target="_blank" rel="noopener noreferrer">
              {t.voicesComments}<ExternalLink size={14} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}


/** Lesson 5: all selections serialize into the existing encrypted end-01 answer. */
function ReikiInitiationRequestForm({ value, locale, onChange }: {
  value: string; locale: EnergyworkLocale; onChange: (next: string) => void;
}) {
  const request = readReikiInitiationRequest(value);
  const ru = locale === "ru";
  const ready = reikiInitiationRequestValid(value);
  const change = (patch: Partial<ReturnType<typeof readReikiInitiationRequest>>) => {
    // Capture the learner's own browser time zone; they may edit it freely.
    const timezone = request.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    onChange(writeReikiInitiationRequest({ ...request, timezone, ...patch }));
  };
  return (
    <div className={styles.initiationForm} data-reiki-initiation-choice-form>
      <div className={styles.initiationGiftIntro}>
        <span><Sparkles size={18} aria-hidden="true" />{ru ? "Ваш подарок после обучения" : "Your gift after the course"}</span>
        <p>{ru
          ? "Выберите любую одну личную инициацию I ступени бесплатно. Андрей рассмотрит вашу заявку и лично согласует проведение. Прохождение курса само по себе не является инициацией."
          : "Choose any one personal Level 1 initiation for free. Andrey reviews your request and personally confirms the session. Finishing the course does not itself confer initiation."}</p>
      </div>
      <fieldset className={styles.initiationChoiceGroup}>
        <legend>{ru ? "1. Какую инициацию хотите бесплатно?" : "1. Choose your free initiation"}</legend>
        <div className={styles.initiationChoiceGrid} data-reiki-free-choices>
          {energyworkPathChoices.map((choice) => (
            <label key={choice.id} className={styles.initiationChoice + (request.freeInitiation === choice.id ? " " + styles.initiationChoiceSelected : "")}>
              <input type="radio" name="reiki-free-initiation" value={choice.id}
                checked={request.freeInitiation === choice.id}
                onChange={() => change({
                  freeInitiation: choice.id,
                  donationInitiations: request.donationInitiations.filter((id) => id !== choice.id),
                })} />
              <span>{choice.title[locale]}</span>
              <small>{ru ? "Бесплатно" : "Free"}</small>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.initiationChoiceGroup} data-reiki-donation-choices>
        <legend>{ru ? "2. Хотите вторую или третью инициацию за донейшн?" : "2. Add a second or third initiation by donation?"}</legend>
        <p className={styles.initiationHelper}>{ru
          ? "Необязательно. Выберите одну или обе оставшиеся системы. Пожертвование добровольное, его размер можно обсудить позже — оплаты здесь нет."
          : "Optional: select one or both remaining systems. Donations are voluntary; discuss the amount later. No payment is taken here."}</p>
        <div className={styles.initiationChoiceGrid}>
          {energyworkPathChoices.filter((choice) => choice.id !== request.freeInitiation).map((choice) => (
            <label key={choice.id} className={styles.initiationChoice + (request.donationInitiations.includes(choice.id) ? " " + styles.initiationChoiceSelected : "")}>
              <input type="checkbox" value={choice.id} checked={request.donationInitiations.includes(choice.id)}
                onChange={(event) => change({
                  donationInitiations: event.target.checked
                    ? [...request.donationInitiations, choice.id]
                    : request.donationInitiations.filter((id) => id !== choice.id),
                })} />
              <span>{choice.title[locale]}</span>
              <small>{ru ? "За донейшн" : "By donation"}</small>
            </label>
          ))}
        </div>
      </fieldset>
      <div className={styles.initiationDetails}>
        <p className={styles.initiationSectionTitle}>{ru ? "3. Как к вам обращаться и когда вам удобно?" : "3. Tell Andrey how to reach you and when you're available"}</p>
        <div className={styles.initiationFields}>
          <label className={styles.initiationField}>
            <span>{ru ? "Имя *" : "First name *"}</span>
            <input type="text" autoComplete="given-name" maxLength={60} value={request.firstName}
              onChange={(event) => change({ firstName: event.target.value })} placeholder={ru ? "Ваше имя" : "Your first name"} required />
          </label>
          <label className={styles.initiationField}>
            <span>{ru ? "Фамилия *" : "Last name *"}</span>
            <input type="text" autoComplete="family-name" maxLength={60} value={request.lastName}
              onChange={(event) => change({ lastName: event.target.value })} placeholder={ru ? "Ваша фамилия" : "Your last name"} required />
          </label>
          <label className={styles.initiationField}>
            <span>{ru ? "Город и страна проживания *" : "City and country *"}</span>
            <input type="text" autoComplete="address-level2" maxLength={120} value={request.location}
              onChange={(event) => change({ location: event.target.value })}
              placeholder={ru ? "Например: Торонто, Канада" : "For example: Toronto, Canada"} required />
          </label>
          <label className={styles.initiationField}>
            <span>{ru ? "Ваш часовой пояс *" : "Your time zone *"}</span>
            <input type="text" maxLength={80} value={request.timezone}
              onChange={(event) => change({ timezone: event.target.value })}
              placeholder="America/Toronto" required />
          </label>
          <label className={styles.initiationField + " " + styles.initiationFieldWide}>
            <span>{ru ? "Удобные дни и время для инициации *" : "Preferred days and times for initiation *"}</span>
            <input type="text" maxLength={180} value={request.preferredTime}
              onChange={(event) => change({ preferredTime: event.target.value })}
              placeholder={ru ? "Например: будни после 19:00, по моему времени" : "For example: weekdays after 7 PM, my local time"} required />
          </label>
        </div>
        <p className={styles.initiationHelper}>{ru
          ? "Это не автоматическое бронирование. Андрей уточнит удобное время и формат лично в чате."
          : "This is not an automatic booking. Andrey will discuss the time and format with you personally in chat."}</p>
      </div>
      <label className={styles.initiationMotivation}>
        <span>{ru ? "4. Почему вам нужна именно эта инициация? *" : "4. Why do you want this initiation? *"}</span>
        <textarea rows={3} maxLength={700} value={request.motivation}
          placeholder={ru ? "Что вы хотите развить, почувствовать или привнести в свою практику?" : "What would you like to explore or bring into your practice?"}
          onChange={(event) => change({ motivation: event.target.value })} required />
        <small>{ru ? "Минимум 20 символов мотивации" : "At least 20 characters about your motivation"} · {request.motivation.trim().length}/700</small>
      </label>
      <p className={styles.initiationFormStatus} role="status">
        {ready ? <Check size={17} aria-hidden="true" /> : <LockKeyhole size={17} aria-hidden="true" />}
        {ready
          ? (ru ? "Анкета заполнена. Перейдите далее, чтобы проверить ответы и отдельно подтвердить отправку Андрею." : "Your form is complete. Continue to review your answers and separately confirm sending them to Andrey.")
          : (ru ? "Для отправки заявки выберите бесплатную инициацию и заполните поля со звёздочкой. Продолжить курс можно и без заявки." : "Choose a free initiation and complete the starred fields to send a request. You can continue studying without applying.")}
      </p>
    </div>
  );
}

export function EnergyworkAiLearner({ locale, startAtExperience = false }: Props) {
  const t = copy[locale];
  // Referral entrants have already read the course overview; saved account progress still wins.
  const [index, setIndex] = useState(startAtExperience ? 1 : 0);
  const pageRef = useRef<HTMLElement | null>(null);
  const [programmeOpen, setProgrammeOpen] = useState(false);
  const [showInstallOffer, setShowInstallOffer] = useState(false);
  const [milestoneDecisionId, setMilestoneDecisionId] = useState<string | null>(null);
  const [reviewReturn, setReviewReturn] = useState(false);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const answersRef = useRef<AnswerMap>({});
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");
  const [sync, setSync] = useState<SyncStatus>("checking");
  const [consented, setConsented] = useState(false);
  const [firstLessonConsent, setFirstLessonConsent] = useState(false);
  const authorizedOAuthLeave = useRef(false);
  const [shareConsented, setShareConsented] = useState(false);
  const [sharingWithTeacher, setSharingWithTeacher] = useState(false);
  const [applicationLead, setApplicationLead] = useState<StoredProgress["applicationLead"]>(null);
  const [applicationConsented, setApplicationConsented] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const accountIdRef = useRef<string | null>(null);
  const revisionRef = useRef(0);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const dirtyRef = useRef(new Set<string>());
  const progressRef = useRef("welcome-01");
  const syncedAnswersRef = useRef<AnswerMap>({});
  const request = useCallback((body: SaveCommand) => {
    const task = queueRef.current.catch(() => {}).then(async () => {
      const submit = () => appFetch("academy-energywork", {
        ...body, expectedRevision: revisionRef.current,
      }, "POST", { accountId: accountIdRef.current || undefined }) as Promise<StoredProgress>;
      let value: StoredProgress;
      try {
        value = await submit();
      } catch (error) {
        // Another tab can update the revision while this one is reviewing
        // earlier slides. Rebase once, but never overwrite a different answer
        // to this same question without an explicit owner decision.
        if ((error as { code?: string }).code !== "COURSE_PROGRESS_CHANGED") throw error;
        const latest = await appFetch("academy-energywork", undefined, "GET", {
          accountId: accountIdRef.current || undefined,
        }) as StoredProgress;
        if (!latest.enrolled || latest.accountId !== accountIdRef.current ||
            !Number.isSafeInteger(latest.revision)) throw error;
        const changedElsewhere = (id: string, submitted: string | undefined) =>
          submitted !== undefined &&
          (latest.answers?.[id] ?? "") !== (syncedAnswersRef.current[id] ?? "") &&
          (latest.answers?.[id] ?? "") !== submitted;
        if (changedElsewhere(body.slideId, body.answer) ||
            changedElsewhere("tan-study-03", body.secondaryAnswer)) throw error;
        revisionRef.current = latest.revision!;
        progressRef.current = latest.slideId ?? "welcome-01";
        syncedAnswersRef.current = { ...(latest.answers ?? {}) };
        value = await submit();
      }
      if (!value.enrolled || !Number.isSafeInteger(value.revision)) throw new Error("INVALID_PROGRESS_RESPONSE");
      revisionRef.current = value.revision!;
      progressRef.current = value.slideId ?? "welcome-01";
      syncedAnswersRef.current = { ...(value.answers ?? {}) };
      setSavedAt(value.savedAt || null);
      setSaveError(null);
      return value;
    });
    queueRef.current = task.catch(() => {});
    return task;
  }, []);
  const hydrate = useCallback((value: StoredProgress) => {
    accountIdRef.current = value.accountId;
    if (!value.enrolled) {
      setSharingWithTeacher(false);
      setApplicationLead(null);
      setSync("consent");
      return;
    }
    const restored = energyworkSlides();
    revisionRef.current = value.revision ?? 0;
    progressRef.current = value.slideId ?? "welcome-01";
    const restoredAnswers = value.answers ?? {};
    syncedAnswersRef.current = { ...restoredAnswers };
    answersRef.current = restoredAnswers;
    setAnswers(restoredAnswers);
    const savedIndex = Math.max(0, restored.findIndex((item) => item.id === value.slideId));
    // Only previously reached slides may be opened via cabinet deep links.
    const requestedId = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("slide");
    const requestedIndex = requestedId ? restored.findIndex((item) => item.id === requestedId) : -1;
    setIndex(requestedIndex >= 0 && requestedIndex <= savedIndex ? requestedIndex : savedIndex);
    setSavedAt(value.savedAt || null);
    setSharingWithTeacher(Boolean(value.sharingWithTeacher));
    setApplicationLead(value.applicationLead || null);
    dirtyRef.current.clear();
    setSaveError(null);
    setSync("ready");
  }, []);
  const reloadProgress = useCallback(async () => {
    setBusy(true);
    try {
      const response = await appFetch("academy-energywork") as StoredProgress;
      hydrate(response);
    } catch (error) {
      setSync((error as { status?: number })?.status === 401 ? "guest" : "unavailable");
    } finally { setBusy(false); }
  }, [hydrate]);

  const completeFirstLesson = useCallback(async (handoff: FirstLessonHandoff) => {
    setBusy(true);
    setSync("checking");
    setSaveError(null);
    try {
      // Google creates a login first; a new cabinet may still require consent.
      // The adult/necessary-processing consent was explicitly selected on the
      // Lesson 1 save card before the OAuth redirect.
      const bootstrap = await appFetch("bootstrap", undefined, "GET") as ReikiBootstrap;
      if (!bootstrap.account?.id) throw new Error("ACCOUNT_UNAVAILABLE");
      if (bootstrap.account.onboardingState !== "active") {
        await appFetch("onboarding", {
          adult: true, necessary: true, marketing: false,
          uiLocale: locale, goal: "explore",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          displayName: bootstrap.account.displayName || "",
        }, "POST", { accountId: bootstrap.account.id });
      }
      const value = await appFetch("academy-energywork", {
        action: "start", consent: true, teacherConsent: false,
        version: ENERGYWORK_COURSE_VERSION, firstLesson: handoff,
      }, "POST", { accountId: bootstrap.account.id }) as StoredProgress;
      if (!value.enrolled || !value.slideId || !Number.isSafeInteger(value.revision) ||
          !value.answers?.["flight-04"]) {
        throw new Error("INVALID_FIRST_LESSON_RESPONSE");
      }
      hydrate(value); // Private server persistence is confirmed before the app offer.
      setShowInstallOffer(true);
      window.sessionStorage.removeItem(ENERGYWORK_FIRST_LESSON_STORAGE_KEY);
      setFirstLessonConsent(false);
    } catch (error) {
      // A network error must never masquerade as a successful saved course.
      // Retain the short-lived, same-tab handoff for a deliberate retry.
      const unauthorized = (error as { status?: number })?.status === 401;
      setSync(unauthorized ? "guest" : "consent");
      setIndex(energyworkSlides().findIndex(item => item.id === "flight-save"));
      setSaveError(unauthorized ? t.signupError : t.firstSaveError);
    } finally {
      setBusy(false);
    }
  }, [hydrate, locale, t.firstSaveError, t.signupError]);

  useEffect(() => {
    let raw: string | null = null;
    try { raw = window.sessionStorage.getItem(ENERGYWORK_FIRST_LESSON_STORAGE_KEY); }
    catch { /* Storage unavailable: the guest course still works normally. */ }
    const pending = energyworkReadFirstLessonHandoff(raw, locale);
    if (pending && !new URLSearchParams(window.location.search).has("auth")) {
      // Resume immediately in the lesson, not the cabinet homepage.
      setAnswers(pending.answers);
      answersRef.current = pending.answers;
      setIndex(energyworkSlides().findIndex(item => item.id === "flight-save"));
      void completeFirstLesson(pending);
      return;
    }
    if (raw) {
      try { window.sessionStorage.removeItem(ENERGYWORK_FIRST_LESSON_STORAGE_KEY); }
      catch { /* Nonessential cleanup on restricted browsers. */ }
      if (pending) {
        answersRef.current = pending.answers;
        setAnswers(pending.answers);
        setIndex(energyworkSlides().findIndex(item => item.id === "flight-save"));
        setSaveError(t.firstSignInCancelled);
      }
    }
    void reloadProgress();
  }, [completeFirstLesson, locale, reloadProgress, t.firstSignInCancelled]);
  // Mobile Safari can restore a scrolled document below our fixed lesson.
  // Reset only the document; the slide's own scroll and bottom CTA remain intact.
  useEffect(() => {
    const keepCourseAtTop = () => {
      if (window.matchMedia("(max-width: 760px)").matches) {
        window.scrollTo(0, 0);
      }
    };
    keepCourseAtTop();
    window.addEventListener("pageshow", keepCourseAtTop);
    return () => window.removeEventListener("pageshow", keepCourseAtTop);
  }, [index]);
  // iOS Safari does not resize 100dvh when its software keyboard opens.
  // Reposition the whole lesson to the actual visual viewport so the CTA
  // stays tappable without sacrificing a long-answer textarea's scroll.
  useEffect(() => {
    const page = pageRef.current;
    const viewport = window.visualViewport;
    if (!page || !viewport) return;
    const updateKeyboardViewport = () => {
      const active = document.activeElement;
      const editing = active instanceof HTMLElement && page.contains(active) &&
        (active.matches('textarea, input:not([type="checkbox"]):not([type="radio"])') || active.isContentEditable);
      const obscured = window.innerHeight - viewport.height;
      // Retain the position during a button tap: blur fires before click and
      // Safari animates keyboard dismissal afterwards.
      const keyboardVisible = window.matchMedia("(max-width: 760px)").matches &&
        viewport.height > 180 && obscured > 100 &&
        (editing || page.dataset.reikiKeyboardOpen === "true");
      if (keyboardVisible) {
        page.dataset.reikiKeyboardOpen = "true";
        page.style.setProperty("--reiki-visual-height", `${Math.floor(viewport.height)}px`);
        page.style.setProperty("--reiki-visual-top", `${Math.max(0, Math.floor(viewport.offsetTop))}px`);
      } else {
        delete page.dataset.reikiKeyboardOpen;
        page.style.removeProperty("--reiki-visual-height");
        page.style.removeProperty("--reiki-visual-top");
      }
    };
    viewport.addEventListener("resize", updateKeyboardViewport);
    viewport.addEventListener("scroll", updateKeyboardViewport);
    window.addEventListener("resize", updateKeyboardViewport);
    document.addEventListener("focusin", updateKeyboardViewport);
    document.addEventListener("focusout", updateKeyboardViewport);
    updateKeyboardViewport();
    return () => {
      viewport.removeEventListener("resize", updateKeyboardViewport);
      viewport.removeEventListener("scroll", updateKeyboardViewport);
      window.removeEventListener("resize", updateKeyboardViewport);
      document.removeEventListener("focusin", updateKeyboardViewport);
      document.removeEventListener("focusout", updateKeyboardViewport);
      delete page.dataset.reikiKeyboardOpen;
      page.style.removeProperty("--reiki-visual-height");
      page.style.removeProperty("--reiki-visual-top");
    };
  }, []);
  async function startSaving() {
    if (!consented || busy) return;
    setBusy(true);
    try {
      const result = await appFetch("academy-energywork", {
        action: "start", consent: true, teacherConsent: shareConsented, version: ENERGYWORK_COURSE_VERSION,
      }, "POST", { accountId: accountIdRef.current || undefined }) as StoredProgress;
      hydrate(result);
      setConsented(false);
      setShareConsented(false);
    } catch (error) {
      setSaveError((error as { status?: number })?.status === 403 ? t.accountError : t.saveFailed);
    } finally { setBusy(false); }
  }
  async function shareWithTeacher() {
    if (busy || !shareConsented || sync !== "ready") return;
    setBusy(true);
    try {
      await queueRef.current.catch(() => {});
      const value = await appFetch("academy-energywork", {
        action: "share", version: ENERGYWORK_COURSE_VERSION, consent: true, teacherConsent: true,
      }, "POST", { accountId: accountIdRef.current || undefined }) as StoredProgress;
      hydrate(value);
      setShareConsented(false);
    } catch {
      setSaveError(t.saveFailed);
    } finally { setBusy(false); }
  }
  async function signIn() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await appFetch("auth/start", { locale, continueTo: "energywork" }, "POST") as { redirectUrl?: string };
      if (!response.redirectUrl || !response.redirectUrl.startsWith("https://")) throw new Error("BAD_OAUTH_URL");
      // The short-lived, consented first-lesson handoff is safely kept within
      // this tab, so an expected OAuth navigation should not warn of lost edits.
      let pending: string | null = null;
      try { pending = window.sessionStorage.getItem(ENERGYWORK_FIRST_LESSON_STORAGE_KEY); }
      catch { /* Standard Google login still works without storage. */ }
      authorizedOAuthLeave.current = Boolean(energyworkReadFirstLessonHandoff(pending, locale));
      window.location.assign(response.redirectUrl);
    } catch {
      authorizedOAuthLeave.current = false;
      setSaveError(t.signupError); setBusy(false);
    }
  }
  async function saveLessonOneToCabinet() {
    if (busy || !firstLessonConsent || !["guest", "consent"].includes(sync) ||
        slide.id !== "flight-save") return;
    try {
      const value = energyworkCreateFirstLessonHandoff(answersRef.current, locale);
      // Only a checked and deliberately clicked save action writes temporary
      // private reflections to sessionStorage. Nothing enters the URL.
      window.sessionStorage.setItem(ENERGYWORK_FIRST_LESSON_STORAGE_KEY, value);
      const pending = energyworkReadFirstLessonHandoff(value, locale);
      if (!pending) throw new Error("INVALID_FIRST_LESSON");
      setSaveError(null);
      if (sync === "guest") await signIn();
      else await completeFirstLesson(pending);
    } catch {
      setSaveError(t.firstSaveError);
    }
  }
  const slides = useMemo(() => energyworkSlides(), []);
  const slide = slides[index] ?? slides[0]!;
  const milestoneDecision = slide.kind === "milestone" && slide.id !== "flight-save" && milestoneDecisionId === slide.id;
  const total = slides.length;
  const lessonRanges = useMemo(() => energyworkLessonRanges(), []);
  const currentLessonRange = lessonRanges.find((range) => index >= range.start && index < range.end);
  const savedIndex = sync === "ready" ? Math.max(0, slides.findIndex((item) => item.id === progressRef.current)) : index;
  const reachedIndex = Math.max(index, savedIndex);
  const progressPercent = Math.round((reachedIndex + 1) / total * 100);
  const lessonProgressLabel = currentLessonRange
    ? `${t.lesson} ${currentLessonRange.lesson} · ${t.step} ${index - currentLessonRange.start + 1} ${t.of} ${currentLessonRange.count}`
    : `${t.intro} · ${t.step} ${index + 1} ${t.of} ${lessonRanges[0]!.start}`;
  const completed = slide.kind === "finish";
  useEffect(() => { setMilestoneDecisionId(null); }, [slide.id]);
  // Messenger links contain only a generic public service request — no learner data.
  // Neither link sends automatically; the visitor must confirm in the chat app.
  const reikiWhatsAppUrl = whatsappEnquiryUrl({
    locale, service: "Reiki Practitioner",
    request: locale === "ru"
      ? "Я завершил(а) все пять уроков Reiki Practitioner и хочу двигаться дальше — обсудить личную инициацию."
      : "I've completed all five Reiki Practitioner lessons and would like to move forward with personal initiation.",
    pagePath: "/" + locale + "/academy/principles-of-energywork/learn",
  });
  const reikiTelegramUrl = telegramEnquiryUrlFromWhatsApp(reikiWhatsAppUrl);
  const portraitArt = slide.id === "welcome-01" || slide.id === "flight-01" || slide.id === "tan-01" || slide.id === "flight-done";
  const voicesArt = slide.kind === "voices";
  const artSource = portraitArt || voicesArt ? "/images/holistic-house/reiki-approved-sunrise-v3.webp" : slide.image;
  // Decorative artwork belongs behind the lesson copy, never in a cropped strip.
  // Video playback and the existing welcome/testimonial backgrounds are unaffected.
  const artBackground = Boolean(artSource) && !["welcome", "voices", "video"].includes(slide.kind);
  const experienceMissing = slide.id === "welcome-02" && !slide.question?.options?.some((option) => option.id === answers[slide.id]);
  const isMeditationFeedback = MEDITATION_REPORT_IDS.has(slide.id);
  const meditationReview = meditationReviewText(answers[slide.id] ?? "");
  const feedbackLength = Array.from(meditationReview.trim()).length;
  const feedbackMissing = isMeditationFeedback && feedbackLength < ENERGYWORK_REVIEW_MIN_CHARS;
  const isTantraStudyQuestion = ENERGYWORK_TANTRA_STUDY_QUESTION_IDS.includes(slide.id);
  const unifiedStudyAnswer = slide.secondaryQuestion
    ? energyworkCombinedTantraAnswer(answers[slide.id], answers[slide.secondaryQuestion.id])
    : answers[slide.id];
  const tantraStudyMissing = isTantraStudyQuestion &&
    !energyworkTantraStudyAnswerComplete(unifiedStudyAnswer);
  const isKundaliniStudyQuestion = ENERGYWORK_KUNDALINI_STUDY_QUESTION_IDS.includes(slide.id);
  const isYggdrasilStudyQuestion = ENERGYWORK_YGGDRASIL_STUDY_QUESTION_IDS.includes(slide.id);
  const isReikiStudyQuestion = isTantraStudyQuestion || isKundaliniStudyQuestion || isYggdrasilStudyQuestion;
  const otherStudyMissing = (isKundaliniStudyQuestion || isYggdrasilStudyQuestion) &&
    !energyworkReikiStudyAnswerComplete(answers[slide.id]);
  const media = slide.videoKey ? englishGuidedMeditations.find((item) => item.key === slide.videoKey) : null;
  const notes = safePreviewNotes(slides, answers, locale);
  const highlights = learnerHighlights(answers, locale);
  const lessonNumber = currentLessonRange?.lesson ?? 1;
  const initiationItems = energyworkInitiationRequirements.map((item) => ({
    ...item,
    title: energyworkLessons.find((lesson) => lesson.phase === item.lesson)?.title[locale] ?? item.lesson,
    reportDone: item.reportId === "end-01" ? reikiInitiationRequestValid(answers["end-01"]) : Boolean(answers[item.reportId]?.trim()),
    questionCount: item.questionIds.filter((id) => Boolean(answers[id]?.trim())).length,
    questionDone: item.questionIds.every((id) => Boolean(answers[id]?.trim())),
    nextQuestionId: item.questionIds.find((id) => !answers[id]?.trim()) ?? item.questionId,
  }));
  const readyCount = initiationItems.reduce((count, item) => count + Number(item.reportDone) + item.questionCount, 0);
  const readyTargetCount = initiationItems.reduce((count, item) => count + 1 + item.questionIds.length, 0);
  const initiationReady = readyCount === readyTargetCount;
  // Only show application links for a consented account with saved reports.
  // Guests may explore the lessons and copy their notes before they sign in.
  const savedInitiationReady = initiationReady && sync === "ready" &&
    !busy && !saveError && dirtyRef.current.size === 0;

  function setAnswer(value: string, answerId: string = slide.id) {
    // One textarea on the combined slide updates both existing private answer IDs.
    const mirrorId = answerId === slide.id ? slide.secondaryQuestion?.id : undefined;
    const updated = { ...answersRef.current, [answerId]: value,
      ...(mirrorId ? { [mirrorId]: value } : {}) };
    answersRef.current = updated;
    setAnswers(updated);
    dirtyRef.current.add(answerId);
    if (mirrorId) dirtyRef.current.add(mirrorId);
    setCopyState("idle");
  }
  async function store(nextSlideId: string) {
    if (sync !== "ready") return;
    const current = answersRef.current;
    const secondaryId = slide.secondaryQuestion?.id;
    const combined = secondaryId
      ? energyworkCombinedTantraAnswer(current[slide.id], current[secondaryId])
      : "";
    // Older course records can have only one of the two answer IDs filled.
    // Backfill the missing ID when continuing, without overwriting distinct
    // answers from the original two-field version.
    const needsBackfill = Boolean(secondaryId && combined.trim() &&
      (!current[slide.id]?.trim() || !current[secondaryId]?.trim()));
    const primary = needsBackfill ? combined : current[slide.id] || "";
    const secondary = secondaryId ? (needsBackfill ? combined : current[secondaryId] || "") : undefined;
    const response = await request({
      action: "save", version: ENERGYWORK_COURSE_VERSION,
      slideId: slide.id, nextSlideId,
      ...(slide.question ? { answer: primary } : {}),
      ...(secondaryId ? { secondaryAnswer: secondary } : {}),
    });
    if (needsBackfill && secondaryId &&
        (answersRef.current[slide.id] || "") === (current[slide.id] || "") &&
        (answersRef.current[secondaryId] || "") === (current[secondaryId] || "")) {
      const updated = { ...answersRef.current, [slide.id]: primary, [secondaryId]: secondary || "" };
      answersRef.current = updated;
      setAnswers(updated);
    }
    if ((answersRef.current[slide.id] || "") === primary) dirtyRef.current.delete(slide.id);
    if (secondaryId && (answersRef.current[secondaryId] || "") === secondary)
      dirtyRef.current.delete(secondaryId);
    return response;
  }
  // A learner can revisit a report/question without discarding other lesson answers.
  async function jumpToSlide(id: string) {
    if (busy) return;
    const target = slides.findIndex((item) => item.id === (id === "tan-study-03" ? "tan-study-02" : id));
    if (target < 0) return;
    // Without a verified private save, Lesson 2 and later remain locked.
    if (sync !== "ready" && target > slides.findIndex(item => item.id === "flight-save")) return;
    if (sync === "ready" && slide.question &&
      (dirtyRef.current.has(slide.id) ||
        Boolean(slide.secondaryQuestion && dirtyRef.current.has(slide.secondaryQuestion.id)))) {
      setBusy(true);
      try { await store(slide.id); }
      catch { setSaveError(t.saveFailed); setBusy(false); return; }
      setBusy(false);
    }
    setReviewReturn(id === "paths-04" ? false :
      slide.id === "paths-04" || slide.kind === "finish" ? true : reviewReturn);
    setMilestoneDecisionId(null);
    setIndex(target);
  }
  async function next() {
    if (busy || experienceMissing || feedbackMissing || tantraStudyMissing || otherStudyMissing ||
        (slide.id === "flight-save" && sync !== "ready")) return;
    // A separate visible choice after each milestone; never create a fake server cursor.
    if (slide.kind === "milestone" && slide.id !== "flight-save" && !milestoneDecision) {
      setSaveError(null);
      setMilestoneDecisionId(slide.id);
      return;
    }
    const nextId = slides[Math.min(index + 1, slides.length - 1)]?.id || slide.id;
    // Back / Save review on an already reached slide should move immediately
    // if its answer is unchanged. No duplicate server revision or cursor write.
    const alreadyStored = sync === "ready" && energyworkAdvanceAlreadyStored(
      slide.id, nextId, progressRef.current,
      dirtyRef.current.has(slide.id) ||
        Boolean(slide.secondaryQuestion && dirtyRef.current.has(slide.secondaryQuestion.id)));
    if (sync === "ready" && !alreadyStored) {
      setBusy(true);
      try { await store(nextId); }
      catch (error) {
        if ((error as Error).message !== "USER_CANCELLED")
          setSaveError((error as { status?: number })?.status === 409 ? t.conflict : t.saveFailed);
        setBusy(false); return;
      }
      setBusy(false);
    }
    setSaveError(null);
    setIndex((current) => Math.min(current + 1, slides.length - 1));
  }
  async function finishForToday() {
    if (busy || slide.kind !== "milestone" || slide.id === "flight-save") return;
    if (sync === "guest" || sync === "consent") {
      // Guest learning is not saved until explicit consent, verified Google
      // authentication and a successful private account-scoped API write.
      if (slide.id === "flight-done") {
        setSaveError(null);
        setIndex(slides.findIndex(item => item.id === "flight-save"));
      } else {
        setSaveError(t.accountError);
      }
      return;
    }
    if (sync !== "ready") return;
    const nextId = slides[Math.min(index + 1, slides.length - 1)]?.id || slide.id;
    setBusy(true);
    try {
      await store(nextId);
      setShowInstallOffer(true);
    } catch (error) {
      setSaveError((error as { status?: number })?.status === 409 ? t.conflict : t.saveFailed);
    } finally { setBusy(false); }
  }
  async function previous() {
    if (index === 0 || busy) return;
    if (milestoneDecision) {
      setMilestoneDecisionId(null);
      setSaveError(null);
      return;
    }
    if (sync === "ready" && slide.question &&
      (dirtyRef.current.has(slide.id) ||
        Boolean(slide.secondaryQuestion && dirtyRef.current.has(slide.secondaryQuestion.id)))) {
      setBusy(true);
      try { await store(slide.id); } catch {
        setSaveError(t.saveFailed); setBusy(false); return;
      }
      setBusy(false);
    }
    setIndex((current) => Math.max(0, current - 1));
  }
  async function restart() {
    if (busy || (sync === "ready" && !window.confirm(t.resetConfirm))) return;
    if (sync === "ready") {
      setBusy(true);
      try {
        await queueRef.current.catch(() => {});
        const value = await appFetch("academy-energywork", { action:"delete", confirmed: true }, "POST",
          { accountId: accountIdRef.current || undefined }) as StoredProgress;
        hydrate(value);
      } catch { setSaveError(t.saveFailed); setBusy(false); return; }
      setBusy(false);
    }
    answersRef.current = {};
    setIndex(0); setAnswers({}); setReviewReturn(false); setCopyState("idle");
    setSharingWithTeacher(false);setApplicationLead(null);setApplicationConsented(false);
    dirtyRef.current.clear();
  }
  // A brief debounce preserves reflections while users type; queued writes and
  // revision checks prevent racing a Next button or concurrent browser tab.
  useEffect(() => {
    const secondaryId = slide.secondaryQuestion?.id;
    if (sync !== "ready" || !slide.question ||
      (!dirtyRef.current.has(slide.id) && !(secondaryId && dirtyRef.current.has(secondaryId)))) return;
    const id = slide.id, value = answers[id] ?? "";
    const secondary = secondaryId ? answers[secondaryId] ?? "" : undefined;
    const timer = window.setTimeout(() => {
      void request({action:"save",version:ENERGYWORK_COURSE_VERSION,
        slideId:id,nextSlideId:id,answer:value,
        ...(secondaryId ? { secondaryAnswer: secondary } : {})})
        .then(() => {
          if (value === (answersRef.current[id] ?? "")) dirtyRef.current.delete(id);
          if (secondaryId && secondary === (answersRef.current[secondaryId] ?? ""))
            dirtyRef.current.delete(secondaryId);
        })
        .catch((error: { status?: number }) => { setSaveError(error.status === 409 ? t.conflict : t.saveFailed); });
    }, 950);
    return () => window.clearTimeout(timer);
  }, [sync, slide.id, slide.question, slide.secondaryQuestion, answers, request, t.conflict, t.saveFailed]);
  // Warn before losing a not-yet-confirmed private answer.
  useEffect(() => {
    if (!dirtyRef.current.size) return;
    const beforeLeave = (event: BeforeUnloadEvent) => {
      if (authorizedOAuthLeave.current) return;
      event.preventDefault(); event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeLeave);
    return () => window.removeEventListener("beforeunload", beforeLeave);
  }, [answers, savedAt]);

  async function applyForInitiation() {
    if (busy || !applicationConsented || !savedInitiationReady || !sharingWithTeacher ||
        applicationLead || !reikiInitiationRequestValid(answers["end-01"])) return;
    setBusy(true);setApplicationMessage("");
    try {
      await queueRef.current.catch(() => {});
      const value = await appFetch("academy-energywork", {
        action: "apply", version: ENERGYWORK_COURSE_VERSION,
        expectedRevision: revisionRef.current, confirmed: true,
      }, "POST", { accountId: accountIdRef.current || undefined }) as StoredProgress;
      hydrate(value);
      setApplicationConsented(false);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      setApplicationMessage(code === "COURSE_PROGRESS_CHANGED" ? t.conflict : t.saveFailed);
    } finally { setBusy(false); }
  }
  async function copyNotes() {
    if (!navigator.clipboard?.writeText) {
      setCopyState("error"); return;
    }
    try {
      await navigator.clipboard.writeText(notes);
      setCopyState("success");
    } catch {
      setCopyState("error");
    }
  }

  if (showInstallOffer && sync === "ready") {
    return (
      <main ref={pageRef} className={styles.page + " " + styles.installOfferPage} lang={locale}
        data-reiki-install-offer data-energywork-ai-learner>
        <section className={styles.installOfferCard} aria-labelledby="reiki-install-offer-title">
          <span className={styles.installOfferSaved}><Check size={17} aria-hidden="true" />{t.installPageSaved}</span>
          <div className={styles.installOfferSymbol} aria-hidden="true"><Smartphone size={39} /></div>
          <h1 id="reiki-install-offer-title">{t.installPageTitle}</h1>
          <p>{t.installPageText}</p>
          <Link className={styles.installOfferPrimary} href={"/" + locale + "/install"} prefetch={false}>
            <Smartphone size={20} aria-hidden="true" />{t.installOption}<ArrowRight size={19} aria-hidden="true" />
          </Link>
          <Link className={styles.installOfferSecondary} href={"/" + locale + "/app/course?view=courses"} prefetch={false}>
            {t.installPageLater}
          </Link>
          <button type="button" className={styles.installOfferContinue} onClick={() => {
            setShowInstallOffer(false);
            if (slide.kind === "milestone") setIndex(current => Math.min(current + 1, slides.length - 1));
          }}>{t.installPageContinue}<ArrowRight size={15} aria-hidden="true" /></button>
          <p className={styles.installOfferNote}><LockKeyhole size={15} aria-hidden="true" />{t.installPageNote}</p>
        </section>
      </main>
    );
  }

  return (
    <main ref={pageRef} className={styles.page} lang={locale} data-course-one-screen="v1" data-course-theme="reiki-scenic-v1" data-course-visual="reiki-airy-v2" data-course-portrait="v3" data-reiki-reviews="v4" data-reiki-full-reviews="v1" data-reiki-current-kind={slide.kind} data-reiki-text-question={slide.kind === "reflection" && slide.question?.type === "text" ? "true" : undefined} data-energywork-screen={slide.kind === "welcome" ? "welcome" : "lesson"} data-energywork-phase={slide.phase} data-energywork-ai-learner data-course-id={ENERGYWORK_COURSE_ID} data-course-version={ENERGYWORK_COURSE_VERSION}>
      <div className={styles.shell}>
        {slide.kind === "welcome" ? (
          <header className={styles.top}>
            <Link className={styles.home} href={"/" + locale + "/academy/principles-of-energywork"} aria-label={t.backCourse}>
              <ArrowLeft size={19} aria-hidden="true" /><span>{t.backCourse}</span>
            </Link>
            <span className={styles.courseMark}><Sparkles size={17} aria-hidden="true" />{t.shortTitle}</span>
            <span className={styles.phaseLabel}>{energyworkPhases[slide.phase][locale]}</span>
          </header>
        ) : null}

        <nav className={styles.journey} aria-label={t.fiveLessons}>
          <ol>
            {energyworkLessons.map((lesson, number) => (
              <li key={lesson.phase}
                className={lessonNumber === number + 1 ? styles.journeySelected :
                  lessonNumber > number + 1 ? styles.journeyIntro : ""}
                aria-current={lessonNumber === number + 1 || (lessonNumber === 0 && number === 0) ? "step" : undefined}>
                <span className={styles.journeyDot} aria-hidden="true">
                  {lessonNumber > number + 1 ? <Check size={16} /> : number + 1}
                </span>
                <span className={styles.journeyLabel}>{lesson.title[locale]}</span>
              </li>
            ))}
          </ol>
        </nav>

        <section className={styles.slide + (slide.kind === "welcome" ? " " + styles.welcomeSlide : "") + (slide.id === "welcome-02" ? " " + styles.experienceSlide : "")} key={slide.id + (milestoneDecision ? "-choice" : "")} data-energywork-slide-kind={milestoneDecision ? "decision" : slide.kind} data-energywork-slide-id={milestoneDecision ? slide.id + "-choice" : slide.id} data-reiki-art-layout={artBackground ? "background" : undefined} aria-labelledby="energywork-slide-title">
          {milestoneDecision ? (
            <div className={styles.lessonDecision} data-reiki-lesson-choice-screen>
              <span className={styles.decisionSeal}><Award size={28} aria-hidden="true" /></span>
              <span className={styles.decisionKicker}>{t.decisionKicker} · {t.lesson} {currentLessonRange?.lesson}</span>
              <h1 id="energywork-slide-title">{t.decisionTitle}</h1>
              <p className={styles.decisionIntro}>{t.decisionIntro}</p>
              <div className={styles.decisionActions} role="group" aria-label={t.lessonChoices}>
                <button type="button" className={styles.decisionSave} data-reiki-save-tomorrow data-reiki-tomorrow-choice
                  onClick={finishForToday} disabled={busy || sync === "checking" || sync === "unavailable"}>
                  <Check size={23} aria-hidden="true" />
                  <span><strong>{sync === "ready" ? t.decisionSave : t.decisionGuestSave}</strong>
                    <small>{sync === "ready" ? t.decisionSaveDetail : t.decisionGuestSaveDetail}</small></span>
                  <ArrowRight size={19} aria-hidden="true" />
                </button>
                <button type="button" className={styles.decisionContinue} data-reiki-continue-now
                  onClick={next} disabled={busy || sync === "checking" || sync === "unavailable"}>
                  <ArrowRight size={23} aria-hidden="true" />
                  <span><strong>{t.decisionContinue}</strong>
                    <small>{slide.id === "flight-done" && sync !== "ready" ? t.decisionContinueGuestDetail : t.decisionContinueDetail}</small></span>
                  <ArrowRight size={19} aria-hidden="true" />
                </button>
              </div>
              {saveError ? <p className={styles.milestoneSaveError} role="alert">{saveError}</p> : null}
            </div>
          ) : (
          <div className={styles.slideMain}>
            <div className={styles.content}>
              <span className={styles.eyebrow}><Compass size={17} aria-hidden="true" />{slide.kind === "welcome" ? t.eyebrow : energyworkPhases[slide.phase][locale]}</span>
              <h1 id="energywork-slide-title">{slide.id === "flight-save" ? t.accountSaveTitle : slide.title[locale]}</h1>
              <p className={styles.description}>{slide.id === "flight-save" ? t.accountSaveText : slide.body[locale]}</p>
              {slide.introAudioKey && slide.introTopics ? (
                <section className={styles.lessonIntroPanel} data-reiki-lesson-intro={slide.introAudioKey}
                  aria-label={locale === "ru" ? "Программа занятия" : "What this lesson covers"}>
                  <strong className={styles.lessonIntroTitle}>
                    <BookOpen size={17} aria-hidden="true" />
                    {locale === "ru" ? "Что мы изучим сегодня" : "What we'll explore in this lesson"}
                  </strong>
                  <ul className={styles.lessonIntroTopics}>
                    {slide.introTopics.map((topic, index) => (
                      <li key={index}><Check size={15} aria-hidden="true" />{topic[locale]}</li>
                    ))}
                  </ul>
                  <ReikiLessonIntroAudio key={slide.introAudioKey + "-" + locale}
                    lesson={slide.introAudioKey} locale={locale} />
                </section>
              ) : null}
              {slide.id === "tan-05" ? (
                <Link href={"/" + locale + "/academy/reiki/tantra-reiki"}
                  target="_blank" rel="noopener noreferrer"
                  className={styles.studyButton} data-tantra-study-link>
                  <BookOpen size={18} aria-hidden="true" />
                  {locale === "ru" ? "Читать описание Тантра Рейки" : "Read the Tantra Reiki guide"}
                  <ExternalLink size={16} aria-hidden="true" />
                </Link>
              ) : null}
              {slide.id === "kun-05" ? (
                <Link href={"/" + locale + "/academy/reiki/kundalini-reiki"}
                  target="_blank" rel="noopener noreferrer"
                  className={styles.studyButton} data-kundalini-study-link>
                  <BookOpen size={18} aria-hidden="true" />
                  {locale === "ru" ? "Открыть курс Кундалини Рейки" : "Open Kundalini Reiki Course"}
                  <ExternalLink size={16} aria-hidden="true" />
                </Link>
              ) : null}
              {slide.id === "ygg-05" ? (
                <Link href={"/" + locale + "/academy/reiki/yggdrasil/free-initiation"}
                  target="_blank" rel="noopener noreferrer"
                  className={styles.studyButton} data-yggdrasil-study-link>
                  <BookOpen size={18} aria-hidden="true" />
                  {locale === "ru" ? "Открыть материалы Рейки Иггдрасиль" : "Read the Reiki Yggdrasil guide"}
                  <ExternalLink size={16} aria-hidden="true" />
                </Link>
              ) : null}
              {slide.kind === "welcome" ? (
                <div className={styles.welcomeReward} aria-label={t.welcomeOffer}>
                  <p className={styles.welcomeRewardTitle}><Sparkles size={17} aria-hidden="true" />{t.welcomeOffer}</p>
                  <ul className={styles.welcomeSystems}>
                    {energyworkPathChoices.map((choice) => <li key={choice.id}>{choice.title[locale]}</li>)}
                  </ul>
                  <p className={styles.welcomeRequirement}>{t.welcomeRequirement}</p>
                  <div className={styles.welcomeGift} data-reiki-initiation-gift>
                    <Award size={22} aria-hidden="true" />
                    <div>
                      <strong>{t.welcomeGiftTitle}</strong>
                      <p>{t.welcomeGiftText}</p>
                    </div>
                  </div>
                </div>
              ) : null}
              {slide.kind === "welcome" ? (
                <div className={styles.benefits} aria-label={t.benefits}>
                  <div><span className={styles.benefitIcon}><Leaf size={19} aria-hidden="true" /></span>
                    <strong>{t.shortLessons}</strong><small>{t.shortLessonsDetail}</small></div>
                  <div><span className={styles.benefitIcon}><Heart size={19} aria-hidden="true" /></span>
                    <strong>{t.practicalTasks}</strong><small>{t.practicalTasksDetail}</small></div>
                  <div><span className={styles.benefitIcon}><BarChart3 size={19} aria-hidden="true" /></span>
                    <strong>{t.privateProgress}</strong><small>{t.privateProgressDetail}</small></div>
                </div>
              ) : null}
              {slide.kind === "milestone" && slide.id !== "flight-save" ? (
                <div className={styles.milestoneCard}>
                  <span className={styles.milestoneSymbol}><Award size={34} aria-hidden="true" /></span>
                  <div className={styles.milestoneCopy}>
                    <strong>{slide.id === "flight-done" ? t.firstMilestoneLabel : t.milestoneLabel}</strong>
                    {sync === "ready" ? <p className={styles.milestoneReturn}>{t.returnAnytime}</p> : null}
                  </div>
                </div>
              ) : null}
              {(slide.id === "tan-done" || slide.id === "kun-done") ? (
                 <aside className={styles.personalInitiationNote} data-reiki-personal-initiation-note>
                   <span className={styles.personalInitiationNoteTitle}><Heart size={17} aria-hidden="true" />{t.initiationVideoNoteTitle}</span>
                   <p>{t.initiationVideoNoteText}</p>
                 </aside>
               ) : null}
              {slide.id === "flight-save" ? (
                <aside className={styles.firstLessonSave} data-reiki-first-lesson-save
                  aria-labelledby="energywork-slide-title">
                  <p className={styles.firstLessonAssurance}>
                    <LockKeyhole size={17} aria-hidden="true" />{t.firstSaveAssurance}
                  </p>
                  {sync === "ready" ? (
                    <p className={styles.firstLessonSaved} data-reiki-first-lesson-saved>
                      <Check size={18} aria-hidden="true" />{t.firstSaveReady}
                    </p>
                  ) : (
                    <>
                      <label className={styles.consentLabel}>
                        <input type="checkbox" checked={firstLessonConsent}
                          onChange={event => setFirstLessonConsent(event.target.checked)}
                          data-reiki-first-lesson-consent />
                        <span>{t.firstSaveConsent}</span>
                      </label>
                      <p className={styles.firstLessonPrivacy}>
                        <Link href="/privacy" target="_blank" rel="noopener noreferrer">{t.firstSavePolicy}</Link>
                        {" · "}{t.reviewPrivate}
                      </p>
                    </>
                  )}
                  {saveError ? <p className={styles.firstLessonError} role="alert">{saveError}</p> : null}
                </aside>
              ) : null}
              {slide.kind === "voices" ? <MeditationVoices key={slide.id} slide={slide} locale={locale} youtubeId={media?.youtubeId ?? undefined} /> : null}
              {slide.kind === "practice" ? <PracticeTimer key={slide.id} locale={locale} durationSeconds={["flight-03", "tan-03", "kun-03", "ygg-03"].includes(slide.id) ? 60 : 120} /> : null}

              {slide.id === "paths-04" ? (
                <div className={styles.reviewChecklist} data-initiation-readiness>
                  <h2>{t.reviewTitle} · {readyCount}/{readyTargetCount}</h2>
                  <p>{initiationReady ? (savedInitiationReady ? t.reviewDone : t.reviewSaveNeeded) : t.reviewNeeded}</p>
                  <div className={styles.reviewRows}>
                    {initiationItems.map((item) => (
                      <div className={styles.reviewRow} key={item.lesson}>
                        <strong>{item.title}{item.questionIds.length > 1 ? ` · ${item.questionCount}/${item.questionIds.length}` : ""}</strong>
                        <div>
                          <button type="button" onClick={() => jumpToSlide(item.reportId)}
                            className={item.reportDone ? styles.reviewRecorded : styles.reviewMissing}>
                            {item.reportDone ? <Check size={13} aria-hidden="true" /> : null}
                            {item.reportDone ? t.reportReady : t.reportMissing}
                          </button>
                          {item.questionIds.length > 0 ? <button type="button" onClick={() => jumpToSlide(item.nextQuestionId)}
                            className={item.questionDone ? styles.reviewRecorded : styles.reviewMissing}>
                            {item.questionDone ? <Check size={13} aria-hidden="true" /> : null}
                            {item.questionDone ? t.questionReady : t.questionMissing}
                          </button> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className={styles.reviewPrivacy}><LockKeyhole size={14} aria-hidden="true" />{t.reviewPrivate}</p>
                </div>
              ) : null}

              {slide.id === "end-01" ? (
                <ReikiInitiationRequestForm value={answers["end-01"] ?? ""} locale={locale}
                  onChange={(value) => setAnswer(value, "end-01")} />
              ) : slide.question ? (
                <div className={styles.question}>
                  <span className={styles.questionBadge}><BookOpen size={15} aria-hidden="true" />{slide.id === "welcome-02" ? t.experienceBadge :
                     isMeditationFeedback ? t.feedbackBadge :
                     initiationItems.some((item) => item.reportId === slide.id) ? t.meditationReport :
                     initiationItems.some((item) => item.questionIds.includes(slide.id)) ? (isReikiStudyQuestion ? t.lessonQuestion + ' · ' + t.required : t.lessonQuestion) : t.optional}</span>
                  {slide.question.type === "choice"
                    ? <p className={styles.prompt}>{slide.question.prompt[locale]}</p>
                    : <label className={styles.prompt} htmlFor={"answer-" + slide.id}>{slide.question.prompt[locale]}</label>}
                  {isKundaliniStudyQuestion && slide.question.options?.length ? (
                    <div className={styles.choices} role="group"
                      aria-label={slide.question.prompt[locale]} data-kundalini-answer-options>
                      {slide.question.options.map((option) => (
                        <label key={option.id} className={styles.choice}>
                          <input type="radio" name={slide.id + "-suggestion"} value={option.id}
                            checked={[option.label.en, option.label.ru].includes(answers[slide.id] ?? "")}
                            onChange={() => setAnswer(option.label[locale])} />
                          <span>{option.label[locale]}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                  {slide.secondaryQuestion ? (
                    <p className={styles.tantraSecondPrompt}
                      id={"tantra-second-" + slide.secondaryQuestion.id} data-tantra-study-combined>
                      {slide.secondaryQuestion.prompt[locale]}
                    </p>
                  ) : null}
                  {slide.question.type === "text" ? (
                    <textarea id={"answer-" + slide.id}
                      value={isMeditationFeedback ? meditationReview : slide.secondaryQuestion ? unifiedStudyAnswer ?? "" : (answers[slide.id] ?? "")}
                      onChange={(e) => setAnswer(isMeditationFeedback ? e.target.value : e.target.value.slice(0, 1600))}
                      className={styles.textarea + (isMeditationFeedback ? " " + styles.feedbackTextarea : "")}
                      maxLength={isMeditationFeedback ? undefined : 1600} rows={slide.secondaryQuestion ? 5 : isKundaliniStudyQuestion ? 2 : 4}
                      placeholder={isMeditationFeedback ? t.feelingPlaceholder : isKundaliniStudyQuestion ? (locale === "ru" ? "Или напишите свой ответ…" : "Or write your own answer…") : isReikiStudyQuestion ? t.tantraAnswerPlaceholder : slide.id === "flight-03" ? t.sunReflectionPlaceholder : t.placeholder}
                      required={isReikiStudyQuestion}
                      aria-describedby={isTantraStudyQuestion ? (slide.secondaryQuestion ? "tantra-second-" + slide.secondaryQuestion.id + " " : "") + "tantra-study-help-" + slide.id : (isKundaliniStudyQuestion || isYggdrasilStudyQuestion) ? "reiki-study-help-" + slide.id : undefined}
                      autoComplete="off" />
                  ) : null}
                  {isMeditationFeedback ? <p className={styles.feedbackCount} aria-live="polite">{feedbackLength} {t.feedbackCharacters} · {t.feedbackMinimum}</p> : null}
                  {slide.question.type === "scale" ? (
                    <div className={styles.scaleWrap}>
                      <input id={"answer-" + slide.id} className={styles.scale} type="range" min="0" max="10" step="1"
                        value={answers[slide.id] ?? "5"} onChange={(e) => setAnswer(e.target.value)} />
                      <div className={styles.scaleEnds}><span>0</span><strong>{answers[slide.id] === undefined ? "—" : answers[slide.id] + " / 10"}</strong><span>10</span></div>
                    </div>
                  ) : null}
                  {slide.question.type === "choice" ? (
                    <div id={"answer-" + slide.id} className={styles.choices} role="group" aria-label={t.value}>
                      {slide.question.options?.map((option) => (
                        <label key={option.id} className={styles.choice + (slide.id === "welcome-02" ? " " + styles.experienceChoice : "")}>
                          {slide.id === "welcome-02" ? (
                            <span className={styles.experienceIcon} aria-hidden="true">
                              {option.id === "beginner" ? <Sprout size={19} /> :
                                option.id === "energywork" ? <HandHeart size={19} /> :
                                  option.id === "reiki-1-2" ? <Sparkles size={19} /> : <Award size={19} />}
                            </span>
                          ) : null}
                          <input type="radio" name={slide.id} value={option.id}
                            checked={answers[slide.id] === option.id} onChange={() => setAnswer(option.id)} />
                          <span>{option.label[locale]}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                  {slide.id === "welcome-02" && !experienceMissing ? (
                    <p className={styles.experienceGuidance} role="status">{experienceGuidance[locale][answers[slide.id]]}</p>
                  ) : null}
                  {isKundaliniStudyQuestion && slide.question.help && (answers[slide.id] || "").trim() ? (
                    <p className={styles.optional} data-kundalini-answer-explanation role="status">{slide.question.help[locale]}</p>
                  ) : null}
                  {isTantraStudyQuestion ? (
                    <div className={styles.tantraStudyHelp} id={"tantra-study-help-" + slide.id} data-tantra-study-required>
                      <span className={styles.tantraStudyRequired}>{t.tantraAnswerRequired}</span>
                      <Link className={styles.tantraStudyLink}
                        href={"/" + locale + "/academy/reiki/tantra-reiki" + TANTRA_STUDY_HINT_ANCHORS[slide.id]}
                        target="_blank" rel="noopener noreferrer" data-tantra-study-hint>
                        <BookOpen size={15} aria-hidden="true" />{t.tantraStudyHint}<ExternalLink size={13} aria-hidden="true" />
                      </Link>
                    </div>
                  ) : isKundaliniStudyQuestion || isYggdrasilStudyQuestion ? (
                    <div className={styles.tantraStudyHelp} id={"reiki-study-help-" + slide.id} data-reiki-study-required>
                      <span className={styles.tantraStudyRequired}>{t.tantraAnswerRequired}</span>
                      <Link className={styles.tantraStudyLink}
                        href={"/" + locale + "/academy/reiki/" + (isKundaliniStudyQuestion ? "kundalini-reiki" : "yggdrasil/free-initiation")}
                        target="_blank" rel="noopener noreferrer" data-reiki-study-hint>
                        <BookOpen size={15} aria-hidden="true" />{t.tantraStudyHint}<ExternalLink size={13} aria-hidden="true" />
                      </Link>
                    </div>
                  ) : (
                    <p className={styles.optional + (isMeditationFeedback ? " " + styles.feedbackRequired : "")}
                      role={feedbackMissing ? "status" : undefined}>{slide.id === "welcome-02" ? t.experienceNote :
                      isMeditationFeedback ? (feedbackMissing ? t.reviewMissing : t.feedbackPrivacy) :
                      initiationItems.some((item) => item.reportId === slide.id || item.questionIds.includes(slide.id))
                      ? t.optionalForLearning : t.blank}</p>
                  )}
                  {reviewReturn && !feedbackMissing && initiationItems.some((item) => item.reportId === slide.id || item.questionIds.includes(slide.id)) ?
                    <button type="button" className={styles.returnToReview} onClick={() => jumpToSlide("paths-04")}
                      disabled={busy}>{t.backToReview}<ArrowRight size={15} aria-hidden="true" /></button> : null}
                </div>
              ) : null}

              {slide.kind === "finish" ? (
                <div className={styles.final}>
                  <span className={styles.finalTag}><Award size={18} aria-hidden="true" />{t.finish}</span>
                  <section className={styles.initiationRequestBox} data-reiki-initiation-request>
                    {applicationLead ? (
                      <div className={styles.finalReceipt} data-reiki-application-accepted role="status">
                        <Check size={24} aria-hidden="true" />
                        <div>
                          <strong>{t.finalAcceptedHeading}</strong>
                          <p>{t.initiationSent}</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h2>{t.finalPendingHeading}</h2>
                        <p>{t.initiationLetterHint}</p>
                        {!savedInitiationReady ? (
                          <div className={styles.finalPending} data-reiki-application-pending>
                            <p>{!initiationReady ? t.initiationNotReady : sync !== "ready" ? t.reviewSaveNeeded : t.saving}</p>
                            <button type="button" className={styles.reviewMissing}
                              onClick={() => jumpToSlide("paths-04")} disabled={busy}>
                              {t.finalReviewChecklist}<ArrowRight size={15} aria-hidden="true" />
                            </button>
                          </div>
                        ) : !sharingWithTeacher ? (
                          <div className={styles.initiationApplication} data-reiki-final-share-consent>
                            <p className={styles.initiationHint}>{t.initiationShareNeeded}</p>
                            <label className={styles.consentLabel}>
                              <input type="checkbox" checked={shareConsented}
                                onChange={event => setShareConsented(event.target.checked)} />
                              <span>{t.teacherShareConsent}</span>
                            </label>
                            <button type="button" className={styles.initiationSend}
                              disabled={busy || !shareConsented} onClick={shareWithTeacher}>
                              {t.finalEnableShare}<ArrowRight size={18} aria-hidden="true" />
                            </button>
                          </div>
                        ) : !reikiInitiationRequestValid(answers["end-01"]) ? (
                          <p className={styles.initiationHint}>{t.initiationTooShort}{" "}
                            <button type="button" className={styles.reviewMissing}
                              onClick={() => jumpToSlide("end-01")}>
                              {locale === "ru" ? "Открыть анкету" : "Open the form"}
                            </button>
                          </p>
                        ) : (
                          <div className={styles.initiationApplication}>
                            <blockquote className={styles.letterPreview}>
                              {formatReikiInitiationRequest(answers["end-01"], locale)}
                            </blockquote>
                            <label className={styles.consentLabel}>
                              <input type="checkbox" checked={applicationConsented}
                                onChange={event => setApplicationConsented(event.target.checked)} />
                              <span>{t.initiationConfirm}</span>
                            </label>
                            <button type="button" className={styles.initiationSend}
                              disabled={busy || !applicationConsented} onClick={applyForInitiation}>
                              {t.initiationSend}<ArrowRight size={18} aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    {applicationMessage ? <p role="alert">{applicationMessage}</p> : null}
                  </section>
                  <section className={styles.finalContact} data-reiki-personal-contact
                    aria-label={t.finalContactHeading}>
                    <h2><MessageCircle size={19} aria-hidden="true" />{t.finalContactHeading}</h2>
                    <p>{t.finalContactNote}</p>
                    <div className={styles.finalContactActions}>
                      <a className={styles.finalContactLink} href={reikiWhatsAppUrl}
                        target="_blank" rel="noopener noreferrer">
                        WhatsApp <ExternalLink size={16} aria-hidden="true" />
                      </a>
                      <a className={styles.finalContactLink} href={reikiTelegramUrl}
                        target="_blank" rel="noopener noreferrer">
                        Telegram <ExternalLink size={16} aria-hidden="true" />
                      </a>
                    </div>
                  </section>
                  <section className={styles.finalRevisit} aria-label={t.finalRevisit}
                    data-reiki-final-revisit>
                    <h2>{t.finalRevisit}</h2>
                    <div className={styles.finalRevisitGrid}>
                      {energyworkLessons.map((lesson, lessonIndex) => (
                        <button key={lesson.phase} type="button" disabled={busy}
                          onClick={() => jumpToSlide(lesson.firstSlideId)}
                          className={styles.finalRevisitButton}>
                          {lessonIndex + 1}. {lesson.title[locale]}
                          <ArrowLeft size={13} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </section>
                  <h2>{locale === "ru" ? "Ваши личные учебные итоги" : "Your personal learning highlights"}</h2>
                  <p className={styles.guideNote}>{locale === "ru"
                    ? "Сводка составлена только по вашим собственным ответам и выбору. Это не диагноз и не автоматическая интерпретация личности."
                    : "A simple summary of your own recorded answers and choices. Not a diagnosis or automatic personality interpretation."}</p>
                  {highlights.length ? <ul className={styles.highlights}>
                    {highlights.map((point, index) => <li key={index}>{point}</li>)}
                  </ul> : <p>{locale === "ru" ? "Вы можете вернуться к заданиям и записать наблюдения." : "You can return to the activities to add optional reflections."}</p>}
                  <h2>{t.summary}</h2>
                  <pre className={styles.notes}>{Object.values(answers).some((value) => value.trim()) ? notes : t.nothing}</pre>
                  <p>{t.finishNote}</p>
                  <button type="button" className={styles.copyButton} onClick={copyNotes}><ClipboardCopy size={17} aria-hidden="true" />{copyState === "success" ? t.copied : t.copy}</button>
                  <button type="button" className={styles.copyButton} onClick={() => window.print()}>{t.print}</button>
                  {copyState === "error" ? <p role="alert">{t.failed}</p> : null}
                  <h2>{t.reviewTitle} · {readyCount}/{readyTargetCount} {t.readyCount}</h2>
                  <p>{initiationReady ? (savedInitiationReady ? t.reviewDone : t.reviewSaveNeeded) : t.reviewNeeded}</p>
                  {!savedInitiationReady ? (
                    <div className={styles.reviewRows}>
                      {initiationItems.map((item) => (
                        <div className={styles.reviewRow} key={item.lesson}>
                          <strong>{item.title}{item.questionIds.length > 1 ? ` · ${item.questionCount}/${item.questionIds.length}` : ""}</strong>
                          <div>
                            {!item.reportDone ? <button type="button" onClick={() => jumpToSlide(item.reportId)} className={styles.reviewMissing}>{t.reportMissing}</button> : null}
                            {!item.questionDone ? <button type="button" onClick={() => jumpToSlide(item.nextQuestionId)} className={styles.reviewMissing}>{t.questionMissing}</button> : null}
                            {item.reportDone && item.questionDone ? <span className={styles.reviewRecorded}><Check size={13} />{t.picked}</span> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.reviewDoneMessage}>{applicationLead ? t.initiationSent : t.initiationLetterHint}</p>
                  )}
                  <p className={styles.reviewPrivacy}><LockKeyhole size={14} aria-hidden="true" />{t.reviewPrivate}</p>
                  <p className={styles.initiationNote}>{t.noInitiation}</p>
                  <h2>{t.source}</h2>
                  <div className={styles.initiationLinks}>
                    {energyworkPathChoices.map((choice) => (
                      <Link key={choice.id} className={styles.textLink}
                        href={"/" + locale + "/academy/" + choice.studyPath}>
                        {choice.title[locale]} <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                  <button type="button" className={styles.restart} onClick={restart} disabled={busy}>{t.restart}</button>
                </div>
              ) : null}
            </div>
            {artSource ? (
              <div className={styles.art} data-reiki-person={portraitArt || voicesArt ? "true" : undefined}
                 data-reiki-diagram={artBackground && artSource?.includes("kundalini-manual") ? "true" : undefined}
                 aria-hidden={artBackground ? true : undefined}>
                <Image src={artSource}
                  alt={artBackground ? "" : portraitArt || voicesArt ? (locale === "ru" ? "Женщина спокойно медитирует в лучах утреннего солнца" : "Woman resting peacefully in morning sunlight") : ""}
                  fill priority={index === 0 || voicesArt} unoptimized={portraitArt || voicesArt}
                  sizes="(max-width: 720px) 100vw, 42vw" />
              </div>
            ) : null}
            {slide.kind === "video" ? (
              <div className={styles.video}>
                {media?.youtubeId ? <AcademyVideoPlayer key={slide.id} youtubeId={media.youtubeId} title={media.title} /> :
                  <p className={styles.missingVideo}><PlayCircle size={24} aria-hidden="true" />{t.unavailable}</p>}
                {media?.youtubeId ? <p className={styles.videoCaption}>{t.audio} · {media.title}</p> : null}
              </div>
            ) : null}
          </div>
          )}
          {slide.id === "flight-save" ? (
            <div className={styles.firstLessonSaveDock} data-reiki-save-dock>
              <button type="button" className={styles.firstLessonSaveAction}
                onClick={sync === "ready" ? next : saveLessonOneToCabinet}
                disabled={busy || sync === "checking" || sync === "unavailable" || (sync !== "ready" && !firstLessonConsent)}
                data-reiki-first-lesson-google-save>
                {sync === "guest" ? <span className={styles.googleMark} aria-hidden="true">G</span> : <Check size={18} aria-hidden="true" />}
                {busy ? t.saving : sync === "guest" ? t.firstSaveGoogle : t.firstSaveAccount}
                <ArrowRight size={19} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </section>

        <div className={styles.progressFooter}>
          <div className={styles.progressHeader}>
            <span className={styles.progressStep}>{milestoneDecision ? t.decisionStep : lessonProgressLabel}</span>
            <div className={styles.progressStatus}>
              <span>{progressPercent}% {t.completedLabel}</span>
              <ReikiCourseReferralShare locale={locale} />
            </div>
          </div>
          <div className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={total}
            aria-valuenow={reachedIndex + 1} aria-label={t.lesson}>
            <span style={{ width: progressPercent + "%" }} />
          </div>
          <div className={styles.savedLine} data-reiki-private-save-status aria-live="polite">
            {sync === "ready" ? <>
              <LockKeyhole size={13} aria-hidden="true" />
              <span>{busy || dirtyRef.current.size > 0 ? t.saving : t.saved}</span>
              <Link href={"/" + locale + "/app/course?view=courses"} prefetch={false}>{t.myCourses}</Link>
            </> : null}
            {sync === "guest" ? <span>{t.preview}</span> : null}
            {sync === "checking" ? <span>{t.checking}</span> : null}
            {sync === "consent" ? (
              slide.id === "flight-save" ? null : (
                <details className={styles.saveSettings}>
                  <summary>{t.consentTitle}</summary>
                  <label className={styles.consentLabel}>
                    <input type="checkbox" checked={consented}
                      onChange={event => setConsented(event.target.checked)} />
                    <span>{t.consentText}</span>
                  </label>
                  <button type="button" className={styles.syncButton}
                    disabled={!consented || busy} onClick={startSaving}>{t.enableSave}</button>
                </details>
              )
            ) : null}
            {sync === "unavailable" ? <>
              <span>{t.offline}</span>
              <button type="button" onClick={reloadProgress} disabled={busy}>{t.retry}</button>
            </> : null}
            {saveError ? <p className={styles.saveStatusError} role="alert">
              {saveError}
              <button type="button" onClick={reloadProgress} disabled={busy}>{t.reload}</button>
            </p> : null}
          </div>
        </div>

        <section className={styles.programme} data-expanded={programmeOpen ? "true" : "false"} aria-label={t.program}>
          <div className={styles.programmeBody} id="reiki-journey-help" hidden={!programmeOpen}>
            <p className={styles.programmeIntro}>{t.programmeIntro}</p>
            <div className={styles.programmeSystems}>
              {energyworkPathChoices.map((choice) => (
                <p key={choice.id} className={styles.programmeSystem}>
                  <strong>{choice.title[locale]}</strong>
                  <span className={styles.programmeSystemDescription}>— {programmeSystemDescriptions[locale][choice.id]}</span>
                  <Link className={styles.programmeSystemLink}
                    href={"/" + locale + "/academy/" + choice.studyPath}
                    target="_blank" rel="noopener noreferrer"
                    aria-label={choice.title[locale] + " — " + t.systemDetails}>
                    {t.programmeRead}<ExternalLink size={12} aria-hidden="true" />
                  </Link>
                </p>
              ))}
            </div>
          </div>
          <button type="button" className={styles.programmeSummary}
            aria-expanded={programmeOpen} aria-controls="reiki-journey-help"
            onClick={() => setProgrammeOpen((open) => !open)}>
            <span className={styles.programmeSummaryIcon}><BookOpen size={17} aria-hidden="true" /></span>
            <span className={styles.programmeSummaryCopy}><strong>{t.program}</strong></span>
            <ChevronDown className={styles.programmeChevron} size={18} aria-hidden="true" />
          </button>
        </section>
        <footer className={styles.footer}>
          <div className={styles.actions + (slide.kind === "milestone" ? " " + styles.milestoneActions : "")}>
            {slide.kind === "milestone" ? (
              <button type="button" onClick={previous} disabled={index === 0 || busy || sync === "checking"}
                className={styles.milestoneBack} aria-label={t.back} title={t.back}>
                <ArrowLeft size={19} aria-hidden="true" />
              </button>
            ) : (
              <button type="button" onClick={previous} disabled={index === 0 || busy || sync === "checking"}
                className={styles.back}><ArrowLeft size={18} aria-hidden="true" />{t.back}</button>
            )}
            {slide.kind === "milestone" && slide.id !== "flight-save" && !milestoneDecision ? (
              <button type="button" onClick={next} disabled={busy || sync === "checking"}
                className={styles.next} data-energywork-next>
                {t.chooseNext}<ArrowRight size={19} aria-hidden="true" />
              </button>
            ) : null}
            {slide.kind !== "milestone" && !completed ? (
              <button type="button" onClick={next}
                disabled={busy || sync === "checking" || experienceMissing || feedbackMissing || tantraStudyMissing || otherStudyMissing}
                className={styles.next} data-energywork-next>
                {isMeditationFeedback ? t.saveReview : slide.kind === "welcome" ? t.startFree : t.continue}
                <ArrowRight size={19} aria-hidden="true" />
              </button>
            ) : null}
          </div>
          {slide.kind === "milestone" && slide.id !== "flight-save" && !milestoneDecision && saveError
            ? <p className={styles.milestoneSaveError} role="alert">{saveError}</p> : null}
          {slide.kind !== "milestone" && slide.id !== "flight-save" && saveError ?
            <p className={styles.inlineSaveError} role="alert">{saveError}</p> : null}
        </footer>
      </div>
    </main>
  );
}
