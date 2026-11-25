import { formatLocationHours, TYPE_COLORS } from "../location-utils";
import { Location } from "../types";
import { formatLocationAddress, LocationActions } from "./LocationActions";

export const LocationResult = ({
  location,
  selectLocation,
  search,
}: {
  location: Location;
  selectLocation: (key: string) => void;
  search: any;
}) => {
  const hours = formatLocationHours(location);
  return (
    <li key={location.key}>
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
          onClick={() => {
            selectLocation(location.key);
            document
              .getElementById("location-results-map")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          type="button"
        >
          <span className="min-w-0 flex-1">
            <span className="mb-1 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-700">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: TYPE_COLORS[location.type] ?? TYPE_COLORS.Other,
                  }}
                />
                {location.type}
              </span>
              {location.distance !== undefined && (
                <span className="shrink-0 text-sm tabular-nums text-slate-600">
                  {location.distance.toFixed(1)} mi
                </span>
              )}
            </span>
            <span className="block truncate text-base font-semibold">{location.name}</span>
            <span className="block truncate text-sm text-slate-600">
              {formatLocationAddress(location)}
            </span>
            {hours && <span className="block text-sm text-slate-500">{hours}</span>}
          </span>
        </button>
        <div className="flex flex-col items-end gap-3 sm:shrink-0">
          <LocationActions
            location={location}
            origin={search.mode === "address" ? search.origin : null}
          />
        </div>
      </div>
    </li>
  );
};
