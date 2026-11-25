import { lazy, Suspense, useMemo, useState } from "react";
import uFuzzy from "@leeoniya/ufuzzy";
import { isOpenDay, milesBetween } from "../location-utils";
import type { Location, LocationCriteria, SourceLocation } from "../types";
import { LoadingState } from "./LoadingState";
import { LocationResult } from "./LocationResult";

const LocationMap = lazy(() => import("./LocationMap"));

type LocationResultsProps = {
  locations: SourceLocation[];
  criteria: LocationCriteria;
  mapResetVersion: number;
};

export function LocationResults({
  locations: sourceLocations,
  criteria,
  mapResetVersion,
}: LocationResultsProps) {
  const { search, filters } = criteria;
  const [matchesPerPage, setMatchesPerPage] = useState<number | "all">(() =>
    search.mode === "address" && search.query ? 20 : "all",
  );
  const [page, setPage] = useState(1);
  const [activeKey, setActiveKey] = useState("");
  const [previousSearch, setPreviousSearch] = useState(search);
  const [previousFilters, setPreviousFilters] = useState(filters);

  if (search !== previousSearch) {
    setPreviousSearch(search);
    setPage(1);
    setActiveKey("");
    if (search.mode === "address" && search.query) setMatchesPerPage(20);
    if (!search.query) setMatchesPerPage("all");
  }

  if (filters !== previousFilters) {
    setPreviousFilters(filters);
    setPage(1);
  }

  const nameQuery = search.mode === "name" ? search.query : "";
  const selectedTypes = filters.types;
  const selectedDay = filters.day;
  const origin = useMemo(
    () =>
      search.origin
        ? ([search.origin.latitude, search.origin.longitude] as [number, number])
        : null,
    [search.origin],
  );
  const originLabel = search.origin?.label ?? "";

  const nameSearch = useMemo(
    () => ({
      haystack: sourceLocations.map(({ name }) => name),
      searcher: new uFuzzy({ intraMode: 1 }),
    }),
    [sourceLocations],
  );
  const nameMatches = useMemo(() => {
    if (!nameQuery) return sourceLocations.map((location) => ({ location, score: undefined }));

    const [indices, info, order] = nameSearch.searcher.search(nameSearch.haystack, nameQuery);
    const orderedIndices =
      info && order ? order.map((infoIndex) => info.idx[infoIndex]) : (indices ?? []);

    return orderedIndices.map((locationIndex, score) => ({
      location: sourceLocations[locationIndex],
      score,
    }));
  }, [nameQuery, nameSearch, sourceLocations]);
  const matches = useMemo(
    () =>
      nameMatches
        .filter(({ location }) => selectedTypes === null || selectedTypes.includes(location.type))
        .filter(({ location }) => !selectedDay || isOpenDay(location.days_open, selectedDay))
        .map(({ location, score }) => ({
          ...location,
          key: [location.name, location.type, location.address, location.city, location.zip]
            .join("|")
            .toLocaleLowerCase("en-US"),
          distance: origin ? milesBetween(origin, location) : undefined,
          fuzzyScore: score,
        }))
        .toSorted((a, b) =>
          origin
            ? (a.distance ?? Infinity) - (b.distance ?? Infinity)
            : nameQuery
              ? (a.fuzzyScore ?? 1) - (b.fuzzyScore ?? 1)
              : a.name.localeCompare(b.name),
        ),
    [nameMatches, nameQuery, origin, selectedDay, selectedTypes],
  );

  const totalPages =
    matchesPerPage === "all" ? 1 : Math.max(1, Math.ceil(matches.length / matchesPerPage));
  const pageLocations: Location[] =
    matchesPerPage === "all"
      ? matches
      : matches.slice((page - 1) * matchesPerPage, page * matchesPerPage);
  const points = useMemo(
    () =>
      pageLocations
        .map((location) => [location.latitude, location.longitude] as [number, number])
        .concat(origin ? [origin] : []),
    [pageLocations, origin],
  );
  const activeLocation = pageLocations.find((location) => location.key === activeKey) ?? null;

  function selectLocation(key: string) {
    setActiveKey(key);
  }

  function changePageSize(value: number | "all") {
    setMatchesPerPage(value);
    setPage(1);
  }

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="Locations">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600" aria-live="polite">
          {matches.length} matches
          {nameQuery && ` for “${nameQuery}”`}
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span>Matches per page</span>
          <select
            className="rounded border border-slate-300 bg-white px-2 py-1"
            value={matchesPerPage}
            onChange={(event) =>
              changePageSize(event.target.value === "all" ? "all" : Number(event.target.value))
            }
          >
            {[10, 20, 50, 100].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
            <option value="all">All</option>
          </select>
        </label>
      </div>

      <Suspense
        fallback={<LoadingState className="h-[55vh] min-h-80 rounded border border-slate-300" />}
      >
        <LocationMap
          locations={pageLocations}
          points={points}
          fitBounds={search.mode !== "address" || !search.query || search.origin !== null}
          resetVersion={mapResetVersion}
          activeLocation={activeLocation}
          origin={origin}
          directionsOrigin={search.mode === "address" ? search.origin : null}
          originLabel={originLabel}
          onLocationSelect={selectLocation}
        />
      </Suspense>

      {matches.length > 0 && (
        <ol className="divide-y divide-slate-200 rounded border border-slate-200">
          {pageLocations.map((location) => (
            <LocationResult
              key={location.key}
              location={location}
              selectLocation={selectLocation}
              search={search}
            />
          ))}
        </ol>
      )}
      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-4" aria-label="Result pages">
          <button
            className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="text-sm text-slate-600" aria-live="polite">
            Page {page} of {totalPages}
          </span>
          <button
            className="rounded border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40"
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </nav>
      )}
      {matches.length === 0 && <p className="text-sm text-slate-600">No matching locations.</p>}
    </section>
  );
}
