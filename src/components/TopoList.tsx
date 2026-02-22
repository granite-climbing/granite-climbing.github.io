import Link from 'next/link';
import styles from './TopoList.module.css';

interface Topo {
  slug: string;
  title: string;
  image: string;
  description?: string;
  problemCount: number;
}

interface TopoListProps {
  cragSlug: string;
  boulderSlug: string;
  topos: Topo[];
}

export default function TopoList({ cragSlug, boulderSlug, topos }: TopoListProps) {
  if (topos.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>등록된 토포가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {topos.map((topo) => (
          <Link
            key={topo.slug}
            href={`/crag/${cragSlug}/boulder/${boulderSlug}/topo/${topo.slug}`}
            className={styles.topoCard}
          >
            <div className={styles.imageContainer}>
              <img src={topo.image} alt={topo.title} className={styles.topoImage} />
            </div>

            <div className={styles.topoInfo}>
              <h3 className={styles.topoTitle}>{topo.title}</h3>

              <div className={styles.topoMeta}>
                <span className={styles.problemCount}>{topo.problemCount}개 문제</span>
              </div>

              {topo.description && <p className={styles.topoDescription}>{topo.description}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
