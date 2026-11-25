import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const EXPECTED_FIELDS = [
  "address",
  "census",
  "city",
  "coordinate_precision",
  "coordinate_source",
  "days_open",
  "latitude",
  "longitude",
  "name",
  "state",
  "times_open",
  "type",
  "weeks_open",
  "zip",
];
const ALLOWED_TYPES = new Set(["Pantry", "Pop-up", "Shelter", "Soup kitchen", "Other"]);
const STRING_FIELDS = [
  "name",
  "type",
  "address",
  "city",
  "state",
  "zip",
  "weeks_open",
  "days_open",
  "times_open",
  "coordinate_source",
  "coordinate_precision",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

describe("published location data", () => {
  it("contains non-empty locations with the expected fields, known types, and valid coordinates", async () => {
    const source = await readFile(path.resolve("public/locations.json"), "utf8");
    const data: unknown = JSON.parse(source);

    expect(Array.isArray(data)).toBe(true);
    if (!Array.isArray(data)) return;

    const locations = data.map((location) => {
      expect(isRecord(location)).toBe(true);
      return isRecord(location) ? location : {};
    });
    expect(locations).not.toHaveLength(0);

    for (const location of locations) {
      expect(Object.keys(location).sort()).toEqual(EXPECTED_FIELDS);

      for (const field of STRING_FIELDS) {
        expect(typeof location[field]).toBe("string");
      }
      if (typeof location.name === "string") expect(location.name.trim()).not.toBe("");
      if (typeof location.type === "string") expect(ALLOWED_TYPES.has(location.type)).toBe(true);

      expect(Number.isFinite(location.latitude)).toBe(true);
      expect(Number.isFinite(location.longitude)).toBe(true);
      if (typeof location.latitude === "number") {
        expect(location.latitude).toBeGreaterThanOrEqual(-90);
        expect(location.latitude).toBeLessThanOrEqual(90);
      }
      if (typeof location.longitude === "number") {
        expect(location.longitude).toBeGreaterThanOrEqual(-180);
        expect(location.longitude).toBeLessThanOrEqual(180);
      }

      if (location.census !== null) {
        expect(isRecord(location.census)).toBe(true);
        if (isRecord(location.census)) {
          expect(typeof location.census.matched_address).toBe("string");
          expect(isRecord(location.census.tiger_line)).toBe(true);
          expect(isRecord(location.census.address_components)).toBe(true);
        }
      }
    }
  });
});
