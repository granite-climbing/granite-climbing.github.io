// 카카오맵 JavaScript SDK 타입 선언
declare namespace kakao.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class Map {
    constructor(container: HTMLElement, options: MapOptions);
    setCenter(latlng: LatLng): void;
    setLevel(level: number): void;
    getLevel(): number;
    getCenter(): LatLng;
    relayout(): void;
  }

  interface MapOptions {
    center: LatLng;
    level?: number;
  }

  class Marker {
    constructor(options: MarkerOptions);
    setMap(map: Map | null): void;
    getPosition(): LatLng;
    setPosition(position: LatLng): void;
  }

  interface MarkerOptions {
    position: LatLng;
    map?: Map;
  }

  class InfoWindow {
    constructor(options: InfoWindowOptions);
    open(map: Map, marker: Marker): void;
    close(): void;
    setContent(content: string | HTMLElement): void;
  }

  interface InfoWindowOptions {
    content?: string | HTMLElement;
    removable?: boolean;
  }

  function load(callback: () => void): void;
}

interface Window {
  kakao: {
    maps: typeof kakao.maps;
  };
}
