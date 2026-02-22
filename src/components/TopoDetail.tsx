'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './TopoDetail.module.css';

interface Problem {
  slug: string;
  title: string;
  grade: string;
  hashtag: string;
  fa: string;
  image?: string;
  description?: string;
}

interface Topo {
  slug: string;
  title: string;
  image: string;
  description?: string;
}

interface TopoDetailProps {
  cragSlug: string;
  cragTitle: string;
  boulderSlug: string;
  boulderTitle: string;
  topo: Topo;
  problems: Problem[];
  allTopos: { slug: string; title: string }[];
}

interface InstagramMedia {
  id: string;
  media_type: string;
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
}

export default function TopoDetail({
  cragSlug,
  cragTitle,
  boulderSlug,
  boulderTitle,
  topo,
  problems,
  allTopos,
}: TopoDetailProps) {
  const currentIndex = allTopos.findIndex((t) => t.slug === topo.slug);
  const prevTopo = currentIndex > 0 ? allTopos[currentIndex - 1] : null;
  const nextTopo = currentIndex < allTopos.length - 1 ? allTopos[currentIndex + 1] : null;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [copiedHashtag, setCopiedHashtag] = useState(false);
  const [instagramMedia, setInstagramMedia] = useState<InstagramMedia[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const handleOpenBeta = async (problem: Problem) => {
    setSelectedProblem(problem);
    setSheetOpen(true);
    setInstagramMedia([]);
    setLoadingMedia(true);

    setTimeout(() => {
      setSheetVisible(true);
    }, 10);

    if (problem.hashtag) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_INSTAGRAM_API_URL || '';
        const cleanHashtag = problem.hashtag.replace(/^#/, '');
        const response = await fetch(`${apiUrl}?hashtag=${encodeURIComponent(cleanHashtag)}`);

        if (response.ok) {
          const data = await response.json();
          if (data.data && Array.isArray(data.data)) {
            setInstagramMedia(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch Instagram media:', error);
      } finally {
        setLoadingMedia(false);
      }
    } else {
      setLoadingMedia(false);
    }
  };

  const handleCloseSheet = () => {
    setSheetVisible(false);
    setTimeout(() => {
      setSheetOpen(false);
      setSelectedProblem(null);
      setInstagramMedia([]);
      setCopiedHashtag(false);
    }, 300);
  };

  const handleCopyCaption = () => {
    if (!selectedProblem) return;

    const gradeLabel = selectedProblem.grade;
    const caption = `"${selectedProblem.title}" ${gradeLabel} on ${topo.title}, ${boulderTitle}, ${cragTitle}. @granite_climbing #granite_climbing #climbing #bouldering`;

    navigator.clipboard.writeText(caption);
    setCopiedHashtag(true);

    setTimeout(() => {
      setCopiedHashtag(false);
    }, 2000);
  };

  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [sheetOpen]);

  return (
    <div className={styles.container}>
      {/* Topo Image */}
      <div className={styles.imageSection}>
        <img src={topo.image} alt={topo.title} className={styles.topoImage} />
      </div>

      {/* Navigation */}
      <div className={styles.navigation}>
        {prevTopo ? (
          <Link href={`/crag/${cragSlug}/boulder/${boulderSlug}/topo/${prevTopo.slug}`} className={styles.navButton}>
            ‹
          </Link>
        ) : (
          <div className={styles.navButtonDisabled}>‹</div>
        )}

        <div className={styles.navTitle}>{topo.title}</div>

        {nextTopo ? (
          <Link href={`/crag/${cragSlug}/boulder/${boulderSlug}/topo/${nextTopo.slug}`} className={styles.navButton}>
            ›
          </Link>
        ) : (
          <div className={styles.navButtonDisabled}>›</div>
        )}
      </div>

      {/* Back to Boulder Link */}
      <div className={styles.backLink}>
        <Link href={`/crag/${cragSlug}/boulder/${boulderSlug}`}>← {boulderTitle}로 돌아가기</Link>
      </div>

      {/* Topo Description */}
      {topo.description && <div className={styles.description}>{topo.description}</div>}

      {/* Problem List */}
      <div className={styles.problemList}>
        {problems.length === 0 ? (
          <div className={styles.emptyState}>등록된 문제가 없습니다.</div>
        ) : (
          problems.map((problem, index) => (
            <div key={problem.slug} className={styles.problemItem}>
              <div className={styles.problemNumber}>
                <div className={styles.numberCircle}>{index + 1}</div>
              </div>

              <div className={styles.problemInfo}>
                <div className={styles.problemHeader}>
                  <h3 className={styles.problemTitle}>{problem.title}</h3>
                  <span className={styles.problemGrade}>{problem.grade}</span>
                </div>

                <div className={styles.problemSubInfo}>
                  {problem.fa && <div className={styles.problemFa}>FA: {problem.fa}</div>}
                </div>

                {problem.image && (
                  <div className={styles.problemImageContainer}>
                    <img src={problem.image} alt={problem.title} className={styles.problemImage} />
                  </div>
                )}

                <div className={styles.problemMeta}>
                  <button onClick={() => handleOpenBeta(problem)} className={styles.betaButton}>
                    <span>▶</span> beta
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Beta Bottom Sheet */}
      {sheetOpen && (
        <>
          <div
            className={`${styles.sheetOverlay} ${sheetVisible ? styles.sheetOverlayVisible : ''}`}
            onClick={handleCloseSheet}
          />
          <div className={`${styles.sheet} ${sheetVisible ? styles.sheetVisible : ''}`}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHeader}>
              <h2 className={styles.sheetTitle}>
                {selectedProblem?.title} {selectedProblem?.grade}
              </h2>
              <button className={styles.sheetClose} onClick={handleCloseSheet}>
                ✕
              </button>
            </div>
            <div className={styles.sheetBody}>
              <p className={styles.sheetDescription}>
                인스타그램 캡션을 복사하고 베타 영상을 게시해보세요!
              </p>

              <div className={styles.captionBox}>
                <div className={styles.captionText}>
                  &quot;{selectedProblem?.title}&quot; {selectedProblem?.grade} on {topo.title}, {boulderTitle},{' '}
                  {cragTitle}. @granite_climbing #granite_climbing #climbing #bouldering
                </div>
              </div>

              <button className={styles.sheetCta} onClick={handleCopyCaption}>
                {copiedHashtag ? '✓ 캡션 복사됨!' : '캡션 복사하기'}
              </button>

              {selectedProblem?.hashtag && (
                <>
                  <div className={styles.sheetGrid}>
                    {loadingMedia ? (
                      <div className={styles.gridLoading}>베타 영상 불러오는 중...</div>
                    ) : instagramMedia.length === 0 ? (
                      <div className={styles.gridLoading}>등록된 베타 영상이 없습니다</div>
                    ) : (
                      instagramMedia.slice(0, 9).map((media) => (
                        <a
                          key={media.id}
                          href={media.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.gridItem}
                        >
                          <img
                            src={media.media_type === 'VIDEO' ? media.thumbnail_url : media.media_url}
                            alt="Beta video"
                            className={styles.gridImage}
                          />
                          {media.media_type === 'VIDEO' && (
                            <div className={styles.gridVideoIcon}>
                              <span style={{ color: '#fff', fontSize: '12px' }}>▶</span>
                            </div>
                          )}
                        </a>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
