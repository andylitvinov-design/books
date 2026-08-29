import type { Book } from "./library";

export type ReaderDocument = { type: "html"; content: string };

export function loadReaderDocument(book: Book): Promise<ReaderDocument>;
