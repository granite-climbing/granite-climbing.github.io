'use client';

import { useState, useEffect } from 'react';
import styles from './Header.module.css';
import { getAssetPath } from '@/lib/utils';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [cragOpen, setCragOpen] = useState(false);
  const [cultureOpen, setCultureOpen] = useState(false);

  const openMenu = () => {
    setMenuOpen(true);
    // DOM이 렌더링된 후 애니메이션 시작
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    });
  };

  const closeMenu = () => {
    setIsVisible(false);
    setIsAnimating(true);
    setCragOpen(false);
    setCultureOpen(false);
  };

  useEffect(() => {
    if (isAnimating && !isVisible) {
      const timer = setTimeout(() => {
        setMenuOpen(false);
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isAnimating, isVisible]);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.logo}>
          <img src={getAssetPath('/images/logo.png')} alt="Granite" />
        </div>
        <button
          className={styles.hamburger}
          onClick={openMenu}
          aria-label="메뉴 열기"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </header>

      {menuOpen && (
        <div className={`${styles.menuOverlay} ${isVisible ? styles.open : ''}`}>
          <nav className={styles.menu}>
            <div className={styles.menuHeader}>
              <div className={styles.menuLogo}>
                <img src={getAssetPath('/images/logo.png')} alt="Granite" />
              </div>
              <button
                className={styles.closeButton}
                onClick={closeMenu}
                aria-label="메뉴 닫기"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className={styles.menuList}>
              <a href="/" className={styles.menuItem} onClick={closeMenu}>
                <span className={styles.underline}>Home</span>
              </a>

              <div className={styles.menuGroup}>
                <button
                  className={styles.menuItem}
                  onClick={() => setCragOpen(!cragOpen)}
                >
                  <span>Crag</span>
                  <svg
                    className={`${styles.arrow} ${cragOpen ? styles.arrowOpen : ''}`}
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {cragOpen && (
                  <div className={styles.subMenu}>
                    <a href="/crag" onClick={closeMenu}>All Crags</a>
                  </div>
                )}
              </div>

              <div className={styles.menuGroup}>
                <button
                  className={styles.menuItem}
                  onClick={() => setCultureOpen(!cultureOpen)}
                >
                  <span>Culture</span>
                  <svg
                    className={`${styles.arrow} ${cultureOpen ? styles.arrowOpen : ''}`}
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {cultureOpen && (
                  <div className={styles.subMenu}>
                    <a href="/culture/trable" onClick={closeMenu}>Travel</a>
                    <a href="/culture/rocktrip" onClick={closeMenu}>Rock Trip</a>
                  </div>
                )}
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
