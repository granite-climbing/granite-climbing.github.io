'use client';

import Script from 'next/script';

export default function AdminPage() {
  return (
    <>
      <Script
        src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"
        strategy="afterInteractive"
      />
    </>
  );
}
