import type { Book } from "./library";

export type MayaBlock = {
  type: "heading" | "paragraph";
  level?: number;
  text: string;
  sourceLabel?: boolean;
  supplemental?: boolean;
};

export type ReaderDocument =
  | { type: "html"; content: string }
  | { type: "maya"; blocks: MayaBlock[] };

export function parseMayaManuscript(markdown: string): MayaBlock[];
export function loadReaderDocument(book: Book): Promise<ReaderDocument>;
