import type { CensusLocation, CensusResponse, Day, SourceLocation } from "./types";

export const DAYS: readonly Day[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const TYPE_COLORS: Record<string, string> = {
  Pantry: "#C2185B",
  "Pop-up": "#9C27B0",
  Shelter: "#FFEA00",
  "Soup kitchen": "#0F9D58",
  Other: "#9C27B0",
};

const DAY_ALIASES = [
  ["mon", "monday"],
  ["tue", "tues", "tuesday"],
  ["wed", "wednesday"],
  ["thu", "thur", "thurs", "thursday"],
  ["fri", "friday"],
  ["sat", "saturday"],
  ["sun", "sunday"],
];

const SHORT_DAY_PATTERNS = [
  /\bm(?=$|[\s,/])/i,
  /\bt(?=$|[\s,/])/i,
  /\bw(?=$|[\s,/])/i,
  /\bth(?=$|[\s,/])/i,
  /\bf(?=$|[\s,/])/i,
  /\bsa?(?=$|[\s,/])/i,
  /\bsu(?=$|[\s,/])/i,
];

const DAY_ABBREVIATIONS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_RANGE_PATTERN =
  /\b(mon|tue|wed|thu|fri|sat|sun)(?:day|sday|rsday|urday)?\s*[-–—]\s*(mon|tue|wed|thu|fri|sat|sun)(?:day|sday|rsday|urday)?\b/gi;
const WEEKDAY_RANGE_PATTERN = /\bm\s*[-–—]\s*f\b/i;

function includesDayAlias(value: string, dayIndex: number) {
  return DAY_ALIASES[dayIndex].some((alias) =>
    new RegExp(`(^|[^a-z])${alias}(?=$|[^a-z])`, "i").test(value),
  );
}

function includesShortDayToken(value: string, dayIndex: number) {
  return SHORT_DAY_PATTERNS[dayIndex].test(value);
}

function includesDayRange(value: string, dayIndex: number) {
  for (const match of value.matchAll(DAY_RANGE_PATTERN)) {
    const start = DAY_ABBREVIATIONS.indexOf(match[1].slice(0, 3));
    const end = DAY_ABBREVIATIONS.indexOf(match[2].slice(0, 3));
    if (start >= 0 && end >= start && dayIndex >= start && dayIndex <= end) return true;
  }
  return false;
}

function includesWeekdayRange(value: string, dayIndex: number) {
  return WEEKDAY_RANGE_PATTERN.test(value) && dayIndex < 5;
}

export function censusLookup(address: string): Promise<CensusLocation> {
  const callbackName = `census_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const callbackWindow = window as unknown as Record<
    string,
    ((result: CensusResponse) => void) | undefined
  >;
  const script = document.createElement("script");
  const params = new URLSearchParams({
    address,
    benchmark: "Public_AR_Current",
    format: "jsonp",
    callback: callbackName,
  });

  return new Promise((resolve, reject) => {
    let timeout: number;
    const cleanup = () => {
      window.clearTimeout(timeout);
      delete callbackWindow[callbackName];
      script.remove();
    };

    callbackWindow[callbackName] = (result) => {
      cleanup();
      const match = result.result?.addressMatches?.[0];
      const longitude = Number(match?.coordinates?.x);
      const latitude = Number(match?.coordinates?.y);
      if (!match || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        reject(
          new Error(
            "We could not find that address. Include a street address, city, and state or ZIP.",
          ),
        );
        return;
      }
      resolve({ latitude, longitude, label: match.matchedAddress ?? address });
    };
    script.addEventListener(
      "error",
      () => {
        cleanup();
        reject(new Error("We could not reach the Census Geocoder. Please try again."));
      },
      { once: true },
    );
    timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Request timed out. Please try again."));
    }, 12000);
    script.src = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?${params}`;
    document.head.appendChild(script);
  });
}

export function isOpenDay(daysOpen: string, selectedDay: string) {
  const dayIndex = DAYS.findIndex((day) => day === selectedDay);
  if (dayIndex < 0) return true;

  const value = daysOpen.toLowerCase();

  return (
    includesDayAlias(value, dayIndex) ||
    includesShortDayToken(value, dayIndex) ||
    includesDayRange(value, dayIndex) ||
    includesWeekdayRange(value, dayIndex)
  );
}

export function milesBetween(origin: [number, number], location: SourceLocation) {
  const deltaLat = toRadians(location.latitude - origin[0]);
  const deltaLon = toRadians(location.longitude - origin[1]);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(origin[0])) *
      Math.cos(toRadians(location.latitude)) *
      Math.sin(deltaLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatLocationHours(location: Pick<SourceLocation, "days_open" | "times_open">) {
  return [location.days_open, location.times_open]
    .map((value) => value?.trim() ?? "")
    .filter((value) => value && !(Number.isFinite(Number(value)) && Number(value) === 0))
    .join(" · ");
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
