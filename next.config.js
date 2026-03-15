const fs = require('fs');
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

// Inject NEXT_PUBLIC_* env vars into public/admin/env.js at build time
// This allows static HTML files (e.g. beta-videos.html) to access them via window.__ENV__
const envJs = `window.__ENV__ = ${JSON.stringify({
  INSTAGRAM_API_URL: process.env.NEXT_PUBLIC_INSTAGRAM_API_URL || '',
})};`;
fs.writeFileSync(path.join(__dirname, 'public/admin/env.js'), envJs);

module.exports = nextConfig
