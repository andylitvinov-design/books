import Link from "next/link";
import { ArrowRight, ArrowUpRight, MessageCircle, Send } from "lucide-react";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import type { Locale } from "@/data/remedies";

const text = {
  en: {
    eyebrow: "A gentle first step",
    title: "You can simply write to me",
    description: "Ask about working together, or begin with a free written situation assessment using a short form and hand-drawn sketch. No need to choose a method first.",
    whatsapp: "WhatsApp · +1 437 606 6502",
    telegram: "Telegram · @AndyTherapist",
    free: "Request a free situation assessment",
    message: "Hello Andrey! I'm visiting Holistic House and would like to ask about a personal consultation. Please tell me about the available options.",
  },
  ru: {
    eyebrow: "Спокойный первый шаг",
    title: "Можно просто написать мне",
    description: "Спросите о личной работе или начните с бесплатной письменной диагностики по короткой анкете и рисунку от руки. Не нужно заранее выбирать метод.",
    whatsapp: "WhatsApp · +1 437 606 6502",
    telegram: "Telegram · @AndyTherapist",
    free: "Бесплатная диагностика ситуации",
    message: "Здравствуйте, Андрей! Я на сайте Holistic House и хочу уточнить возможность индивидуальной консультации. Подскажите, пожалуйста, доступные варианты.",
  },
} as const;

/**
 * A true homepage contact panel. This is not the long multi-choice public
 * consultation form — visitors should immediately see the two familiar
 * contact buttons shown in the owner-approved visual reference.
 */
export function HomepageContactCta({ locale }: { locale: Locale }) {
  const c = text[locale];
  const message = "https://wa.me/14376066502?text=" + encodeURIComponent(c.message);
  return (
    <section className="home-contact-capture" data-home-contact-capture lang={locale} aria-labelledby="home-contact-title">
      <div className="home-contact-capture__copy">
        <p className="service-home-kicker">{c.eyebrow}</p>
        <h2 id="home-contact-title">{c.title}</h2>
        <p>{c.description}</p>
      </div>
      <div className="home-contact-capture__actions">
        <AcquisitionEventLink
          className="home-contact-capture__primary"
          prefetch={false}
          href={message}
          target="_blank"
          rel="noopener noreferrer"
          attributes={{ "data-contact-channel": "whatsapp" }}
          event="service_request_start"
        >
          <MessageCircle size={20} aria-hidden="true" />
          <span>{c.whatsapp}</span>
          <ArrowUpRight size={18} aria-hidden="true" />
        </AcquisitionEventLink>
        <AcquisitionEventLink
          className="home-contact-capture__secondary"
          prefetch={false}
          href="https://t.me/AndyTherapist"
          target="_blank"
          rel="noopener noreferrer"
          attributes={{ "data-contact-channel": "telegram" }}
          event="contact_click"
        >
          <Send size={19} aria-hidden="true" />
          <span>{c.telegram}</span>
          <ArrowUpRight size={18} aria-hidden="true" />
        </AcquisitionEventLink>
        <Link className="home-contact-capture__free" href={`/${locale}/services/free-situation-review`}>
          {c.free}<ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
