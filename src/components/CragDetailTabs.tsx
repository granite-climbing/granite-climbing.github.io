'use client';

import { useState } from 'react';
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
}

interface Boulder {
  slug: string;
  title: string;
  thumbnail: string;
  description: string;
  problemCount: number;
}

interface Problem {
  slug: string;
  title: string;
  grade: string;
  description: string;
  boulderSlug: string;
  boulderTitle: string;
}

interface CragDetailTabsProps {
  crag: Crag;
  boulders: Boulder[];
  problems: Problem[];
}

type TabType = 'info' | 'boulder' | 'route' | 'map' | 'travel';

export default function CragDetailTabs({ crag, boulders, problems }: CragDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'info', label: 'Info' },
    { id: 'boulder', label: 'Boulder' },
    { id: 'route', label: 'Route' },
    { id: 'map', label: 'Map' },
    { id: 'travel', label: 'Travel' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {activeTab === 'info' && <InfoTab crag={crag} />}
        {activeTab === 'boulder' && <BoulderTab crag={crag} boulders={boulders} />}
        {activeTab === 'route' && <RouteTab crag={crag} problems={problems} />}
        {activeTab === 'map' && <MapTab crag={crag} />}
        {activeTab === 'travel' && <TravelTab crag={crag} />}
      </div>
    </div>
  );
}

function InfoTab({ crag }: { crag: Crag }) {
  return (
    <div className={styles.infoTab}>
      <div className={styles.summary}>
        {crag.boulderCount} boulders · {crag.problemCount} problems
      </div>

      <div className={styles.mapPreview}>
        {crag.mapImage ? (
          <a href={crag.mapLink} target="_blank" rel="noopener noreferrer">
            <img src={crag.mapImage} alt="지도" className={styles.mapImage} />
            <div className={styles.mapOverlay}>
              <span className={styles.mapLabel}>카카오맵 연동</span>
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

function BoulderTab({ crag, boulders }: { crag: Crag; boulders: Boulder[] }) {
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
          <a
            href={`/crag/${crag.slug}/boulder/${boulder.slug}`}
            key={boulder.slug}
            className={styles.boulderCard}
          >
            <div className={styles.boulderImage}>
              {boulder.thumbnail ? (
                <img src={boulder.thumbnail} alt={boulder.title} />
              ) : (
                <div className={styles.boulderImagePlaceholder} />
              )}
            </div>
            <div className={styles.boulderInfo}>
              <h3 className={styles.boulderTitle}>{boulder.title}</h3>
              <p className={styles.boulderMeta}>
                {boulder.problemCount} problems · {crag.difficultyMin}-{crag.difficultyMax}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function RouteTab({ crag, problems }: { crag: Crag; problems: Problem[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'grade' | 'boulder'>('grade');

  const filteredProblems = problems.filter((problem) =>
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

  return (
    <div className={styles.routeTab}>
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
              href={`/crag/${crag.slug}/boulder/${problem.boulderSlug}#${problem.slug}`}
              key={`${problem.boulderSlug}-${problem.slug}-${index}`}
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

function TravelTab({ crag }: { crag: Crag }) {
  return (
    <div className={styles.travelTab}>
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
