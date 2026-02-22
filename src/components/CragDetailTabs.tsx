'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import styles from './CragDetailTabs.module.css';

interface Crag {
  slug: string;
  title: string;
  thumbnail: string;
  difficultyMin: string;
  difficultyMax: string;
  description: string;
  problemCount: number;
  boulderCount: number;
  address: string;
  howToGetThere: string;
  parkingSpot: string;
  cafeLink: string;
  mapImage: string;
  mapLink: string;
  latitude?: number;
  longitude?: number;
}

interface Boulder {
  slug: string;
  title: string;
  thumbnail: string;
  description: string;
  problemCount: number;
  latitude?: number;
  longitude?: number;
}

interface Problem {
  slug: string;
  title: string;
  grade: string;
  description: string;
  topoSlug: string;
  topoTitle: string;
  boulderSlug: string;
  boulderTitle: string;
}

interface CultureItem {
  slug: string;
  title: string;
  date: string;
  thumbnail: string;
  excerpt: string;
  type: 'trable' | 'rocktrip';
}

interface CragDetailTabsProps {
  crag: Crag;
  boulders: Boulder[];
  problems: Problem[];
  cultureItems: CultureItem[];
}

type TabType = 'info' | 'boulder' | 'route' | 'map' | 'travel';

export default function CragDetailTabs({ crag, boulders, problems, cultureItems }: CragDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [selectedBoulder, setSelectedBoulder] = useState<string | null>(null);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'info', label: 'Info' },
    { id: 'boulder', label: 'Boulder' },
    { id: 'route', label: 'Route' },
    { id: 'map', label: 'Map' },
    { id: 'travel', label: 'Travel' },
  ];

  const handleBoulderClick = (boulderSlug: string) => {
    setSelectedBoulder(boulderSlug);
    setActiveTab('route');
  };

  const handleClearBoulderFilter = () => {
    setSelectedBoulder(null);
  };

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    if (tabId !== 'route') {
      setSelectedBoulder(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {activeTab === 'info' && <InfoTab crag={crag} />}
        {activeTab === 'boulder' && <BoulderTab crag={crag} boulders={boulders} onBoulderClick={handleBoulderClick} />}
        {activeTab === 'route' && <RouteTab crag={crag} problems={problems} selectedBoulder={selectedBoulder} onClearFilter={handleClearBoulderFilter} />}
        {activeTab === 'map' && <MapTab crag={crag} />}
        {activeTab === 'travel' && <TravelTab cultureItems={cultureItems} />}
      </div>
    </div>
  );
}

