import styles from './CultureSection.module.css';

interface CultureItem {
  slug: string;
  title: string;
  date: string;
  type: 'trable' | 'rocktrip';
}

interface CultureSectionProps {
  items: CultureItem[];
}

export default function CultureSection({ items }: CultureSectionProps) {
  const displayItems = items.slice(0, 5);

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Culture</h2>
      <div className={styles.list}>
        {displayItems.map((item) => (
          <a
            href={`/culture/${item.type}/${item.slug}`}
            key={`${item.type}-${item.slug}`}
            className={styles.item}
          >
            <div className={styles.info}>
              <h3>{item.title}</h3>
              <p>{item.date}</p>
            </div>
          </a>
        ))}
      </div>
      <a href="/culture" className={styles.moreButton}>
        More
      </a>
    </section>
  );
}
