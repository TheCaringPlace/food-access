import { afterEach, describe, expect, it, vi } from "vitest";
import {
  censusLookup,
  formatLocationHours,
  isOpenDay,
  milesBetween,
} from "../../src/location-utils";
import { locations } from "./fixtures";

describe("isOpenDay", () => {
  it.each([
    ["Monday", "Monday", true],
    ["Tues", "Tuesday", true],
    ["Thursday", "Thursday", true],
    ["Sat", "Saturday", true],
    ["M, W, F", "Wednesday", true],
    ["M-F", "Friday", true],
    ["Tue–Thu", "Wednesday", true],
    ["Tue-Thu", "Monday", false],
    ["Tuesday", "Saturday", false],
    ["Closed", "Sunday", false],
    ["Closed", "Not a day", true],
  ])("matches %s on %s", (hours, day, expected) => {
    expect(isOpenDay(hours, day)).toBe(expected);
  });
});

describe("location formatting and distance", () => {
  it("calculates zero and real-world great-circle distances", () => {
    expect(milesBetween([39.1, -84.5], locations[0])).toBe(0);
    expect(milesBetween([0, 0], { ...locations[0], latitude: 1, longitude: 0 })).toBeCloseTo(
      69.09,
      1,
    );
  });

  it("joins non-empty hours and suppresses blank and zero values", () => {
    expect(formatLocationHours({ days_open: " Mon ", times_open: " 9-5 " })).toBe("Mon · 9-5");
    expect(formatLocationHours({ days_open: "0", times_open: "" })).toBe("");
  });
});

describe("censusLookup JSONP", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.head.querySelectorAll("script").forEach((script) => script.remove());
    for (const key of Object.keys(window)) {
      if (key.startsWith("census_")) delete (window as unknown as Record<string, unknown>)[key];
    }
  });

  function getCallbackName() {
    const script = document.head.querySelector("script[src*='geocoding.geo.census.gov']");
    expect(script).not.toBeNull();
    return new URL(script!.src).searchParams.get("callback")!;
  }

  it("requests an address and resolves a matched coordinate", async () => {
    const promise = censusLookup("1 Main St, Cincinnati, OH");
    const name = getCallbackName();
    const callback = (window as unknown as Record<string, (response: unknown) => void>)[name];
    callback({
      result: {
        addressMatches: [{ matchedAddress: "1 MAIN ST", coordinates: { x: -84.5, y: 39.1 } }],
      },
    });

    await expect(promise).resolves.toEqual({
      latitude: 39.1,
      longitude: -84.5,
      label: "1 MAIN ST",
    });
    expect(document.head.querySelector("script[src*='geocoding.geo.census.gov']")).toBeNull();
    expect((window as unknown as Record<string, unknown>)[name]).toBeUndefined();
  });

  it("rejects unmatched and invalid coordinates", async () => {
    const promise = censusLookup("unknown address");
    const name = getCallbackName();
    (window as unknown as Record<string, (response: unknown) => void>)[name]({
      result: { addressMatches: [{ coordinates: { x: "bad", y: 0 } }] },
    });
    await expect(promise).rejects.toThrow("We could not find that address");
  });

  it("rejects on a script network error", async () => {
    const promise = censusLookup("1 Main St");
    document.head
      .querySelector("script[src*='geocoding.geo.census.gov']")!
      .dispatchEvent(new Event("error"));
    await expect(promise).rejects.toThrow("We could not reach the Census Geocoder");
  });

  it("rejects after the request timeout", async () => {
    vi.useFakeTimers();
    const promise = censusLookup("1 Main St");
    const rejection = expect(promise).rejects.toThrow("Request timed out");
    await vi.advanceTimersByTimeAsync(12000);
    await rejection;
  });
});
