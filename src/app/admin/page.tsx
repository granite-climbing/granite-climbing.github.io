'use client';

import Script from 'next/script';
import Link from 'next/link';

export default function AdminPage() {
  return (
    <>
      <Script
        src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"
        strategy="afterInteractive"
      />
      <Link
        href="/admin/beta-videos/"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: '#1a1a2e',
          color: '#fff',
          padding: '10px 18px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontFamily: 'sans-serif',
          fontSize: '14px',
          fontWeight: 500,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#2d2d4e')}
        onMouseLeave={e => (e.currentTarget.style.background = '#1a1a2e')}
      >
        📹 베타영상 관리
      </Link>
    </>
  );
}
