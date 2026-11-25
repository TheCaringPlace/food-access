import { readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import { kmlLocationSchema } from "../src/location-schema.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
export const kmlPath = path.join(root, "..", "source.kml");
export const kmlUrl =
  "https://www.google.com/maps/d/kml?mid=14JPRi0SFtdGN_pOP6c7w4vJpvXlvl0I&forcekml=1";
const layerTypes = {
  "Pantry.xlsx": "Pantry",
  "PopUps.xlsx": "Pop-up",
  "Shelter.xlsx": "Shelter",
  "Soup Kitchen.xlsx": "Soup kitchen",
};
const recognizedLayers = new Set(Object.keys(layerTypes));
const ignoredLayers = new Set(["Untitled layer"]);
const parser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: false,
  textNodeName: "#text",
  isArray: (name) => ["Folder", "Placemark", "Data"].includes(name),
});

function parseKmlDocument(source) {
  const document = parser.parse(source)?.kml?.Document;
  const folders = Array.isArray(document?.Folder)
    ? document.Folder
    : document?.Folder
      ? [document.Folder]
      : [];
  const unknownFolders = folders
    .map((folder) => text(folder.name))
    .filter((name) => !recognizedLayers.has(name) && !ignoredLayers.has(name));
  if (unknownFolders.length) {
    throw new Error(`KML contains unrecognized layer(s): ${unknownFolders.join(", ")}.`);
  }
  const validFolders = folders.filter((folder) => recognizedLayers.has(text(folder.name)));
  const placemarkCount = validFolders.reduce((count, folder) => {
    const placemarks = Array.isArray(folder.Placemark)
      ? folder.Placemark
      : folder.Placemark
        ? [folder.Placemark]
        : [];
    return count + placemarks.length;
  }, 0);

  if (!validFolders.length || !placemarkCount) {
    throw new Error("KML is not a valid Food Access Points map export.");
  }

  return { document, placemarkCount };
}

export async function refreshKml() {
  const response = await fetch(kmlUrl, {
    headers: { "User-Agent": "FoodAccessPointsCommunityFinder/1.0" },
  });
  if (!response.ok)
    throw new Error(`Could not download KML (${response.status} ${response.statusText}).`);

  const source = await response.text();
  const { placemarkCount } = parseKmlDocument(source);
  const temporaryPath = `${kmlPath}.tmp`;
  await writeFile(temporaryPath, source, "utf8");
  await rename(temporaryPath, kmlPath);

  return placemarkCount;
}

function text(value) {
  if (value == null) return "";
  if (typeof value !== "object") return String(value).trim();
  return String(value["#text"] ?? "").trim();
}

export function normalize(value) {
  return value.toLocaleLowerCase("en-US").trim().replace(/\s+/g, " ");
}

export function locationKey(place) {
  const address = [place.address, place.city, place.state, place.zip].filter(Boolean);
  return normalize(
    [...(address.length ? address : [place.name]), "USA"].filter(Boolean).join(", "),
  );
}

export async function readLocations() {
  let source;
  try {
    source = await readFile(kmlPath, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await refreshKml();
    source = await readFile(kmlPath, "utf8");
  }

  const { document } = parseKmlDocument(source);
  return (document?.Folder ?? []).flatMap((folder) => {
    const folderName = text(folder.name);
    if (folderName.toLocaleLowerCase("en-US") === "untitled layer") return [];

    const type = layerTypes[folderName] ?? "Other";

    return (folder.Placemark ?? []).flatMap((place) => {
      const extendedData = Object.fromEntries(
        (place.ExtendedData?.Data ?? []).map((item) => [item["@_name"], text(item.value)]),
      );
      const address = extendedData.Address1 || text(place.address);
      const city = extendedData.City ?? "";
      const state = extendedData.State ?? "";
      const zip = extendedData["Zip Code"] ?? "";
      const name = text(place.name);
      const query = [address, city, state, zip].filter(Boolean).join(", ");
      const rawPoint = text(place.Point?.coordinates);
      const [longitude, latitude] = rawPoint ? rawPoint.split(",").map(Number) : [];

      // The export contains one entirely empty placeholder placemark, not a location.
      if (!name && !query && !rawPoint) return [];

      const location = kmlLocationSchema.safeParse({
        name,
        type,
        address,
        city,
        state,
        zip,
        weeks_open: extendedData["Weeks Open"] ?? "",
        days_open: extendedData["Days Open"] ?? "",
        times_open: extendedData["Times Open"] ?? "",
        query,
        point: rawPoint ? [latitude, longitude] : null,
      });
      if (!location.success) {
        const issues = location.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ");
        throw new Error(`Invalid KML location "${name || query || "unnamed"}": ${issues}`);
      }

      return [location.data];
    });
  });
}
