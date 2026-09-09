import Link from "next/link";

export default function BookNotFound() {
  return (
    <main className="reader-shell reader-not-found">
      <p className="reader-eyebrow">Библиотека источников</p>
      <h1>Книга не найдена</h1>
      <p>Этой книги нет в опубликованном каталоге.</p>
      <Link className="reader-back-link" href="/">← Вернуться к библиотеке</Link>
    </main>
  );
}
