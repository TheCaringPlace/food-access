#!/usr/bin/env node

import { refreshKml } from "./data-utils.mjs";

try {
  const count = await refreshKml();
  console.log(`Downloaded and validated ${count} placemarks into source.kml.`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
