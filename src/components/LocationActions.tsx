import { Navigation, Search } from "lucide-react";
import type { CensusLocation, SourceLocation } from "../types";

type LocationActionsProps = {
  location: SourceLocation;
  origin: CensusLocation | null;
};

export function formatLocationAddress(location: SourceLocation) {
  return [location.address, location.city, location.state, location.zip].filter(Boolean).join(", ");
}

export function LocationActions({ location, origin }: LocationActionsProps) {
  const address = formatLocationAddress(location);

  const directionsParams = new URLSearchParams({
    api: "1",
    destination: address || `${location.latitude},${location.longitude}`,
  });
  if (origin) {
    directionsParams.set("origin", origin.label || `${origin.latitude},${origin.longitude}`);
  }

  const linkClassName =
    "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50";

  return (
    <div className="flex flex-nowrap gap-2">
      <a
        aria-label={`Get directions to ${location.name}`}
        className={linkClassName}
        href={`https://www.google.com/maps/dir/?${directionsParams.toString()}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        <Navigation aria-hidden="true" size={16} />
        Get directions
      </a>
      <a
        aria-label={`Search the web for ${location.name}`}
        className={linkClassName}
        href={`https://www.google.com/search?${new URLSearchParams({ q: `${location.name} ${address}` })}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        <Search aria-hidden="true" size={16} />
        Search the web
      </a>
    </div>
  );
}
