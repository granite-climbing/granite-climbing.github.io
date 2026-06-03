const BOULDER_DETAIL_PATTERN = /^\/crag\/[^/]+\/boulder\/[^/]+\/?$/

function normalizePathname(pathname) {
  if (!pathname) return '/'
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }
  return pathname
}

function isAppNavAllowedPath(pathname) {
  const normalizedPathname = normalizePathname(pathname)

  if (
    normalizedPathname === '/admin' ||
    normalizedPathname.startsWith('/admin/')
  ) {
    return false
  }

  if (BOULDER_DETAIL_PATTERN.test(normalizedPathname)) {
    return false
  }

  return true
}

function hasAppNavQaOverride(searchParams) {
  return searchParams?.get('appNav') === '1'
}

function shouldShowAppNav({ pathname, hasFlutterBridge, searchParams }) {
  if (!isAppNavAllowedPath(pathname)) {
    return false
  }

  return Boolean(hasFlutterBridge || hasAppNavQaOverride(searchParams))
}

function isAppNavActive(href, pathname) {
  const normalizedHref = normalizePathname(href)
  const normalizedPathname = normalizePathname(pathname)

  if (normalizedHref === '/') {
    return normalizedPathname === '/'
  }

  return (
    normalizedPathname === normalizedHref ||
    normalizedPathname.startsWith(`${normalizedHref}/`)
  )
}

function buildAppNavHref(href, preserveQaOverride) {
  if (!preserveQaOverride) return href

  return `${href}${href.includes('?') ? '&' : '?'}appNav=1`
}

module.exports = {
  buildAppNavHref,
  isAppNavActive,
  isAppNavAllowedPath,
  shouldShowAppNav,
}