function InfoTab({ crag }: { crag: Crag }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const initializeMap = () => {
    if (!mapContainerRef.current || !crag.latitude || !crag.longitude) return;
    if (typeof window === 'undefined' || !window.kakao?.maps) return;

    window.kakao.maps.load(() => {
      if (!mapContainerRef.current) return;

      const position = new window.kakao.maps.LatLng(crag.latitude!, crag.longitude!);
      const options = {
        center: position,
        level: 4,
      };

      const map = new window.kakao.maps.Map(mapContainerRef.current, options);

      const marker = new window.kakao.maps.Marker({
        position: position,
        map: map,
      });

      const infoWindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:5px;font-size:12px;">${crag.title}</div>`,
      });
      infoWindow.open(map, marker);

      setIsMapLoaded(true);
    });
  };

  useEffect(() => {
    // 스크립트가 이미 로드되어 있으면 바로 초기화
    if (window.kakao?.maps) {
      initializeMap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crag.latitude, crag.longitude]);

  const handleScriptLoad = () => {
    initializeMap();
  };

  const hasKakaoMap = crag.latitude && crag.longitude;

  return (
    <div className={styles.infoTab}>
      <div className={styles.summary}>
        {crag.boulderCount} boulders · {crag.problemCount} problems
      </div>

      <div className={styles.mapPreview}>
        {hasKakaoMap ? (
          <>
            <Script
              src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY}&autoload=false`}
              strategy="afterInteractive"
              onLoad={handleScriptLoad}
            />
            <div ref={mapContainerRef} className={styles.infoKakaoMap}>
              {!isMapLoaded && (
                <div className={styles.mapLoading}>
                  <p>지도를 불러오는 중...</p>
                </div>
              )}
            </div>
          </>
        ) : crag.mapImage ? (
          <a href={crag.mapLink} target="_blank" rel="noopener noreferrer">
            <img src={crag.mapImage} alt="지도" className={styles.mapImage} />
            <div className={styles.mapOverlay}>
              <span className={styles.mapLabel}>지도 보기</span>
            </div>
          </a>
        ) : (
          <div className={styles.mapPlaceholder}>
            <span>지도 준비중</span>
          </div>
        )}
      </div>

      <div className={styles.infoList}>
        <div className={styles.infoItem}>
          <div className={styles.infoIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <div className={styles.infoContent}>
            <div className={styles.infoLabel}>Address</div>
            <div className={styles.infoValue}>{crag.address || '주소 정보 없음'}</div>
          </div>
        </div>

        <div className={styles.infoItem}>
          <div className={styles.infoIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div className={styles.infoContent}>
            <div className={styles.infoLabel}>How to get there?</div>
            <div className={styles.infoValue}>{crag.howToGetThere || '정보 없음'}</div>
          </div>
        </div>
      </div>

      <div className={styles.buttons}>
        {crag.parkingSpot && (
          <a href={crag.parkingSpot} target="_blank" rel="noopener noreferrer" className={styles.button}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 3H6v18h4v-6h3c3.31 0 6-2.69 6-6s-2.69-6-6-6zm.2 8H10V7h3.2c1.1 0 2 .9 2 2s-.9 2-2 2z"/>
            </svg>
            Parking Spot
          </a>
        )}
        {crag.cafeLink && (
          <a href={crag.cafeLink} target="_blank" rel="noopener noreferrer" className={styles.button}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.5 3H6c-1.1 0-2 .9-2 2v5.71c0 3.83 2.95 7.18 6.78 7.29 3.96.12 7.22-3.06 7.22-7V8h1.5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 3h-1.5V5h1.5v1zM4 19h16v2H4z"/>
            </svg>
            Cafe
          </a>
        )}
      </div>
    </div>
  );
}

function BoulderTab({ crag, boulders, onBoulderClick }: { crag: Crag; boulders: Boulder[]; onBoulderClick: (boulderSlug: string) => void }) {
  if (boulders.length === 0) {
    return (
      <div className={styles.placeholderTab}>
        <p>등록된 볼더가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={styles.boulderTab}>
      <div className={styles.boulderList}>
        {boulders.map((boulder) => (
          <div
            key={boulder.slug}
            className={styles.boulderCard}
            onClick={() => onBoulderClick(boulder.slug)}
          >
            <div className={styles.boulderImage}>
              {boulder.thumbnail ? (
                <img src={boulder.thumbnail} alt={boulder.title} />
              ) : (
                <div className={styles.boulderImagePlaceholder} />
              )}
              {boulder.latitude && boulder.longitude && (
                <button
                  className={styles.boulderMapButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    const webFallbackUrl = `https://map.kakao.com/link/map/${encodeURIComponent(boulder.title)},${boulder.latitude},${boulder.longitude}`;

                    // Try to open Kakao Map app, fallback to web on error
                    const iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    iframe.src = `kakaomap://look?p=${boulder.latitude},${boulder.longitude}`;
                    document.body.appendChild(iframe);

                    // If app doesn't open within 1 second, open web version
                    const timer = setTimeout(() => {
                      window.open(webFallbackUrl, '_blank');
                    }, 1000);

                    // Clean up
                    setTimeout(() => {
                      clearTimeout(timer);
                      document.body.removeChild(iframe);
                    }, 2000);
                  }}
                  aria-label="카카오맵에서 위치 보기"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
                  </svg>
                </button>
              )}
            </div>
            <div className={styles.boulderInfo}>
              <h3 className={styles.boulderTitle}>{boulder.title}</h3>
              <p className={styles.boulderMeta}>
                {boulder.problemCount} problems · {crag.difficultyMin}-{crag.difficultyMax}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RouteTab({ crag, problems, selectedBoulder, onClearFilter }: { crag: Crag; problems: Problem[]; selectedBoulder: string | null; onClearFilter: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'grade' | 'boulder'>('grade');

  // Filter by selected boulder first
  const boulderFilteredProblems = selectedBoulder
    ? problems.filter((problem) => problem.boulderSlug === selectedBoulder)
    : problems;

  const filteredProblems = boulderFilteredProblems.filter((problem) =>
    problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    problem.grade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedProblems = [...filteredProblems].sort((a, b) => {
    if (sortBy === 'grade') {
      const gradeA = parseInt(a.grade.replace('V', '')) || 0;
      const gradeB = parseInt(b.grade.replace('V', '')) || 0;
      return gradeA - gradeB;
    }
    return a.boulderTitle.localeCompare(b.boulderTitle);
  });

  if (problems.length === 0) {
    return (
      <div className={styles.placeholderTab}>
        <p>등록된 루트가 없습니다.</p>
      </div>
    );
  }

  const selectedBoulderInfo = selectedBoulder
    ? problems.find((p) => p.boulderSlug === selectedBoulder)
    : null;

  return (
    <div className={styles.routeTab}>
      {selectedBoulder && selectedBoulderInfo && (
        <div className={styles.routeHeader}>
          <h3 className={styles.selectedBoulderTitle}>{selectedBoulderInfo.boulderTitle}</h3>
          <button
            className={styles.showAllButton}
            onClick={onClearFilter}
          >
            Route All <span className={styles.arrow}>→</span>
          </button>
        </div>
      )}

      <div className={styles.searchBox}>
        <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input
          type="text"
          placeholder="루트 이름 검색, 난이도 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.routeTable}>
        <div className={styles.routeHeader}>
          <button
            className={`${styles.routeHeaderCell} ${styles.routeColumn}`}
            onClick={() => setSortBy('boulder')}
          >
            Route
            {sortBy === 'boulder' && <span className={styles.sortArrow}>▼</span>}
          </button>
          <button
            className={`${styles.routeHeaderCell} ${styles.gradeColumn}`}
            onClick={() => setSortBy('grade')}
          >
            Grade
            {sortBy === 'grade' && <span className={styles.sortArrow}>▼</span>}
          </button>
          <div className={`${styles.routeHeaderCell} ${styles.boulderColumn}`}>
            Boulder
          </div>
        </div>

        <div className={styles.routeList}>
          {sortedProblems.map((problem, index) => (
            <a
              href={`/crag/${crag.slug}/boulder/${problem.boulderSlug}#${problem.topoSlug}`}
              key={`${problem.topoSlug}-${problem.slug}-${index}`}
              className={styles.routeRow}
            >
              <div className={`${styles.routeCell} ${styles.routeColumn}`}>
                {problem.title}
              </div>
              <div className={`${styles.routeCell} ${styles.gradeColumn}`}>
                {problem.grade}
              </div>
              <div className={`${styles.routeCell} ${styles.boulderColumn}`}>
                {problem.boulderTitle}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function MapTab({ crag }: { crag: Crag }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const initializeMap = () => {
    if (!mapContainerRef.current || !crag.latitude || !crag.longitude) return;
    if (typeof window === 'undefined' || !window.kakao?.maps) return;

    window.kakao.maps.load(() => {
      if (!mapContainerRef.current) return;

      const position = new window.kakao.maps.LatLng(crag.latitude!, crag.longitude!);
      const options = {
        center: position,
        level: 3,
      };

      const map = new window.kakao.maps.Map(mapContainerRef.current, options);

      const marker = new window.kakao.maps.Marker({
        position: position,
        map: map,
      });

      const infoWindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:5px;font-size:12px;">${crag.title}</div>`,
      });
      infoWindow.open(map, marker);

      setIsMapLoaded(true);
    });
  };

  useEffect(() => {
    // 스크립트가 이미 로드되어 있으면 바로 초기화
    if (window.kakao?.maps) {
      initializeMap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crag.latitude, crag.longitude]);

  const handleScriptLoad = () => {
    initializeMap();
  };

  if (!crag.latitude || !crag.longitude) {
    return (
      <div className={styles.mapTab}>
        {crag.mapImage ? (
          <a href={crag.mapLink} target="_blank" rel="noopener noreferrer" className={styles.fullMap}>
            <img src={crag.mapImage} alt="지도" />
          </a>
        ) : (
          <div className={styles.placeholderTab}>
            <p>지도가 준비중입니다.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.mapTab}>
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY}&autoload=false`}
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
      />
      <div ref={mapContainerRef} className={styles.kakaoMap}>
        {!isMapLoaded && (
          <div className={styles.mapLoading}>
            <p>지도를 불러오는 중...</p>
          </div>
        )}
      </div>
      {crag.mapLink && (
        <a
          href={crag.mapLink}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.mapExternalLink}
        >
          카카오맵에서 보기
        </a>
      )}
    </div>
  );
}

function TravelTab({ cultureItems }: { cultureItems: CultureItem[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(cultureItems.length / itemsPerPage);

  const paginatedItems = cultureItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (cultureItems.length === 0) {
    return (
      <div className={styles.placeholderTab}>
        <p>등록된 게시물이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={styles.travelTab}>
      <div className={styles.postList}>
        {paginatedItems.map((item) => (
          <a
            href={`/culture/${item.type}/${item.slug}`}
            key={`${item.type}-${item.slug}`}
            className={styles.postCard}
          >
            <div className={styles.postContent}>
              <h3 className={styles.postTitle}>{item.title}</h3>
              <p className={styles.postExcerpt}>{item.excerpt}</p>
              <span className={styles.postDate}>{item.date}</span>
            </div>
            <div className={styles.postThumbnail}>
              {item.thumbnail ? (
                <img src={item.thumbnail} alt={item.title} />
              ) : (
                <div className={styles.postThumbnailPlaceholder} />
              )}
            </div>
          </a>
        ))}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageButton}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            &lt;
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              className={`${styles.pageButton} ${currentPage === page ? styles.active : ''}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          <button
            className={styles.pageButton}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}
