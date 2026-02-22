'use client';

import styles from './BoulderDetail.module.css';
import TopoList from './TopoList';

interface Boulder {
  slug: string;
  title: string;
  thumbnail: string;
  description: string;
}

interface Topo {
  slug: string;
  title: string;
  image: string;
  description?: string;
  problemCount: number;
}

interface BoulderDetailProps {
  cragSlug: string;
  cragTitle: string;
  boulder: Boulder;
  topos: Topo[];
  allBoulders: Boulder[];
}

export default function BoulderDetail({ cragSlug, cragTitle, boulder, topos, allBoulders }: BoulderDetailProps) {
  const currentIndex = allBoulders.findIndex((b) => b.slug === boulder.slug);
  const total = allBoulders.length;

  const prevBoulder = currentIndex > 0 ? allBoulders[currentIndex - 1] : null;
  const nextBoulder = currentIndex < total - 1 ? allBoulders[currentIndex + 1] : null;

  return (
    <div className={styles.container}>
      {/* Boulder Image */}
      <div className={styles.imageSection}>
        {boulder.thumbnail ? (
          <img src={boulder.thumbnail} alt={boulder.title} className={styles.boulderImage} />
        ) : (
          <div className={styles.imagePlaceholder} />
        )}
      </div>

      {/* Boulder Navigation */}
      <div className={styles.navigation}>
        {prevBoulder ? (
          <a href={`/crag/${cragSlug}/boulder/${prevBoulder.slug}`} className={styles.navButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </a>
        ) : (
          <div className={styles.navButtonDisabled}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </div>
        )}
        <span className={styles.navTitle}>
          {boulder.title} {currentIndex + 1}/{total}
        </span>
        {nextBoulder ? (
          <a href={`/crag/${cragSlug}/boulder/${nextBoulder.slug}`} className={styles.navButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </a>
        ) : (
          <div className={styles.navButtonDisabled}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        )}
      </div>

      {/* Topo List */}
      <TopoList cragSlug={cragSlug} boulderSlug={boulder.slug} topos={topos} />
    </div>
  );
}
