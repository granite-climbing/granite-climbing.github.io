'use client';

import { useState, useEffect } from 'react';
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
  image?: string;
  description?: string;
}

interface TopoWithProblems {
  slug: string;
  title: string;
  image: string;
  description?: string;
  problemCount: number;
  problems: Problem[];
}

interface BoulderDetailProps {
  cragSlug: string;
  cragTitle: string;
  boulder: Boulder;
  toposWithProblems: TopoWithProblems[];
}

interface InstagramMedia {
  id: string;
  media_type: string;
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
}

export default function BoulderDetail({ cragSlug, cragTitle, boulder, toposWithProblems }: BoulderDetailProps) {
  const [currentTopoIndex, setCurrentTopoIndex] = useState(0);
  const [selectedProblemForImage, setSelectedProblemForImage] = useState<Problem | null>(null);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [selectedTopo, setSelectedTopo] = useState<TopoWithProblems | null>(null);
  const [copiedHashtag, setCopiedHashtag] = useState(false);
  const [instagramMedia, setInstagramMedia] = useState<InstagramMedia[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const currentTopo = toposWithProblems[currentTopoIndex];
  const totalTopos = toposWithProblems.length;

  // Initialize topo index from URL hash
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1); // Remove '#' from hash
      if (hash) {
        const topoIndex = toposWithProblems.findIndex((topo) => topo.slug === hash);
        if (topoIndex !== -1) {
          setCurrentTopoIndex(topoIndex);
        }
      }
    }
  }, [toposWithProblems]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY > 50) {
        setIsImageExpanded(true);
      } else {
        setIsImageExpanded(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handlePrevTopo = () => {
    if (currentTopoIndex > 0) {
      setCurrentTopoIndex(currentTopoIndex - 1);
      setSelectedProblemForImage(null);
    }
  };

  const handleNextTopo = () => {
    if (currentTopoIndex < totalTopos - 1) {
      setCurrentTopoIndex(currentTopoIndex + 1);
      setSelectedProblemForImage(null);
    }
  };

  const handleProblemClick = (problem: Problem) => {
    if (selectedProblemForImage?.slug === problem.slug) {
      setSelectedProblemForImage(null);
    } else {
      setSelectedProblemForImage(problem);
    }
  };

  const handleOpenBeta = async (problem: Problem, topo: TopoWithProblems) => {
    setSelectedProblem(problem);
    setSelectedTopo(topo);
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
      setSelectedTopo(null);
      setInstagramMedia([]);
      setCopiedHashtag(false);
    }, 300);
  };

  const handleCopyCaption = () => {
    if (!selectedProblem || !selectedTopo) return;

    const gradeLabel = selectedProblem.grade;
    const caption = `"${selectedProblem.title}" ${gradeLabel} on ${selectedTopo.title}, ${boulder.title}, ${cragTitle}. @granite_climbing #granite_climbing #climbing #bouldering`;

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

  if (toposWithProblems.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.navigation}>
          <a href={`/crag/${cragSlug}`} className={styles.navButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </a>
          <span className={styles.navTitle}>{cragTitle}</span>
          <div className={styles.navButtonPlaceholder} />
        </div>
        <div className={styles.emptyState}>등록된 토포가 없습니다.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Crag Navigation */}
      <div className={`${styles.navigation} ${isImageExpanded ? styles.navigationHidden : ''}`}>
        <a href={`/crag/${cragSlug}`} className={styles.navButton}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </a>
        <span className={styles.navTitle}>{cragTitle}</span>
        <div className={styles.navButtonPlaceholder} />
      </div>

      {/* Topo Image or Problem Image */}
      <div className={`${styles.imageSection} ${isImageExpanded ? styles.imageSectionExpanded : ''}`}>
        <img
          src={selectedProblemForImage?.image || currentTopo.image}
          alt={selectedProblemForImage?.title || currentTopo.title}
          className={styles.topoImage}
        />
      </div>

      {/* Boulder and Topo Navigation */}
      <div className={styles.topoNavigation}>
        {currentTopoIndex > 0 ? (
          <button onClick={handlePrevTopo} className={styles.topoNavButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        ) : (
          <div className={styles.topoNavButtonPlaceholder} />
        )}
        <div className={styles.topoInfo}>
          <div className={styles.boulderTitle}>
            {boulder.title} {currentTopoIndex + 1}/{totalTopos}
          </div>
        </div>
        {currentTopoIndex < totalTopos - 1 ? (
          <button onClick={handleNextTopo} className={styles.topoNavButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        ) : (
          <div className={styles.topoNavButtonPlaceholder} />
        )}
      </div>

      {/* Problem List for Current Topo */}
      <div className={styles.problemList}>
        {currentTopo.problems.length === 0 ? (
          <div className={styles.emptyState}>등록된 문제가 없습니다.</div>
        ) : (
          currentTopo.problems.map((problem, index) => (
            <div
              key={problem.slug}
              className={`${styles.problemItem} ${selectedProblemForImage?.slug === problem.slug ? styles.problemItemActive : ''}`}
              onClick={() => handleProblemClick(problem)}
            >
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

                <div className={styles.problemMeta}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenBeta(problem, currentTopo);
                    }}
                    className={styles.betaButton}
                  >
                    <span>▶</span> beta
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Beta Bottom Sheet */}
      {sheetOpen && selectedProblem && selectedTopo && (
        <>
          <div
            className={`${styles.sheetOverlay} ${sheetVisible ? styles.sheetOverlayVisible : ''}`}
            onClick={handleCloseSheet}
          />
          <div className={`${styles.sheet} ${sheetVisible ? styles.sheetVisible : ''}`}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHeader}>
              <h2 className={styles.sheetTitle}>
                {selectedProblem.title} {selectedProblem.grade}
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
                  &quot;{selectedProblem.title}&quot; {selectedProblem.grade} on {selectedTopo.title}, {boulder.title},{' '}
                  {cragTitle}. @granite_climbing #granite_climbing #climbing #bouldering
                </div>
              </div>

              <button className={styles.sheetCta} onClick={handleCopyCaption}>
                {copiedHashtag ? '✓ 캡션 복사됨!' : '캡션 복사하기'}
              </button>

              {selectedProblem.hashtag && (
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
