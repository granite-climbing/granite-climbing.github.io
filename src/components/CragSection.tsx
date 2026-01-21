import styles from './CragSection.module.css';

interface Crag {
  slug: string;
  title: string;
  thumbnail: string;
  difficultyMin: string;
  difficultyMax: string;
  boulderCount: number;
  problemCount: number;
}

interface CragSectionProps {
  crags: Crag[];
}

export default function CragSection({ crags }: CragSectionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Crag</h2>
      <div className={styles.list}>
        {crags.map((crag) => (
          <a href={`/crag/${crag.slug}`} key={crag.slug} className={styles.card}>
            <div className={styles.imageWrapper}>
              <img src={crag.thumbnail} alt={crag.title} />
            </div>
            <div className={styles.info}>
              <h3>{crag.title}</h3>
              <p>{crag.problemCount} problems · {crag.difficultyMin === crag.difficultyMax ? crag.difficultyMin : `${crag.difficultyMin}-${crag.difficultyMax}`}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
