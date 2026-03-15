import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getAllCultureItems } from '@/lib/content';
import styles from './culture.module.css';

export default async function CulturePage() {
  const items = getAllCultureItems();

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.tabs}>
          <a href="/culture" className={`${styles.tab} ${styles.tabActive}`}>All</a>
          <a href="/culture/trable" className={styles.tab}>Travel</a>
          <a href="/culture/rocktrip" className={styles.tab}>Rock Trip</a>
        </div>
        <div className={styles.list}>
          {items.length === 0 ? (
            <p className={styles.empty}>등록된 게시물이 없습니다.</p>
          ) : (
            items.map((item) => (
              <a
                key={`${item.type}-${item.slug}`}
                href={`/culture/${item.type}/${item.slug}`}
                className={styles.card}
              >
                <div className={styles.cardContent}>
                  <span className={styles.cardType}>{item.type === 'trable' ? 'Travel' : 'Rock Trip'}</span>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                  <p className={styles.cardExcerpt}>{item.excerpt}</p>
                  <span className={styles.cardDate}>{item.date}</span>
                </div>
                <div className={styles.cardThumbnail}>
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.title} />
                  ) : (
                    <div className={styles.cardThumbnailPlaceholder} />
                  )}
                </div>
              </a>
            ))
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
