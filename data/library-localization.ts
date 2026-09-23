import type { Book } from "@/data/library";
import type { Locale } from "@/data/remedies";

type LocalizedBookText = {
  title: string;
  description: string;
  category: string;
};

const en: Record<string, LocalizedBookText> = {
  "alchemy-homeopathy-foundations": { title: "Book 01. Homeopathy: foundations and method", description: "A foundational Alchemy of the Soul volume introducing the framework, core principles, and starting logic of the method.", category: "Alchemy of the Soul" },
  "alchemy-homeopathy-remedies": { title: "Book 02. Homeopathic remedies and profiles", description: "A practical continuation focused on remedies, profiles, and applied navigation through the material.", category: "Alchemy of the Soul" },
  "alchemy-naturopathy-hormones": { title: "Book 03. Naturopathy: supplements, minerals, and hormonal support", description: "A naturopathic volume focused on support, supplements, and broader systemic accompaniment.", category: "Alchemy of the Soul" },
  "alchemy-naturopathy-oils": { title: "Book 04. Naturopathy: essential oils, herbs, and natural carriers", description: "A separate volume on herbs, essential oils, and natural support tools within the Alchemy of the Soul series.", category: "Alchemy of the Soul" },
  "alchemy-bach-foundations": { title: "Book 05. Bach flower essences: introduction and practice", description: "An introductory volume on Bach flower essences with a practical framework and structured entry into the topic.", category: "Alchemy of the Soul" },
  "alchemy-bach-cards": { title: "Book 06. Bach flower essences: profiles", description: "A continuation of the Bach section with compact profiles and reference material.", category: "Alchemy of the Soul" },
  "alchemy-brain-theory": { title: "Book 07. Working with the brain: theory, models, and neurophysiology", description: "The theoretical part of the brain-work series, focused on models and neurophysiological foundations.", category: "Alchemy of the Soul" },
  "alchemy-brain-protocols": { title: "Book 08. Working with the brain: assessment and protocols", description: "The applied part of the brain-work series: assessment, protocols, and working frameworks.", category: "Alchemy of the Soul" },
  "alchemy-services-workflow": { title: "Book 09. Services, workflow, and ongoing support", description: "A consolidated guide to the project’s approach, service formats, support process, and published working framework.", category: "Alchemy of the Soul" },
  "dao-alchemy-intro": { title: "1. Introduction to Daoist alchemy", description: "An opening volume of the Daoist series with an introductory overview and a general map of the topic.", category: "Daoist tradition" },
  "dao-tradition-temples-symbols": { title: "2. Daoist tradition, temples, and the symbolic world", description: "A book on Daoist tradition, temples, and the symbolic map of the Daoist world.", category: "Daoist tradition" },
  "dao-magic-basics": { title: "3. Daoist magic: foundations", description: "A foundational volume on Daoist magic within the project’s local book series.", category: "Daoist tradition" },
  "dao-talismans-symbols": { title: "4. Talismans, characters, and sacred signs", description: "A book on talismans, Chinese characters, and sacred symbolism in the Daoist series.", category: "Daoist tradition" },
  "dao-rituals-altars": { title: "5. Rituals, altars, and invocations", description: "Material on ritual practice, altars, and invocations in a Daoist context.", category: "Daoist tradition" },
  "dao-yijing-predictions": { title: "6. Yijing and Daoist divination", description: "A volume on the Yijing and the theme of Daoist divination.", category: "Daoist tradition" },
  "dao-healing-basics": { title: "7. Daoist healing: foundations", description: "A book on foundational ideas of Daoist healing and the basic principles of this material line.", category: "Daoist tradition" },
  "dao-wuxing-five-elements": { title: "8. Wuxing: five elements and states", description: "A book on the Wuxing model, the five elements, and states within the Daoist series.", category: "Daoist tradition" },
  "dao-wuxing-model-steps": { title: "9. DAO Wuxing model and stages of development", description: "A book on the DAO Wuxing model and developmental stages as a separate part of the Daoist library.", category: "Daoist tradition" },
  "dao-practicum-cases-remedies": { title: "10. Practicum: assessment, cases, and remedies", description: "A practical volume with assessment material, cases, and remedy-related notes.", category: "Daoist tradition" },
  "maya-egregor-gods": { title: "Maya and Aztec tradition: egregore and gods", description: "The tradition’s egregore, divine forces, their channels, and author-curated source materials.", category: "Maya tradition" },
  "maya-calendar": { title: "Energies of the Maya calendar", description: "A dedicated cycle on the calendar, time, periods, and the energies of Maya days.", category: "Maya tradition" },
  "maya-exorcism": { title: "Exorcism in the Maya tradition: attunements and energies", description: "Attunements, channels, helpers, and author-described forms of work with Maya and Aztec energies.", category: "Maya tradition" },
  "maya-mysteries": { title: "Maya mysteries", description: "Mythology, Xibalba, initiation, ritual, sacred places, doubles, and author-developed archetypal models.", category: "Maya tradition" },
};

export function localizedBookText(book: Book, locale: Locale): LocalizedBookText {
  if (locale === "en" && en[book.id]) return en[book.id];
  return { title: book.title, description: book.description, category: book.category };
}
