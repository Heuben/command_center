import React, { useEffect, useRef } from 'react';
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { Alert, BranchResponseStatus, CommandCenter, LatLng, UserAccount } from '../../types';
import { useSession } from '../../contexts/SessionContext';
import { alertTypeLabel, branchStatusLabel } from '../../utils/labels';

const MapContainerAny = MapContainer as any;
const TileLayerAny = TileLayer as any;
const CircleAny = Circle as any;
const CircleMarkerAny = CircleMarker as any;
const TooltipAny = Tooltip as any;

export type MapIncident = {
  alert: Alert;
  status: BranchResponseStatus;
};

const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const BRAND_MAP_COLOR = '#ca2028';

const statusColor: Record<BranchResponseStatus, string> = {
  pending: '#c26a08',
  viewing: '#c26a08',
  dispatched: '#1d5be0',
  arrived: '#1d5be0',
  resolved: '#15803d'
};

/**
 * Keeps the map sized to its flex container and recenters safely.
 * Leaflet animations read `_leaflet_pos` off pane elements, so any queued
 * animation must be stopped before the map can be torn down.
 */
function MapController({ center }: {center: LatLng | null;}) {
  const map = useMap();
  const hasPlaced = useRef(false);

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
    if (!center) return;
    const frame = requestAnimationFrame(() => {
      const container = map.getContainer();
      if (!container.isConnected || container.clientWidth === 0) return;
      try {
        if (hasPlaced.current) {
          map.flyTo([center.lat, center.lng], 16, { duration: 0.6 });
        } else {
          hasPlaced.current = true;
          map.setView([center.lat, center.lng], 16, { animate: false });
        }
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
  }, [center, map]);

  return null;
}

export function LiveMap({
  incidents,
  responders,
  centers,
  selectedAlertId,
  onSelect






}: {incidents: MapIncident[];responders: UserAccount[];centers: CommandCenter[];selectedAlertId: string | null;onSelect: (alertId: string) => void;}) {
  const { theme } = useSession();
  const selected = incidents.find((i) => i.alert.id === selectedAlertId)?.alert.location ?? null;

  return (
    <MapContainerAny
      center={[14.6577, 120.9842]}
      zoom={14}
      zoomControl
      scrollWheelZoom
      className="h-full w-full">
      <TileLayerAny
        key={theme}
        url={OSM_TILES}
        attribution={ATTRIBUTION}
      />
      

      <MapController center={selected} />

      {/* Station jurisdiction: command center location and its broadcast radius */}
      {centers.map((c) =>
      <React.Fragment key={c.id}>
          <CircleAny
            center={[c.location.lat, c.location.lng]}
            radius={3000}
            pathOptions={{
              color: BRAND_MAP_COLOR,
              weight: 1,
              dashArray: '4 4',
              fillColor: BRAND_MAP_COLOR,
              fillOpacity: 0.04
            }}
            interactive={false}
          />
        

          <CircleMarkerAny
            center={[c.location.lat, c.location.lng]}
            radius={6}
            pathOptions={{
              color: BRAND_MAP_COLOR,
              weight: 2,
              fillColor: '#ffffff',
              fillOpacity: 1
            }}
          >
            <TooltipAny direction="top" offset={[0, -6]}>
              <span className="text-[12px] font-medium">{c.name} · Station</span>
            </TooltipAny>
          </CircleMarkerAny>
        </React.Fragment>
      )}

      {responders.map((r) =>
      r.r_profile?.position ?
      <CircleMarkerAny
        key={r.id}
        center={[r.r_profile.position.lat, r.r_profile.position.lng]}
        radius={5}
        pathOptions={{
          color: '#ffffff',
          weight: 2,
          fillColor: r.r_profile.availability === 'dispatched' ? '#1d5be0' : '#15803d',
          fillOpacity: 1
        }}
      >
            <TooltipAny direction="top" offset={[0, -6]}>
              <span className="text-[12px] font-medium">
                {r.r_profile.call_sign ?? `${r.f_name} ${r.l_name}`}
              </span>
            </TooltipAny>
          </CircleMarkerAny> :
      null
      )}

      {incidents.map(({ alert, status }) => {
        const active = alert.id === selectedAlertId;
        const color = statusColor[status];
        return (
          <React.Fragment key={alert.id}>
            <CircleMarkerAny
              key={`${alert.id}-halo`}
              center={[alert.location.lat, alert.location.lng]}
              radius={status === 'pending' || active ? active ? 20 : 15 : 0}
              pathOptions={{
                color,
                weight: 0,
                fillColor: color,
                fillOpacity: status === 'pending' || active ? 0.16 : 0
              }}
              interactive={false}
            />
            

            <CircleMarkerAny
              center={[alert.location.lat, alert.location.lng]}
              radius={active ? 10 : 8}
              eventHandlers={{ click: () => onSelect(alert.id) }}
              pathOptions={{
                color: '#ffffff',
                weight: 2,
                fillColor: color,
                fillOpacity: 1
              }}
            >
              <TooltipAny direction="top" offset={[0, -8]}>
                <span className="text-[12px] font-medium">
                  {alertTypeLabel[alert.alert_type]} · {branchStatusLabel[status]}
                </span>
              </TooltipAny>
            </CircleMarkerAny>
          </React.Fragment>);

      })}
    </MapContainerAny>);

}
