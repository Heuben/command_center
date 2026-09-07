import React, { useEffect, useRef } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { CrosshairIcon } from 'lucide-react';
import type { LatLng } from '../../types';
import { useSession } from '../../contexts/SessionContext';
import { Input, Label } from './primitives';

const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const ATTRIBUTION = '&copy; OpenStreetMap &copy; CARTO';

/** Fallback view when neither coordinate has been entered yet. */
const DEFAULT_CENTER: LatLng = { lat: 14.6577, lng: 120.9842 };

function ClickCapture({ onPick }: {onPick: (next: LatLng) => void;}) {
  useMapEvents({
    click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
  });
  return null;
}

/**
 * Keeps the map sized to its container and recenters when the marker is moved
 * from outside the map (i.e. by typing into the coordinate fields).
 */
function PickerController({ marker }: {marker: LatLng | null;}) {
  const map = useMap();
  const lastCentered = useRef<string | null>(null);

  useEffect(() => {
    const container = map.getContainer();
    const frame = requestAnimationFrame(() => {
      try {
        map.invalidateSize({ animate: false });
      } catch {

        /* map already removed */}
    });
    const observer = new ResizeObserver(() => {
      try {
        map.invalidateSize({ animate: false });
      } catch {

        /* map already removed */}
    });
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);

  useEffect(() => {
    if (!marker) return;
    const key = `${marker.lat.toFixed(5)}:${marker.lng.toFixed(5)}`;
    if (lastCentered.current === key) return;
    lastCentered.current = key;
    const frame = requestAnimationFrame(() => {
      const container = map.getContainer();
      if (!container.isConnected || container.clientWidth === 0) return;
      try {
        map.setView([marker.lat, marker.lng], map.getZoom(), { animate: false });
      } catch {

        /* map already removed */}
    });
    return () => {
      cancelAnimationFrame(frame);
      try {
        map.stop();
      } catch {

        /* map already removed */}
    };
  }, [marker, map]);

  return null;
}

/**
 * Interactive coordinate picker. Clicking the map sets the marker and writes
 * back the coordinates; the numeric fields stay editable for manual overrides.
 */
export function LocationPicker({
  lat,
  lng,
  onChange,
  latInvalid,
  lngInvalid






}: {lat: string;lng: string;onChange: (next: {lat: string;lng: string;}) => void;latInvalid?: boolean;lngInvalid?: boolean;}) {
  const { theme } = useSession();

  const latNum = Number(lat);
  const lngNum = Number(lng);
  const marker: LatLng | null =
  lat !== '' &&
  lng !== '' &&
  Number.isFinite(latNum) &&
  Number.isFinite(lngNum) &&
  Math.abs(latNum) <= 90 &&
  Math.abs(lngNum) <= 180 ?
  { lat: latNum, lng: lngNum } :
  null;

  const center = marker ?? DEFAULT_CENTER;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-line">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-ink/[0.02] px-3 py-2">
          <p className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-muted">
            <CrosshairIcon className="h-3.5 w-3.5 text-primary" aria-hidden />
            Click the map to place this branch
          </p>
          <p className="font-mono text-[11px] tabular-nums text-ink-faint">
            {marker ? `${marker.lat.toFixed(5)}, ${marker.lng.toFixed(5)}` : 'No point selected'}
          </p>
        </div>
        <div className="h-56 w-full">
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={14}
            scrollWheelZoom
            className="h-full w-full"
            attributionControl>
            <TileLayer
              url={theme === 'dark' ? DARK_TILES : LIGHT_TILES}
              attribution={ATTRIBUTION}
              subdomains="abcd"
              maxZoom={20} />
            
            <ClickCapture
              onPick={(next) =>
              onChange({ lat: next.lat.toFixed(5), lng: next.lng.toFixed(5) })
              } />
            
            <PickerController marker={marker} />
            {marker &&
            <>
                <CircleMarker
                center={[marker.lat, marker.lng]}
                radius={13}
                pathOptions={{
                  color: '#2563eb',
                  weight: 2,
                  fillColor: '#2563eb',
                  fillOpacity: 0.14
                }} />
              
                <CircleMarker
                center={[marker.lat, marker.lng]}
                radius={5}
                pathOptions={{
                  color: '#ffffff',
                  weight: 2,
                  fillColor: '#2563eb',
                  fillOpacity: 1
                }} />
              
              </>
            }
          </MapContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cc-lat">Latitude</Label>
          <Input
            id="cc-lat"
            type="number"
            step="any"
            value={lat}
            onChange={(e) => onChange({ lat: e.target.value, lng })}
            placeholder="14.6577"
            invalid={latInvalid}
            required />
          
        </div>
        <div>
          <Label htmlFor="cc-lng">Longitude</Label>
          <Input
            id="cc-lng"
            type="number"
            step="any"
            value={lng}
            onChange={(e) => onChange({ lat, lng: e.target.value })}
            placeholder="120.9842"
            invalid={lngInvalid}
            required />
          
        </div>
      </div>
    </div>);

}