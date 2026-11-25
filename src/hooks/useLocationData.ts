import { useEffect, useState } from "react";
import { publishedLocationsSchema } from "../location-schema.mjs";
import type { SourceLocation } from "../types";

export function useLocationData(locationsUrl = "/locations.json") {
  const [locations, setLocations] = useState<SourceLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(locationsUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load the location data.");
        return publishedLocationsSchema.parse(await response.json());
      })
      .then((data) => setLocations(data))
      .catch((cause: unknown) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) {
          setError(cause instanceof Error ? cause.message : "Could not load locations.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [locationsUrl]);

  return { locations, loading, error };
}
