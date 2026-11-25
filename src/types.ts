import type { z } from "zod";
import type { locationTypeSchema, sourceLocationSchema } from "./location-schema.mjs";

export type LocationType = z.infer<typeof locationTypeSchema>;
export type SearchMode = "address" | "name";
export type Day =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type LocationCriteria = {
  search: {
    mode: SearchMode;
    query: string;
    origin: CensusLocation | null;
  };
  filters: {
    types: LocationType[] | null;
    day: Day | "";
  };
};

export type SourceLocation = z.infer<typeof sourceLocationSchema>;

export type Location = SourceLocation & { distance?: number; key: string };

export type CensusResponse = {
  result?: {
    addressMatches?: Array<{
      matchedAddress?: string;
      coordinates?: { x?: number; y?: number };
    }>;
  };
};

export type CensusLocation = { latitude: number; longitude: number; label: string };
