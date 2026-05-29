/**
 * @typedef {Object} MapLocation
 * @property {string} label
 * @property {number} latitude
 * @property {number} longitude
 */

/**
 * @param {MapLocation} location
 */
function buildKakaoMapUrl(location) {
  return `https://map.kakao.com/link/map/${encodeURIComponent(location.label)},${location.latitude},${location.longitude}`
}

/**
 * @param {MapLocation} location
 */
function buildBrowserMapFallbackUrl(location) {
  return buildKakaoMapUrl(location)
}

/**
 * @param {MapLocation} location
 * @param {number} [timestamp]
 */
function buildNativeMapBridgeMessage(location, timestamp = Date.now()) {
  return {
    version: 1,
    type: 'navigation.map.open.requested',
    direction: 'web-to-native',
    payload: {
      label: location.label,
      latitude: location.latitude,
      longitude: location.longitude,
    },
    timestamp,
  }
}

module.exports = {
  buildBrowserMapFallbackUrl,
  buildKakaoMapUrl,
  buildNativeMapBridgeMessage,
}
