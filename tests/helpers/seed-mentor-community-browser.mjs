// Never use this fixture with a real project: it creates synthetic people,
// approved educational posts and a free listing ONLY in the isolated CI database.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { getAppConfig } from "../../lib/app/config.js";
import { createAppRepository } from "../../lib/app/repository.js";
import { createPractitionerRepository } from "../../lib/practitioners/repository.js";
import { createArticleRepository } from "../../lib/practitioners/article-repository.js";
import { closeDatabase } from "../../lib/app/database.js";
import { assertIsolated, actor, B, SB } from "./app-db-setup.mjs";

assertIsolated();
const config = getAppConfig();
assert.equal(config.test, true, "Test data must never be written to production");
const masterActor = actor();
// Account B needs its own session; A’s token must never authenticate as B.
const otherActor = actor(B, SB);
const accountRepo = createAppRepository(config);
const practice = createPractitionerRepository(config);
const articles = createArticleRepository(config);

const articleData = [
  { locale: "en", title: "Choosing a mentor thoughtfully", topic: "Goals", slug: "choosing" },
  { locale: "en", title: "A small daily reflection practice", topic: "Reflection", slug: "reflection" },
  { locale: "ru", title: "Как выбрать наставника", topic: "Цели", slug: "choosing" },
  { locale: "ru", title: "Практика ежедневной рефлексии", topic: "Рефлексия", slug: "reflection" },
  { locale: "es", title: "Cómo elegir un mentor", topic: "Metas", slug: "choosing" },
  { locale: "es", title: "Una práctica de reflexión diaria", topic: "Reflexión", slug: "reflection" },
];

const testContent = "This is an isolated synthetic educational fixture. It makes no medical promises, carries no private client details and does not describe a real service outcome. ";

