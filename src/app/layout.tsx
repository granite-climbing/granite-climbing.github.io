import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { getSiteSettings } from '@/lib/content'

const settings = getSiteSettings();

export const metadata: Metadata = {
  title: {
    default: settings.title,
    template: `%s | ${settings.title}`,
  },
  description: settings.description,
  metadataBase: settings.siteUrl ? new URL(settings.siteUrl) : undefined,
  openGraph: {
    type: 'website',
    siteName: settings.title,
    title: settings.title,
    description: settings.description,
    images: settings.heroImage ? [{ url: settings.heroImage }] : [],
  },
  twitter: {
    card: 'summary_large_image',
    title: settings.title,
    description: settings.description,
    images: settings.heroImage ? [settings.heroImage] : [],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
      <Script src="//t1.daumcdn.net/kas/static/ba.min.js" strategy="afterInteractive" />
    </html>
  )
}
