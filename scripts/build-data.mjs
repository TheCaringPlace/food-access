#!/usr/bin/env node
/** Convert the Food Access Points KML into CSV using the saved geocode cache. */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readLocations, locationKey } from "./data-utils.mjs";
import { publishedLocationsSchema } from "../src/location-schema.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(root, "..", "data", "food-access-points.csv");
const publicJsonPath = path.join(root, "..", "public", "locations.json");
const cachePath = path.join(root, "..", "data", "census-geocode-cache.json");
const fields = [
  "name",
  "type",
  "address",
  "city",
  "state",
  "zip",
  "weeks_open",
  "days_open",
  "times_open",
  "latitude",
  "longitude",
  "coordinate_source",
  "coordinate_precision",
  "census",
];

function csvCell(value) {
  const content =
    value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(content) ? `"${content.replaceAll('"', '""')}"` : content;
}

async function main() {
  const sourceRows = await readLocations();
  let cache;
  try {
    cache = JSON.parse(await readFile(cachePath, "utf8"));
  } catch {
    throw new Error("No Census geocode cache found. Run npm run data:geocode first.");
  }
  const missing = [];
  const rows = sourceRows.map((place) => {
    const point = place.point;
    const cached = cache[locationKey(place)];
    let coordinates;
    let coordinateSource;
    let coordinatePrecision;
    if (point) {
      coordinates = point;
      coordinateSource = "map point";
      coordinatePrecision = "point";
    } else if (cached?.latitude != null && cached?.longitude != null) {
      coordinates = [cached.latitude, cached.longitude];
      coordinateSource = cached.provider ?? "geocoded";
      coordinatePrecision = cached.precision ?? "unknown";
    } else {
      missing.push(place);
      coordinates = ["", ""];
      coordinateSource = "unavailable";
      coordinatePrecision = "unavailable";
    }
    return {
      name: place.name,
      type: place.type,
      address: place.address,
      city: place.city,
      state: place.state,
      zip: place.zip,
      weeks_open: place.weeks_open,
      days_open: place.days_open,
      times_open: place.times_open,
      latitude: coordinates[0],
      longitude: coordinates[1],
      coordinate_source: coordinateSource,
      coordinate_precision: coordinatePrecision,
      census: cached?.census ?? null,
    };
  });

  if (missing.length) {
    const addresses = missing
      .map((row) => `${row.name}: ${row.address}, ${row.city}, ${row.state} ${row.zip}`)
      .join("\n");
    throw new Error(
      `${missing.length} locations have no cached geocode. Run npm run data:geocode first.\n${addresses}`,
    );
  }

  const validatedRows = publishedLocationsSchema.parse(rows);

  const csv =
    [
      fields.join(","),
      ...validatedRows.map((row) => fields.map((field) => csvCell(row[field])).join(",")),
    ].join("\n") + "\n";
  await mkdir(path.dirname(csvPath), { recursive: true });
  await mkdir(path.dirname(publicJsonPath), { recursive: true });
  await writeFile(csvPath, csv, "utf8");
  await writeFile(publicJsonPath, `${JSON.stringify(validatedRows, null, 2)}\n`, "utf8");
  console.log(`Wrote ${validatedRows.length} geolocated locations to ${csvPath}.`);
  console.log(`Wrote static JSON to ${publicJsonPath}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
