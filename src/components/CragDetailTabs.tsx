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

interface CragDetailTabsProps {
  crag: Crag;
}

type TabType = 'info' | 'boulder' | 'route' | 'map' | 'travel';

export default function CragDetailTabs({ crag }: CragDetailTabsProps) {
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
        {activeTab === 'boulder' && <BoulderTab crag={crag} />}
        {activeTab === 'route' && <RouteTab />}
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

function BoulderTab({ crag }: { crag: Crag }) {
  return (
    <div className={styles.placeholderTab}>
      <p>볼더 목록이 준비중입니다.</p>
      <p className={styles.placeholderInfo}>{crag.boulderCount}개의 볼더가 등록될 예정입니다.</p>
    </div>
  );
}

function RouteTab() {
  return (
    <div className={styles.placeholderTab}>
      <p>루트 정보가 준비중입니다.</p>
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
