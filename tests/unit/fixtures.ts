import type { Location, SourceLocation } from "../../src/types";

export const locations: SourceLocation[] = [
  {
    name: "Community Pantry",
    type: "Pantry",
    address: "100 Main Street",
    city: "Cincinnati",
    state: "OH",
    zip: "45202",
    days_open: "Mon-Fri",
    times_open: "9:00 AM - 5:00 PM",
    latitude: 39.1,
    longitude: -84.5,
  },
  {
    name: "Hope Shelter",
    type: "Shelter",
    address: "200 Oak Avenue",
    city: "Covington",
    state: "KY",
    zip: "41011",
    days_open: "Saturday",
    times_open: "12:00 PM",
    latitude: 39.08,
    longitude: -84.51,
  },
  {
    name: "Daily Soup Kitchen",
    type: "Soup kitchen",
    address: "",
    city: "Newport",
    state: "KY",
    zip: "41071",
    days_open: "M, W, F",
    times_open: "0",
    latitude: 39.09,
    longitude: -84.49,
  },
];

export const results: Location[] = locations.map((location) => ({
  ...location,
  key: `${location.name}|${location.type}`.toLowerCase(),
}));
