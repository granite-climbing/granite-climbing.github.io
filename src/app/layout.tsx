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
      <head>
        <script src="https://identity.netlify.com/v1/netlify-identity-widget.js" defer />
      </head>
      <body>{children}</body>
    </html>
  )
}