try {
  for (const who of [masterActor, otherActor]) {
    await accountRepo.ensureAccount(who);
    await accountRepo.onboarding(who, {
      adult: true, necessary: true, marketing: false,
      displayName: "Synthetic QA",
      uiLocale: "en",
      timezone: "America/Toronto",
      goal: "explore",
    });
  }
  let master = await practice.saveProfile(masterActor, {
    profile: {
      displayName: "Synthetic Mentor",
      professionalTitle: "Educational coach",
      shortBio: "An approved synthetic QA mentor; not a real practitioner.",
      fullBio: "",
      languages: ["en", "ru", "es"],
      city: "Toronto", region: "Ontario", country: "Canada",
      formats: ["online"],
      areas: ["personal_development"],
      methods: ["Guided reflection"],
      yearsExperience: 2,
      websiteUrl: "", socialUrls: [], photoPath: "",
    },
  });
  master = await practice.submitProfile(masterActor, { expectedRevision: master.revision });
  master = await practice.moderateProfile(master.id, { action: "approve" });
  assert.equal(master.status, "approved");

  let service = await practice.saveService(masterActor, null, {
    draft: {
      copy: {
        en: { title: "Synthetic free introduction", shortDescription: "Get to know a mentor", description: "Test-only introductory conversation" },
        ru: { title: "Тестовое знакомство", shortDescription: "Знакомство с наставником", description: "Синтетическое тестовое описание" },
        es: { title: "Introducción gratuita de prueba", shortDescription: "Conoce al mentor", description: "Descripción sintética de prueba" },
      },
      areaKey: "personal_development", offeringType: "session",
      deliveryFormat: "online", locationLabel: "",
      languages: ["en", "ru", "es"], pricingMode: "fixed",
      confirmedPrice: 0, currency: "CAD", durationMinutes: 30,
      imagePath: "", displayLocales: ["en", "ru", "es"],
    },
  });
  service = await practice.submitService(masterActor, service.id, { expectedRevision: service.revision });
  service = await practice.moderateService(service.id, { action: "approve" });
  assert.equal(service.status, "published");

  // A second approved public *course offering*, distinct from private course slides,
  // verifies that the mentor directory offers meaningful course/type filters.
  let training = await practice.saveService(masterActor, null, {
    draft: {
      copy: {
        en: { title: "Synthetic reflection course", shortDescription: "Educational exercises", description: "Test-only reflection course" },
        ru: { title: "Тестовый курс рефлексии", shortDescription: "Учебные упражнения", description: "Синтетический курс рефлексии" },
        es: { title: "Curso de reflexión sintético", shortDescription: "Ejercicios educativos", description: "Curso de prueba" },
      },
      areaKey: "personal_development", offeringType: "course",
      deliveryFormat: "online", locationLabel: "",
      languages: ["en", "ru", "es"], pricingMode: "contact",
      confirmedPrice: null, currency: "", durationMinutes: null,
      imagePath: "", displayLocales: ["en", "ru", "es"],
    },
  });
  training = await practice.submitService(masterActor, training.id, { expectedRevision: training.revision });
  training = await practice.moderateService(training.id, { action: "approve" });
  assert.equal(training.status, "published");

  for (const item of articleData) {
    const draft = {
      locale: item.locale,
      title: item.title,
      excerpt: "An original synthetic educational article for multilingual community QA only.",
      body: "## " + item.title + "\n\n" + testContent.repeat(4),
      coverPath: "", sourceUrls: [],
      linkedServiceIds: [service.id], tags: [item.topic, "Community"],
    };
    const saved = await articles.save(masterActor, null, { draft });
    assert.equal(saved.status, "draft");
    assert.equal((await articles.publicList(item.locale)).some((a) => a.id === saved.id), false,
      "Draft must never appear in a public list");
    const submitted = await articles.submit(masterActor, saved.id, { expectedRevision: saved.revision });
    assert.equal(submitted.status, "submitted");
    assert.equal((await articles.publicList(item.locale)).some((a) => a.id === saved.id), false,
      "Review pending must not expose unpublished content");
    const published = await articles.moderate(saved.id, { action: "approve" });
    assert.equal(published.status, "published");
    const publicArticle = await articles.publicArticle(item.locale, saved.slug);
    assert.equal(publicArticle.published.title, item.title);
    assert.equal(publicArticle.practitionerSlug, master.slug);
    assert.equal(publicArticle.services.length, 1);
    assert.equal(Object.hasOwn(publicArticle, "draft"), false);
    if (item.locale === "en" && item.slug === "choosing") {
      const edited = await articles.save(masterActor, saved.id, {
        expectedRevision: published.revision,
        draft: { ...draft, body: draft.body + "\nPRIVATE_PENDING_REVISION" },
      });
      assert.equal(edited.status, "published");
      assert.equal((await articles.publicArticle("en", saved.slug)).published.body.includes("PRIVATE_PENDING_REVISION"), false,
        "Unreviewed changes must not leak into a previously published article");
    }
  }

  const hidden = await articles.save(masterActor, null, {
    draft: {
      locale: "en", title: "PRIVATE_QA_NOT_PUBLIC",
      excerpt: "This synthetic QA draft remains private and must not appear anywhere in the public feed.",
      body: "## PRIVATE_QA_NOT_PUBLIC\n\n" + testContent.repeat(4),
      coverPath: "", sourceUrls: [], linkedServiceIds: [],
      tags: ["SecretDraft"],
    },
  });
  assert.equal((await articles.publicList("en")).some((a) => a.id === hidden.id), false);
  await assert.rejects(() => articles.publicArticle("en", hidden.slug), { code: "NOT_FOUND" });
  const otherLibrary = await practice.getMyPractice(otherActor);
  assert.equal((otherLibrary.requests || []).length, 0);

  for (const locale of ["en", "ru", "es"]) {
    const visible = await articles.publicList(locale);
    assert.equal(visible.length, 2, locale + ": exactly two moderated articles");
    assert.equal(visible.every((entry) => !Object.hasOwn(entry, "draft")), true);
  }
  await mkdir("artifacts/mentor-community", { recursive: true });
  await writeFile("artifacts/mentor-community/fixture-manifest.json", JSON.stringify({
    synthetic: true, practitionerSlug: master.slug, hiddenSlug: hidden.slug, articleCount: 6, locales: ["en", "ru", "es"], id: randomUUID().slice(0, 8),
  }, null, 2));
  console.log("MENTOR_COMMUNITY_FIXTURE_PASS synthetic approved mentor, moderated six-article feed, draft RLS, related service, three locales");
} finally {
  await closeDatabase();
}
