import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Granite',
  description: 'Image and Article Gallery',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
