'use client';

import { useState } from 'react';
import styles from './BoulderDetail.module.css';

interface Boulder {
  slug: string;
  title: string;
  thumbnail: string;
  description: string;
}

interface Problem {
  slug: string;
  title: string;
  grade: string;
  description: string;
}

interface BoulderDetailProps {
  cragSlug: string;
  boulder: Boulder;
  problems: Problem[];
  allBoulders: Boulder[];
}

export default function BoulderDetail({ cragSlug, boulder, problems, allBoulders }: BoulderDetailProps) {
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

      {/* Problem List */}
      <div className={styles.problemList}>
        {problems.length === 0 ? (
          <div className={styles.emptyState}>
            <p>등록된 문제가 없습니다.</p>
          </div>
        ) : (
          problems.map((problem, index) => (
            <div key={problem.slug} id={problem.slug} className={styles.problemItem}>
              <div className={styles.problemNumber}>
                <span className={styles.numberCircle}>{index + 1}</span>
              </div>
              <div className={styles.problemInfo}>
                <div className={styles.problemHeader}>
                  <h3 className={styles.problemTitle}>{problem.title}</h3>
                  <span className={styles.problemGrade}>{problem.grade}</span>
                </div>
                <div className={styles.problemMeta}>
                  <span className={styles.problemBoulder}>{boulder.title}</span>
                  <a
                    href={`https://www.instagram.com/explore/tags/${encodeURIComponent(problem.slug)}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.betaButton}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                    </svg>
                    beta
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
