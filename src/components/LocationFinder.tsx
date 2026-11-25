import { FilterSidebar } from "./FilterSidebar";
import { LocationResults } from "./LocationResults";
import { SearchForm } from "./SearchForm";
import { useLocationCriteria } from "../hooks/useLocationCriteria";
import type { SourceLocation } from "../types";

export function LocationFinder({
  locations,
  syncUrl = true,
}: {
  locations: SourceLocation[];
  syncUrl?: boolean;
}) {
  const finder = useLocationCriteria(locations, syncUrl);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 p-4 text-slate-900 md:gap-6 md:p-6">
      <h1 className="text-2xl font-bold tracking-tight">Food Access Points</h1>
      <SearchForm
        search={{
          text: finder.searchText,
          mode: finder.criteria.search.mode,
          searching: finder.searching,
          setText: finder.setSearchText,
          changeMode: finder.changeSearchMode,
          submit: finder.submitSearch,
          clear: finder.clearCriteria,
        }}
      />
      {finder.error && (
        <p className="text-sm text-red-700" role="alert">
          {finder.error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-6">
        <FilterSidebar
          filters={{
            types: finder.types,
            selectedTypes: finder.criteria.filters.types,
            selectedDay: finder.criteria.filters.day,
            toggleType: finder.toggleType,
            setSelectedDay: finder.setSelectedDay,
          }}
        />
        <LocationResults
          locations={locations}
          criteria={finder.criteria}
          mapResetVersion={finder.mapResetVersion}
        />
      </div>
    </main>
  );
}

export default LocationFinder;
