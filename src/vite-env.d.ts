/// <reference types="vite/client" />

declare module 'leaflet' {
  export interface LatLngLiteral {
    lat: number;
    lng: number;
  }
  export type LatLngExpression = [number, number] | LatLngLiteral | any;

  export interface Map {
    getContainer(): HTMLElement;
    invalidateSize(options?: { animate?: boolean }): this;
    flyTo(latlng: LatLngExpression, zoom?: number, options?: any): this;
    setView(latlng: LatLngExpression, zoom?: number, options?: any): this;
    stop(): this;
    getZoom(): number;
    [key: string]: any;
  }

  export interface LeafletEventHandlerFnMap {
    click?: (event: any) => void;
    [key: string]: any;
  }

  export const [key: string]: any;
}
