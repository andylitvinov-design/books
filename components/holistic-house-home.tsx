import Link from "next/link";
import { SiteNavigation } from "@/components/site-navigation";

export function HolisticHouseHome() {
  return (
    <main className="house-home">
      <header className="house-header">
        <Link className="house-wordmark" href="/" aria-label="Holistic House — главная">Holistic House<span>Библиотеки · практики · исследование</span></Link>
        <SiteNavigation />
      </header>

      <section className="house-hero" aria-labelledby="house-title">
        <div className="house-hero-inner">
          <p className="house-eyebrow">Пространство для внимательного изучения</p>
          <h1 id="house-title">Holistic<br /><em>House</em><span aria-hidden="true">.</span></h1>
          <div className="house-hero-bottom">
            <p>Книги, справочные материалы и цифровые инструменты — в одном доме.</p>
            <Link className="house-link" href="#libraries">Выбрать библиотеку <span aria-hidden="true">↓</span></Link>
          </div>
        </div>
        <span className="house-hero-note" aria-hidden="true">Читать. Изучать. Возвращаться.</span>
      </section>

      <section className="house-section" id="libraries" aria-labelledby="house-libraries-title">
        <div className="house-section-heading"><p className="house-eyebrow">01 / Уже доступно</p><h2 id="house-libraries-title">Начните с источников</h2></div>
        <div className="house-library-list">
          <Link href="/books" className="house-library-row"><span className="house-row-number">I</span><div><h3>Библиотека книг</h3><p>Опубликованные тексты об алхимических и даосских практиках, традиции Майя. Поиск по книгам и главам.</p><span className="house-row-action">Открыть собрание <span aria-hidden="true">↗</span></span></div></Link>
          <Link href="/ru/homeopathy" className="house-library-row"><span className="house-row-number">II</span><div><h3>Гомеопатия</h3><p>Справочная библиотека препаратов с материалами из источников, поиском и сохранёнными записями.</p><span className="house-row-action">Перейти к библиотеке <span aria-hidden="true">↗</span></span></div></Link>
        </div>
      </section>

      <section className="house-product" id="psialchemy" aria-labelledby="house-product-title">
        <div className="house-product-inner"><p className="house-eyebrow">02 / Цифровой продукт</p><h2 id="house-product-title">PsiAlchemy</h2><p className="house-product-lead">Ваша библиотека под рукой.</p><p>Продукт внутри Holistic House для чтения и работы со справочными материалами. Книги, библиотека препаратов и сохранённые записи доступны через существующие разделы.</p><Link className="house-link" href="/ru/homeopathy/remedies">Открыть препараты <span aria-hidden="true">↗</span></Link></div>
      </section>

      <section className="house-section house-directions" aria-labelledby="house-directions-title">
        <div className="house-section-heading"><p className="house-eyebrow">03 / В планах</p><h2 id="house-directions-title">Будущие направления</h2><p>Темы, которые мы планируем развивать. Материалы и услуги по этим направлениям пока не представлены.</p></div>
        <ul><li>Психология</li><li>Гипнотерапия</li><li>Системные и семейные расстановки</li></ul>
      </section>
      <footer className="house-footer"><Link className="house-wordmark" href="/">Holistic House</Link><p>Справочные материалы предназначены для изучения и не заменяют медицинскую консультацию.</p><Link className="house-link" href="/books">К книгам <span aria-hidden="true">↗</span></Link></footer>
    </main>
  );
}
