import styles from './CragList.module.css';

interface Crag {
  slug: string;
  title: string;
  thumbnail: string;
  difficultyMin: string;
  difficultyMax: string;
  problemCount?: number;
}

interface CragListProps {
  crags: Crag[];
}

export default function CragList({ crags }: CragListProps) {
  return (
    <section className={styles.section}>
      <div className={styles.list}>
        {crags.map((crag) => (
          <a href={`/crag/${crag.slug}`} key={crag.slug} className={styles.card}>
            <div className={styles.imageWrapper}>
              <img src={crag.thumbnail} alt={crag.title} />
            </div>
            <div className={styles.info}>
              <h3 className={styles.title}>{crag.title}</h3>
              <p className={styles.meta}>
                {crag.problemCount || 10} problems · {crag.difficultyMin === crag.difficultyMax ? crag.difficultyMin : `${crag.difficultyMin}-${crag.difficultyMax}`}
              </p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
