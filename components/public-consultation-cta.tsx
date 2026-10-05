const copy = {
  en: {
    eyebrow: "A gentle first step",
    title: "You can simply write to me",
    text: "Send a short note in the app you already use. No long form and no pressure — we can simply see what may be useful.",
    whatsapp: "WhatsApp · +1 437 606 6502",
    telegram: "Telegram · @AndyTherapist",
    message: "Hello Andy. I found you through Holistic House and would like to ask about a personal consultation.",
  },
  ru: {
    eyebrow: "Мягкий первый шаг",
    title: "Можно просто написать мне",
    text: "Коротко расскажите, что сейчас важно. Без длинной формы и обязательств — посмотрим, какой формат может быть полезен.",
    whatsapp: "WhatsApp · +1 437 606 6502",
    telegram: "Telegram · @AndyTherapist",
    message: "Здравствуйте, Андрей. Я пишу с сайта Holistic House и хотел(а) бы уточнить насчёт личной консультации.",
  },
  es: {
    eyebrow: "Un primer paso sencillo",
    title: "Puedes escribirme directamente",
    text: "Cuéntame brevemente qué te gustaría explorar. Sin formularios largos ni compromiso — vemos qué puede ser útil.",
    whatsapp: "WhatsApp · +1 437 606 6502",
    telegram: "Telegram · @AndyTherapist",
    message: "Hola Andy. Te escribo desde Holistic House y me gustaría consultar sobre una sesión personal.",
  },
} as const;

export function PublicConsultationCta({ locale, id }: { locale: "en" | "ru" | "es"; id?: string }) {
  const text = copy[locale];
  const whatsappUrl = `https://wa.me/14376066502?text=${encodeURIComponent(text.message)}`;

  return (
    <aside className="public-consultation-cta" id={id} aria-label={text.title} data-consultation-cta lang={locale}>
      <div className="public-consultation-cta__copy">
        <p>{text.eyebrow}</p>
        <h2>{text.title}</h2>
        <span>{text.text}</span>
      </div>
      <div className="public-consultation-cta__actions">
        <a href={whatsappUrl} rel="noopener noreferrer" target="_blank" data-contact-channel="whatsapp">
          {text.whatsapp}<span aria-hidden="true">↗</span>
        </a>
        <a href="https://t.me/AndyTherapist" rel="noopener noreferrer" target="_blank" data-contact-channel="telegram">
          {text.telegram}<span aria-hidden="true">↗</span>
        </a>
      </div>
    </aside>
  );
}
