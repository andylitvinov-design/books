import type { Metadata } from "next";
import Link from "next/link";

import { PublicSiteHeader } from "@/components/public-site-header";
import { localizedBookText } from "@/data/library-localization";
import { books } from "@/data/library";
import { metadataBaseFor } from "@/data/site-metadata";

import styles from "./maya-tradition.module.css";

const mayaVolumeIds = ["maya-egregor-gods", "maya-calendar", "maya-exorcism", "maya-mysteries"] as const;
const volumes = books.filter((book) => book.mediaSeries === "maya" && mayaVolumeIds.includes(book.id as (typeof mayaVolumeIds)[number]));

export const metadata: Metadata = {
  metadataBase: metadataBaseFor(),
  title: "Maya tradition — Holistic House",
  description: "A four-volume reading collection on the Maya and Aztec tradition, its calendar, myths, symbolic systems, and source materials.",
  alternates: { canonical: "/books/maya-tradition" },
};

export default function MayaTraditionHub() {
  return <main className={styles.hub} lang="en">
    <PublicSiteHeader locale="en" />
    <section className={styles.hero}><p>Maya reading collection</p><h1>Maya tradition</h1><span>An editorial gateway to the four published volumes of the Circle of the Feathered Serpent archive.</span></section>
    <section className={styles.collection} aria-labelledby="maya-volumes-title"><div><p>Four volumes</p><h2 id="maya-volumes-title">Read the collection</h2></div><ol>{volumes.map((volume, index) => { const text = localizedBookText(volume, "en"); return <li key={volume.id}><span>{String(index + 1).padStart(2, "0")}</span><article><p>{text.category}</p><h3>{text.title}</h3><div>{text.description}</div><Link href={`/books/${volume.id}?lang=en`}>Open volume<span aria-hidden="true">→</span></Link></article></li>; })}</ol></section>
  </main>;
}
