"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight, BookOpen, Heart, Leaf, Sparkles } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { ReikiDaybookStart } from "./reiki-practitioner-entry";
import styles from "./principles-of-energywork.module.css";

const photos = ["/images/holistic-house/course-focus-mountain-boy.webp","/images/holistic-house/messenger-zen-stones.svg","/images/holistic-house/magic-mirror-lotus.webp","/images/holistic-house/ideas-pine-reference.webp"] as const;
const icons = [BookOpen, Heart, Leaf, Sparkles] as const;
const copy = {
  en: { heading:"Where would you like to begin?", next:"Your starting point", options:[
    ["I’m new to Reiki","Begin gently and learn the basics","Start with Flight to the Sun in Week 1, then discover the three Reiki traditions."],
    ["Energy & health","Explore vitality and body awareness","Begin with gentle attention to your body and breathing. Reiki is not medical treatment."],
    ["Emotional balance","Explore calm and self-awareness","Begin with presence and reflection, at your own pace."],
    ["Intuition & growth","Deepen awareness and spiritual practice","Explore intention, symbols and the three traditions through the five-week course."]
  ] },
  ru: { heading:"С чего вы хотите начать?", next:"Ваша отправная точка", options:[
    ["Я новичок в Рейки","Мягкое знакомство с основами","Начните с «Полёта к Солнцу» на первой неделе, затем познакомьтесь с тремя традициями."],
    ["Энергия и здоровье","Внимание к телу и жизненным силам","Начните с мягкого внимания к телу и дыханию. Рейки не является медицинским лечением."],
    ["Эмоциональный баланс","Спокойствие и контакт с собой","Начните с присутствия и рефлексии в комфортном темпе."],
    ["Интуиция и развитие","Осознанность и духовная практика","Изучите намерение, символы и три традиции в пяти неделях курса."]
  ] },
  es: { heading:"¿Por dónde te gustaría empezar?", next:"Tu punto de partida", options:[
    ["Soy nuevo en Reiki","Conoce las bases a tu ritmo","Empieza con Vuelo hacia el Sol en la primera semana y descubre las tres tradiciones."],
    ["Energía y salud","Explora la vitalidad y la conciencia corporal","Empieza prestando atención al cuerpo y la respiración. Reiki no es un tratamiento médico."],
    ["Equilibrio emocional","Explora la calma y la conciencia","Empieza con presencia y reflexión a tu ritmo."],
    ["Intuición y crecimiento","Conciencia y práctica espiritual","Explora la intención, los símbolos y las tres tradiciones durante cinco semanas."]
  ] },
} as const;

export function MyReikiQuiz({ locale }: { locale: PublicLocale }) {
  const [selected,setSelected] = useState<number | null>(null);
  const t = copy[locale];
  return <section className={styles.reikiQuiz} aria-labelledby="reiki-quiz-heading" data-my-reiki-quiz>
    <h2 id="reiki-quiz-heading">{t.heading}</h2>
    <div className={styles.reikiQuizGrid}>{t.options.map(([title,detail],index) => {
      const Icon = icons[index];
      return <button key={index} type="button" className={styles.reikiQuizCard} data-reiki-quiz-option={index} aria-pressed={selected === index} onClick={()=>setSelected(previous=>previous===index?null:index)}>
        <span className={styles.reikiQuizPhoto}><Image src={photos[index]} alt="" fill sizes="(max-width: 700px) 18vw, 150px" unoptimized /></span>
        <span className={styles.reikiQuizCopy}><strong><Icon size={17} aria-hidden="true" />{title}</strong><small>{detail}</small></span><ArrowRight size={17} aria-hidden="true" />
      </button>;
    })}</div>
    {selected !== null && <div className={styles.reikiQuizResult} aria-live="polite"><strong>{t.next}</strong><p>{t.options[selected][2]}</p><ReikiDaybookStart locale={locale} className={styles.primaryButton} /></div>}
  </section>;
}
