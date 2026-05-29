import assert from 'node:assert/strict'
import test from 'node:test'

import mapLinks from './map-links.js'

const {
  buildBrowserMapFallbackUrl,
  buildKakaoMapUrl,
  buildNativeMapBridgeMessage,
} = mapLinks

test('builds a Kakao Map URL from a shared label and coordinate', () => {
  const location = {
    label: '수락산 주차장',
    latitude: 37.682312,
    longitude: 127.058412,
  }

  assert.equal(
    buildKakaoMapUrl(location),
    'https://map.kakao.com/link/map/%EC%88%98%EB%9D%BD%EC%82%B0%20%EC%A3%BC%EC%B0%A8%EC%9E%A5,37.682312,127.058412'
  )
})

test('uses Kakao Map as the browser fallback URL', () => {
  const location = {
    label: '수락산 주차장',
    latitude: 37.682312,
    longitude: 127.058412,
  }

  assert.equal(buildBrowserMapFallbackUrl(location), buildKakaoMapUrl(location))
})

test('builds a bridge message for the native map opener', () => {
  const location = {
    label: '수락산 주차장',
    latitude: 37.682312,
    longitude: 127.058412,
  }

  assert.deepEqual(buildNativeMapBridgeMessage(location, 1710000000000), {
    version: 1,
    type: 'navigation.map.open.requested',
    direction: 'web-to-native',
    payload: location,
    timestamp: 1710000000000,
  })
})
