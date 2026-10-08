"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { yggdrasilModuleLandings } from "@/data/academy/yggdrasil-module-map";
import type { PublicLocale } from "@/lib/public-locales";

type NavItem = {
  key: string;
  href: string;
  number?: string;
  label: string;
  sectionId?: string;
};

function CourseSideNavigation({
  eyebrow,
  title,
  ariaLabel,
  items,
  activeKey,
  observeSections = false,
}: {
  eyebrow: string;
  title: string;
  ariaLabel: string;
  items: NavItem[];
  activeKey?: string;
  observeSections?: boolean;
}) {
  const [current, setCurrent] = useState(activeKey ?? items[0]?.key ?? "");

  useEffect(() => {
    if (!observeSections) {
      setCurrent(activeKey ?? items[0]?.key ?? "");
      return;
    }

    const observed = items
      .filter((item) => item.sectionId)
      .map((item) => ({ item, element: document.getElementById(item.sectionId!) }))
      .filter((entry): entry is { item: NavItem; element: HTMLElement } => Boolean(entry.element));

    if (!observed.length) return;

    const setFromHash = () => {
      const hash = window.location.hash.slice(1);
      const match = observed.find(({ item }) => item.sectionId === hash);
      if (match) setCurrent(match.item.key);
    };

    setFromHash();

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
        if (!visible) return;
        const match = observed.find(({ element }) => element === visible.target);
        if (match) setCurrent(match.item.key);
      },
      { rootMargin: "-16% 0px -68% 0px", threshold: [0, 0.08, 0.2] },
    );

    observed.forEach(({ element }) => observer.observe(element));
    window.addEventListener("hashchange", setFromHash);

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", setFromHash);
    };
  }, [activeKey, items, observeSections]);

  return (
    <nav className="reiki-course-side-nav" aria-label={ariaLabel}>
      <div className="reiki-course-side-nav__header">
        <small>{eyebrow}</small>
        <strong>{title}</strong>
      </div>
      <div className="reiki-course-side-nav__items">
        {items.map((item) => {
          const isActive = current === item.key;
          return (
            <Link
              className={"reiki-course-side-nav__item" + (!item.number ? " reiki-course-side-nav__item--wide" : "") + (isActive ? " is-active" : "")}
              href={item.href}
              key={item.key}
              aria-current={isActive ? "location" : undefined}
              onClick={() => setCurrent(item.key)}
            >
              {item.number ? <span>{item.number}</span> : null}
              <em>{item.label}</em>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function YggdrasilSideNavigation({
  locale,
  activeSlug = "overview",
}: {
  locale: PublicLocale;
  activeSlug?: string;
}) {
  const copy = {
    en: { eyebrow: "Course navigation", title: "Reiki Yggdrasil", overview: "Program overview", reviews: "Student reviews", videos: "English video guide", description: "Basic Course description", module: "M" },
    ru: { eyebrow: "Навигация по курсу", title: "Рейки Иггдрасиль", overview: "Обзор программы", reviews: "Отзывы учеников", videos: "Видео на английском", description: "Описание Базового курса", module: "М" },
    es: { eyebrow: "Navegación del curso", title: "Reiki Yggdrasil", overview: "Resumen del programa", reviews: "Testimonios", videos: "Videos en inglés", description: "Descripción del Curso Básico", module: "M" },
  }[locale];

  const items: NavItem[] = [
    {
      key: "overview",
      href: `/${locale}/academy/reiki/yggdrasil`,
      label: copy.overview,
    },
    ...(activeSlug === "overview" ? [
      { key: "reviews", href: "#yggdrasil-testimonials", label: copy.reviews },
      { key: "english-videos", href: "#yggdrasil-english-guide", label: copy.videos },
    ] : []),
    { key: "basic-description", href: "/" + locale + "/academy/reiki/yggdrasil/basic-course/description", label: copy.description },
    ...yggdrasilModuleLandings.map((module) => ({
      key: module.slug,
      href: `/${locale}/academy/reiki/yggdrasil/${module.slug}`,
      number: copy.module + module.levelId,
      label: module.title[locale],
    })),
  ];

  return (
    <CourseSideNavigation
      eyebrow={copy.eyebrow}
      title={copy.title}
      ariaLabel={copy.eyebrow}
      items={items}
      activeKey={activeSlug}
    />
  );
}

export function TantraReikiSideNavigation({
  locale,
  levels,
}: {
  locale: PublicLocale;
  levels: Array<{ number: number; title: string }>;
}) {
  const copy = {
    en: { eyebrow: "Course navigation", title: "Tantra Reiki", level: "Level", media: "Videos & materials", source: "Full system text" },
    ru: { eyebrow: "Навигация по курсу", title: "Тантра Рейки", level: "Ступень", media: "Видео и материалы", source: "Полный текст системы" },
    es: { eyebrow: "Navegación del curso", title: "Tantra Reiki", level: "Etapa", media: "Videos y materiales", source: "Texto completo" },
  }[locale];

  const items: NavItem[] = [
    ...levels.map((level) => ({
      key: "level-" + level.number,
      href: "#tantra-level-" + level.number,
      sectionId: "tantra-level-" + level.number,
      number: String(level.number).padStart(2, "0"),
      label: level.title,
    })),
    { key: "media", href: "#tantra-media", sectionId: "tantra-media", label: copy.media },
    { key: "source", href: "#tantra-full-source", sectionId: "tantra-full-source", label: copy.source },
  ];

  return (
    <CourseSideNavigation
      eyebrow={copy.eyebrow}
      title={copy.title}
      ariaLabel={copy.eyebrow}
      items={items}
      activeKey="level-1"
      observeSections
    />
  );
}
