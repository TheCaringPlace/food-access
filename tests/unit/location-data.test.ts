import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readLocations } from "../../scripts/data-utils.mjs";
import { publishedLocationsSchema } from "../../src/location-schema.mjs";

describe("published location data", () => {
  it("contains non-empty locations matching the published data schema", async () => {
    const source = await readFile(path.resolve("public/locations.json"), "utf8");
    const locations = publishedLocationsSchema.parse(JSON.parse(source));
    expect(locations).not.toHaveLength(0);
  });

  it("parses non-empty, schema-validated locations from the source KML", async () => {
    const locations = await readLocations();
    expect(locations).not.toHaveLength(0);
  });
});
