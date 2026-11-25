export type LocationType = "Pantry" | "Pop-up" | "Shelter" | "Soup kitchen" | "Other";
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

export type SourceLocation = {
  name: string;
  type: LocationType;
  address: string;
  city: string;
  state: string;
  zip: string;
  days_open: string;
  times_open: string;
  latitude: number;
  longitude: number;
};

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
