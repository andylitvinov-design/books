import type { Book } from "./library";

export type MayaBlock =
  | {
      type: "heading";
      level: number;
      text: string;
      supplemental: boolean;
    }
  | {
      type: "paragraph";
      text: string;
      sourceLabel: boolean;
    }
  | {
      type: "list";
      ordered: boolean;
      items: string[];
    };

export type ReaderDocument =
  | { type: "html"; content: string }
  | { type: "maya"; blocks: MayaBlock[] };

export function parseMayaManuscript(markdown: string): MayaBlock[];
export function loadReaderDocument(book: Book): Promise<ReaderDocument>;
