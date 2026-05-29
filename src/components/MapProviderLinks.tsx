'use client';

import { MouseEvent, ReactNode } from 'react';
import {
  buildBrowserMapFallbackUrl,
  buildNativeMapBridgeMessage,
} from '@/lib/map-links';

type FlutterWebViewBridge = {
  postMessage: (message: string) => void;
};

type BridgeWindow = Window & {
  FlutterWebView?: FlutterWebViewBridge;
};

type MapProviderLinksProps = {
  label: string;
  latitude: number;
  longitude: number;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

export default function MapProviderLinks({
  label,
  latitude,
  longitude,
  children,
  className = '',
  ariaLabel,
  onClick,
}: MapProviderLinksProps) {
  const location = { label, latitude, longitude };

  const openMap = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;

    if (postNativeMapPickerMessage(location)) {
      return;
    }

    openBrowserMapFallback(location);
  };

  return (
    <button
      type="button"
      className={className}
      onClick={openMap}
      aria-label={ariaLabel || `${label} 지도 열기`}
    >
      {children}
    </button>
  );
}

function postNativeMapPickerMessage(location: {
  label: string;
  latitude: number;
  longitude: number;
}) {
  const bridge = (window as BridgeWindow).FlutterWebView;
  if (!bridge?.postMessage) return false;

  try {
    bridge.postMessage(JSON.stringify(buildNativeMapBridgeMessage(location)));
    return true;
  } catch {
    return false;
  }
}

function openBrowserMapFallback(location: {
  label: string;
  latitude: number;
  longitude: number;
}) {
  const url = buildBrowserMapFallbackUrl(location);
  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  if (!popup) {
    window.location.href = url;
  }
}
