import { useEffect, useMemo, useRef, useState } from "react";
import { DAYS, censusLookup } from "../location-utils";
import type { Day, LocationCriteria, LocationType, SearchMode, SourceLocation } from "../types";

const INITIAL_CRITERIA: LocationCriteria = {
  search: { mode: "address", query: "", origin: null },
  filters: { types: null, day: "" },
};

function readCriteriaFromUrl(types: LocationType[], syncUrl: boolean): LocationCriteria {
  if (!syncUrl || typeof window === "undefined") return INITIAL_CRITERIA;

  const params = new URLSearchParams(window.location.search);
  const mode: SearchMode = params.get("mode") === "name" ? "name" : "address";
  const query = params.get("q")?.trim() ?? "";
  const selectedDay = params.get("day");
  const day = DAYS.find((candidate) => candidate === selectedDay) ?? "";
  const encodedTypes = params.getAll("type");
  let selectedTypes: LocationType[] | null = null;

  if (encodedTypes.includes("none")) {
    selectedTypes = [];
  } else if (encodedTypes.length > 0) {
    const validTypes = types.filter((type) => encodedTypes.includes(type));
    if (validTypes.length > 0) selectedTypes = validTypes;
  }

  return {
    search: { mode, query, origin: null },
    filters: { types: selectedTypes, day },
  };
}

export function useLocationCriteria(locations: SourceLocation[], syncUrl = true) {
  const types = useMemo(
    () => [...new Set(locations.map((location) => location.type))].toSorted(),
    [locations],
  );
  const [criteria, setCriteria] = useState(() => readCriteriaFromUrl(types, syncUrl));
  const [searchText, setSearchText] = useState(criteria.search.query);
  const [searching, setSearching] = useState(
    criteria.search.mode === "address" && Boolean(criteria.search.query),
  );
  const [error, setError] = useState("");
  const [lookupVersion, setLookupVersion] = useState(0);
  const [mapResetVersion, setMapResetVersion] = useState(0);
  const lookupVersionRef = useRef(0);
  const searchMode = criteria.search.mode;
  const searchQuery = criteria.search.query;

  useEffect(() => {
    if (!syncUrl || typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const { search, filters } = criteria;
    for (const key of ["q", "mode", "type", "day"]) url.searchParams.delete(key);
    if (search.query) url.searchParams.set("q", search.query);
    if (search.mode !== "address") url.searchParams.set("mode", search.mode);
    if (filters.types !== null) {
      if (filters.types.length === 0) {
        url.searchParams.append("type", "none");
      } else {
        for (const type of filters.types) url.searchParams.append("type", type);
      }
    }
    if (filters.day) url.searchParams.set("day", filters.day);

    window.history.replaceState(window.history.state, "", url);
  }, [criteria, syncUrl]);

  useEffect(() => {
    if (searchMode !== "address" || !searchQuery) return;

    let cancelled = false;
    void censusLookup(searchQuery)
      .then((origin) => {
        if (!cancelled && lookupVersion === lookupVersionRef.current) {
          setCriteria((current) => ({
            ...current,
            search: { ...current.search, origin },
          }));
        }
        return origin;
      })
      .catch((cause: unknown) => {
        if (cancelled || lookupVersion !== lookupVersionRef.current) return;
        setError(cause instanceof Error ? cause.message : "Address lookup failed.");
      })
      .finally(() => {
        if (!cancelled && lookupVersion === lookupVersionRef.current) setSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchMode, searchQuery, lookupVersion]);

  function changeSearchMode(mode: SearchMode) {
    setCriteria((current) => ({
      ...current,
      search: { mode, query: "", origin: null },
    }));
    setSearching(false);
    setError("");
  }

  function submitSearch(input: string) {
    const query = input.trim();
    if (!query) return;

    setSearching(searchMode === "address");
    setError("");
    const nextVersion = lookupVersionRef.current + 1;
    lookupVersionRef.current = nextVersion;
    setLookupVersion(nextVersion);
    setCriteria((current) => ({
      ...current,
      search: {
        ...current.search,
        query,
        origin: null,
      },
    }));
  }

  function toggleType(type: LocationType) {
    setCriteria((current) => {
      const selected = current.filters.types;
      const next =
        selected === null
          ? types.filter((value) => value !== type)
          : selected.includes(type)
            ? selected.filter((value) => value !== type)
            : [...selected, type];
      return { ...current, filters: { ...current.filters, types: next } };
    });
  }

  function setSelectedDay(day: Day | "") {
    setCriteria((current) => ({ ...current, filters: { ...current.filters, day } }));
  }

  function clearCriteria() {
    setCriteria(INITIAL_CRITERIA);
    setSearchText("");
    setSearching(false);
    setError("");
    setMapResetVersion((version) => version + 1);
  }

  return {
    criteria,
    searchText,
    setSearchText,
    searching,
    error,
    types,
    changeSearchMode,
    submitSearch,
    toggleType,
    setSelectedDay,
    clearCriteria,
    mapResetVersion,
  };
}
