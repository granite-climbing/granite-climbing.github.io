'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  buildAppNavHref,
  isAppNavActive,
  shouldShowAppNav,
} from '@/lib/app-nav'
import styles from './BottomNav.module.css'

type FlutterWebViewBridge = {
  postMessage: (message: string) => void
}

type BridgeWindow = Window & {
  FlutterWebView?: FlutterWebViewBridge
}

const navItems = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z" />
      </svg>
    ),
  },
  {
    href: '/crag',
    label: 'Crag',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 20 9.5 6.5 14 14l2-3.5L21 20H3Z" />
      </svg>
    ),
  },
  {
    href: '/culture',
    label: 'Culture',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 4h10a3 3 0 0 1 3 3v15H7a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2Zm1 15h10V7a1 1 0 0 0-1-1H7v13Z" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname() || '/'
  const [isVisible, setIsVisible] = useState(false)
  const [preserveQaOverride, setPreserveQaOverride] = useState(false)

  useEffect(() => {
    const bridgeWindow = window as BridgeWindow
    const searchParams = new URLSearchParams(window.location.search)
    const hasQaOverride = searchParams.get('appNav') === '1'

    setPreserveQaOverride(hasQaOverride)
    setIsVisible(
      shouldShowAppNav({
        pathname,
        hasFlutterBridge: Boolean(bridgeWindow.FlutterWebView?.postMessage),
        searchParams,
      })
    )
  }, [pathname])

  useEffect(() => {
    document.body.classList.toggle('app-nav-visible', isVisible)

    return () => {
      document.body.classList.remove('app-nav-visible')
    }
  }, [isVisible])

  if (!isVisible) {
    return null
  }

  return (
    <nav className={styles.nav} aria-label="앱 하단 네비게이션">
      {navItems.map((item) => {
        const active = isAppNavActive(item.href, pathname)

        return (
          <a
            key={item.href}
            href={buildAppNavHref(item.href, preserveQaOverride)}
            className={`${styles.item} ${active ? styles.active : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </a>
        )
      })}
    </nav>
  )
}
