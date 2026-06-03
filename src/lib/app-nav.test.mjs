import assert from 'node:assert/strict'
import test from 'node:test'

import appNav from './app-nav.js'

const {
  buildAppNavHref,
  isAppNavActive,
  isAppNavAllowedPath,
  shouldShowAppNav,
} = appNav

test('shows app nav only when Flutter WebView bridge or QA override is present', () => {
  assert.equal(
    shouldShowAppNav({
      pathname: '/',
      hasFlutterBridge: true,
      searchParams: new URLSearchParams(),
    }),
    true
  )

  assert.equal(
    shouldShowAppNav({
      pathname: '/',
      hasFlutterBridge: false,
      searchParams: new URLSearchParams('appNav=1'),
    }),
    true
  )

  assert.equal(
    shouldShowAppNav({
      pathname: '/',
      hasFlutterBridge: false,
      searchParams: new URLSearchParams(),
    }),
    false
  )
})

test('hides app nav on admin and boulder topo screens', () => {
  assert.equal(isAppNavAllowedPath('/admin'), false)
  assert.equal(isAppNavAllowedPath('/admin/beta-videos'), false)
  assert.equal(isAppNavAllowedPath('/crag/suraksan/boulder/ivy-boulder'), false)
  assert.equal(isAppNavAllowedPath('/crag/suraksan'), true)
  assert.equal(isAppNavAllowedPath('/culture/rocktrip'), true)
})

test('marks top-level app nav destinations active from nested routes', () => {
  assert.equal(isAppNavActive('/', '/'), true)
  assert.equal(isAppNavActive('/', '/crag'), false)
  assert.equal(isAppNavActive('/crag', '/crag/suraksan'), true)
  assert.equal(isAppNavActive('/culture', '/culture/trable'), true)
  assert.equal(isAppNavActive('/culture', '/privacy'), false)
})

test('keeps QA override on app nav links when requested', () => {
  assert.equal(buildAppNavHref('/crag', true), '/crag?appNav=1')
  assert.equal(buildAppNavHref('/culture', true), '/culture?appNav=1')
  assert.equal(buildAppNavHref('/', true), '/?appNav=1')
  assert.equal(buildAppNavHref('/crag', false), '/crag')
})
