import { BookCatalog } from "@/components/book-catalog";
import { books } from "@/data/library";

export default function HomePage() {
  return <BookCatalog books={books} />;
}
