'use client';

import { useState, useEffect, useCallback } from 'react';
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
  hashtag: string;
  fa: string;
  description: string;
}

interface InstagramMedia {
  id: string;
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
}

interface BoulderDetailProps {
  cragSlug: string;
  cragTitle: string;
  boulder: Boulder;
  problems: Problem[];
  allBoulders: Boulder[];
}

export default function BoulderDetail({ cragSlug, cragTitle, boulder, problems, allBoulders }: BoulderDetailProps) {
  const currentIndex = allBoulders.findIndex((b) => b.slug === boulder.slug);
  const total = allBoulders.length;
  const [betaProblem, setBetaProblem] = useState<Problem | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [betaMedia, setBetaMedia] = useState<InstagramMedia[]>([]);
  const [betaLoading, setBetaLoading] = useState(false);

  const prevBoulder = currentIndex > 0 ? allBoulders[currentIndex - 1] : null;
  const nextBoulder = currentIndex < total - 1 ? allBoulders[currentIndex + 1] : null;

  const fetchBetaMedia = useCallback(async (hashtag: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_INSTAGRAM_API_URL;
    if (!apiUrl) return; // Instagram API not configured yet

    setBetaLoading(true);
    try {
      const tag = hashtag.replace(/^#/, '');
      const res = await fetch(`${apiUrl}?tag=${encodeURIComponent(tag)}`);
      if (res.ok) {
        const data = await res.json();
        setBetaMedia(data.media || []);
      }
    } catch {
      // API unavailable - silent fail
    } finally {
      setBetaLoading(false);
    }
  }, []);

  const openBetaSheet = (problem: Problem) => {
    setBetaProblem(problem);
    setBetaMedia([]);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setSheetVisible(true);
      });
    });
    fetchBetaMedia(getHashtag(problem));
  };

  const closeBetaSheet = () => {
    setSheetVisible(false);
    setTimeout(() => {
      setBetaProblem(null);
      setCopied(false);
      setBetaMedia([]);
    }, 300);
  };

  useEffect(() => {
    if (betaProblem) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [betaProblem]);

  const getHashtag = (problem: Problem) => {
    if (problem.hashtag) {
      return problem.hashtag.startsWith('#') ? problem.hashtag : `#${problem.hashtag}`;
    }
    return `#${problem.slug.replace(/-/g, '_')}`;
  };

  const getCaption = (problem: Problem) => {
    return `"${problem.title}" ${problem.grade} on ${boulder.title}, ${cragTitle}. @granite_climbing #granite_climbing #climbing #bouldering`;
  };

  const handleCopyAndOpen = async (problem: Problem) => {
    try {
      await navigator.clipboard.writeText(getCaption(problem));
      setCopied(true);
      setTimeout(() => {
        window.open('https://www.instagram.com/', '_blank');
      }, 300);
    } catch {
      window.open('https://www.instagram.com/', '_blank');
    }
  };

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
                <div className={styles.problemSubInfo}>
                  <span className={styles.problemBoulder}>{boulder.title}</span>
                  {problem.fa && <span className={styles.problemFa}>FA {problem.fa}</span>}
                </div>
                <div className={styles.problemMeta}>
                  <div />
                  <button
                    className={styles.betaButton}
                    onClick={() => openBetaSheet(problem)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                    </svg>
                    beta
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Beta Bottom Sheet */}
      {betaProblem && (
        <div
          className={`${styles.sheetOverlay} ${sheetVisible ? styles.sheetOverlayVisible : ''}`}
          onClick={closeBetaSheet}
        >
          <div
            className={`${styles.sheet} ${sheetVisible ? styles.sheetVisible : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.sheetHandle} />

            <div className={styles.sheetHeader}>
              <h2 className={styles.sheetTitle}>베타 동영상</h2>
              <button className={styles.sheetClose} onClick={closeBetaSheet}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className={styles.sheetBody}>
              <p className={styles.sheetDescription}>
                버튼을 눌러 추천 캡션을 복사하고 Instagram을 여세요. Instagram 동영상 게시물을 작성할 때 캡션을 붙여넣을 수 있습니다. 게시물을 찾아 여기로 연결할게요.
              </p>

              <div className={styles.captionBox}>
                <span className={styles.captionText}>{getCaption(betaProblem)}</span>
              </div>

              <button
                className={styles.sheetCta}
                onClick={() => handleCopyAndOpen(betaProblem)}
              >
                {copied ? '복사 완료!' : '캡션 복사하고 Instagram 열기'}
              </button>
            </div>

            <div className={styles.sheetGrid}>
              {betaLoading ? (
                <div className={styles.gridLoading}>
                  <p>베타 영상을 불러오는 중...</p>
                </div>
              ) : betaMedia.length > 0 ? (
                betaMedia.map((media) => (
                  <a
                    key={media.id}
                    href={media.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.gridItem}
                  >
                    <img
                      src={media.thumbnail_url || media.media_url}
                      alt="beta video"
                      className={styles.gridImage}
                    />
                    {media.media_type === 'VIDEO' && (
                      <div className={styles.gridVideoIcon}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}
                  </a>
                ))
              ) : (
                Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className={styles.gridPlaceholder} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
