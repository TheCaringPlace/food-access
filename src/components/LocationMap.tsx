import { useEffect, useRef } from "react";
import { divIcon, type DivIcon, type Marker as LeafletMarker } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { formatLocationHours, TYPE_COLORS } from "../location-utils";
import type { CensusLocation, Location } from "../types";
import { formatLocationAddress, LocationActions } from "./LocationActions";
// oxlint-disable-next-line import/no-unassigned-import -- Vite loads CSS through side-effect imports.
import "leaflet/dist/leaflet.css";

const MAP_CENTER: [number, number] = [39.1, -84.5];

const TYPE_GLYPHS: Record<string, string> = {
  Pantry:
    '<path d="M3 4h2l2.2 11h10.6l2-7H6"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
  "Pop-up":
    '<path d="M2.5 7h12v9h-12zM14.5 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.5"/><circle cx="18" cy="18" r="1.5"/>',
  Shelter: '<path d="M3 18V7m0 7h18v4M3 11h5a3 3 0 0 1 3 3m0-3h7a3 3 0 0 1 3 3"/>',
  "Soup kitchen":
    '<path d="M5 3v5m-2-5v3a2 2 0 0 0 4 0V3m-2 5v13m11-18c-2 2-3 4-3 7h4V3m-2 7v11"/>',
  Other: '<path d="M4 12h16M12 4v16"/>',
  Search: '<circle cx="11" cy="11" r="6"/><circle cx="11" cy="11" r="2"/><path d="m16 16 5 5"/>',
};

function categoryIcon(type: string, color: string) {
  const glyphColor = type === "Shelter" ? "#594800" : "#fff";
  return divIcon({
    className: "",
    html: `<div style="width:30px;height:30px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;border:2px solid #fff;border-radius:50%;background:${color};box-shadow:0 1px 3px #3338"><svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${glyphColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TYPE_GLYPHS[type] ?? TYPE_GLYPHS.Other}</svg></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

const MARKER_ICONS: Record<string, DivIcon> = Object.fromEntries([
  ...Object.entries(TYPE_COLORS).map(([type, color]) => [type, categoryIcon(type, color)]),
  ["Search", categoryIcon("Search", "#4285F4")],
]);

function MapBounds({
  points,
  enabled,
  resetVersion,
}: {
  points: [number, number][];
  enabled: boolean;
  resetVersion: number;
}) {
  const map = useMap();
  const previousResetVersion = useRef(resetVersion);
  useEffect(() => {
    if (previousResetVersion.current !== resetVersion) {
      previousResetVersion.current = resetVersion;
      map.stop();
      map.setView(MAP_CENTER, 9);
      return;
    }
    if (!enabled) return;
    if (points.length > 1) {
      map.stop();
      map.fitBounds(points, { padding: [24, 24], maxZoom: 13 });
    } else if (points.length === 1) map.setView(points[0], 13);
  }, [enabled, map, points, resetVersion]);
  return null;
}

function MapFocus({ location, resetVersion }: { location: Location | null; resetVersion: number }) {
  const map = useMap();
  const previousResetVersion = useRef(resetVersion);
  useEffect(() => {
    if (previousResetVersion.current !== resetVersion) {
      previousResetVersion.current = resetVersion;
      return;
    }
    if (location) map.flyTo([location.latitude, location.longitude], 14, { duration: 0.5 });
  }, [location, map, resetVersion]);
  return null;
}

function LocationMarker({
  location,
  active,
  onLocationSelect,
  directionsOrigin,
}: {
  location: Location;
  active: boolean;
  onLocationSelect: (key: string) => void;
  directionsOrigin: CensusLocation | null;
}) {
  const markerRef = useRef<LeafletMarker | null>(null);
  const hours = formatLocationHours(location);

  useEffect(() => {
    if (active) markerRef.current?.openPopup();
    else markerRef.current?.closePopup();
  }, [active]);

  return (
    <Marker
      ref={markerRef}
      position={[location.latitude, location.longitude]}
      icon={MARKER_ICONS[location.type] ?? MARKER_ICONS.Other}
      alt={location.name}
      title={location.name}
      eventHandlers={{ click: () => onLocationSelect(location.key) }}
    >
      <Popup>
        <div className="mb-1 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: TYPE_COLORS[location.type] ?? TYPE_COLORS.Other }}
            />
            {location.type}
          </span>
          {location.distance !== undefined && (
            <span className="shrink-0 text-xs tabular-nums text-slate-600">
              {location.distance.toFixed(1)} mi
            </span>
          )}
        </div>
        <strong>{location.name}</strong>
        <br />
        {formatLocationAddress(location)}
        {hours && (
          <>
            <br />
            {hours}
          </>
        )}
        <div className="pt-2">
          <LocationActions location={location} origin={directionsOrigin} />
        </div>
      </Popup>
    </Marker>
  );
}

type LocationMapProps = {
  locations: Location[];
  points: [number, number][];
  fitBounds: boolean;
  resetVersion: number;
  activeLocation: Location | null;
  origin: [number, number] | null;
  directionsOrigin: CensusLocation | null;
  originLabel: string;
  onLocationSelect: (key: string) => void;
};

export default function LocationMap({
  locations,
  points,
  fitBounds,
  resetVersion,
  activeLocation,
  origin,
  directionsOrigin,
  originLabel,
  onLocationSelect,
}: LocationMapProps) {
  return (
    <div
      id="location-results-map"
      className="h-[55vh] min-h-80 scroll-mt-4 overflow-hidden rounded border border-slate-300"
    >
      <MapContainer center={MAP_CENTER} zoom={9} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds points={points} enabled={fitBounds} resetVersion={resetVersion} />
        <MapFocus location={activeLocation} resetVersion={resetVersion} />
        {locations.map((location) => (
          <LocationMarker
            key={location.key}
            location={location}
            active={location.key === activeLocation?.key}
            onLocationSelect={onLocationSelect}
            directionsOrigin={directionsOrigin}
          />
        ))}
        {origin && (
          <Marker
            position={origin}
            icon={MARKER_ICONS.Search}
            alt="Search location"
            title="Search location"
          >
            <Popup>{originLabel || "Search location"}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
