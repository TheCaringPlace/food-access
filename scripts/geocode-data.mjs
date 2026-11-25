#!/usr/bin/env node
/** Geocode source addresses with the US Census Geocoder, then ZIP centroids. */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import zipcodes from "zipcodes";
import { locationKey, readLocations } from "./data-utils.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const cachePath = path.join(root, "..", "data", "census-geocode-cache.json");
const censusUrl = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";

async function readCache() {
  try {
    return JSON.parse(await readFile(cachePath, "utf8"));
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

async function censusGeocode(address) {
  if (!address) return null;

  const params = new URLSearchParams({
    address,
    benchmark: "Public_AR_Current",
    format: "json",
  });
  const response = await fetch(`${censusUrl}?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`US Census Geocoder returned ${response.status}`);

  const result = await response.json();
  const match = result.result?.addressMatches?.[0];
  const longitude = Number(match?.coordinates?.x);
  const latitude = Number(match?.coordinates?.y);
  if (!match || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    latitude,
    longitude,
    provider: "US Census Geocoder",
    precision: "address-range",
    census: {
      matched_address: match.matchedAddress ?? "",
      tiger_line: match.tigerLine ?? {},
      address_components: match.addressComponents ?? {},
    },
  };
}

function zipCentroid(place) {
  const zip = place.zip.match(/\b\d{5}\b/)?.[0];
  if (!zip) return null;

  const match = zipcodes.lookup(zip);
  if (!match || (place.state && match.state !== place.state.toUpperCase())) return null;

  return {
    latitude: match.latitude,
    longitude: match.longitude,
    provider: "ZIP code centroid",
    precision: "zip-centroid",
  };
}

async function geocode(place) {
  try {
    const result = await censusGeocode(place.query);
    if (result) return result;
  } catch (error) {
    console.warn(
      `Census lookup failed for ${place.query}: ${error instanceof Error ? error.message : error}`,
    );
  }
  return zipCentroid(place);
}

async function main() {
  const locations = await readLocations();
  const cache = await readCache();
  const unresolved = [];

  for (let index = 0; index < locations.length; index += 1) {
    const place = locations[index];
    const key = locationKey(place);
    const saved = cache[key];
    if (saved?.latitude != null && saved?.longitude != null) {
      console.log(`Cached: ${place.query || place.zip}`);
      continue;
    }

    const result = await geocode(place);
    if (result) {
      cache[key] = result;
      console.log(
        `Geocoded ${index + 1}/${locations.length} with ${result.provider}: ${place.query || place.zip}`,
      );
    } else {
      cache[key] = { status: "not-found", provider: "US Census Geocoder and ZIP lookup" };
      unresolved.push(place);
      console.warn(`No full-address or ZIP match: ${place.query || place.zip || place.name}`);
    }
    await saveCache(cache);

    // Keep requests sequential and gentle on the public Census service.
    if (index < locations.length - 1) await new Promise((resolve) => setTimeout(resolve, 250));
  }

  console.log(`Checked ${locations.length} source locations; unresolved: ${unresolved.length}.`);
  if (unresolved.length) {
    console.log("Unresolved source rows:");
    for (const place of unresolved)
      console.log(`- ${place.query || place.name}: no matching ZIP code`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
