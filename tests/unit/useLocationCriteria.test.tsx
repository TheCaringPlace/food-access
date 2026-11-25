import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { locations } from "./fixtures";

const { censusLookup } = vi.hoisted(() => ({ censusLookup: vi.fn() }));
vi.mock("../../src/location-utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/location-utils")>()),
  censusLookup,
}));

import { useLocationCriteria } from "../../src/hooks/useLocationCriteria";

describe("useLocationCriteria", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    censusLookup.mockReset();
  });

  it("initializes criteria from URL parameters and keeps only supported values", () => {
    window.history.replaceState(
      {},
      "",
      "/?q=Hope%20Shelter&mode=name&type=Pantry&type=Unknown&day=Saturday&ignored=yes",
    );
    const { result } = renderHook(() => useLocationCriteria(locations));

    expect(result.current.criteria).toEqual({
      search: { mode: "name", query: "Hope Shelter", origin: null },
      filters: { types: ["Pantry"], day: "Saturday" },
    });
    expect(result.current.searchText).toBe("Hope Shelter");
    expect(new URLSearchParams(window.location.search).get("ignored")).toBe("yes");
  });

  it("supports an explicit empty type selection and normalizes invalid values", () => {
    censusLookup.mockResolvedValue({ latitude: 0, longitude: 0, label: "Soup" });
    window.history.replaceState({}, "", "/?type=none&day=Funday&mode=other&q=%20%20Soup%20%20");
    const { result } = renderHook(() => useLocationCriteria(locations));

    expect(result.current.criteria.search).toEqual({
      mode: "address",
      query: "Soup",
      origin: null,
    });
    expect(result.current.criteria.filters).toEqual({ types: [], day: "" });
  });

  it("writes search and filter changes to the URL and toggles types", async () => {
    const { result } = renderHook(() => useLocationCriteria(locations));
    act(() => result.current.changeSearchMode("name"));
    act(() => {
      result.current.setSearchText("Community");
    });
    act(() => {
      result.current.submitSearch(" Community Pantry ");
      result.current.toggleType("Pantry");
      result.current.setSelectedDay("Monday");
    });

    await waitFor(() => {
      const params = new URLSearchParams(window.location.search);
      expect(params.get("q")).toBe("Community Pantry");
      expect(params.get("mode")).toBe("name");
      expect(params.getAll("type")).toEqual(["Shelter", "Soup kitchen"]);
      expect(params.get("day")).toBe("Monday");
    });
    expect(result.current.searching).toBe(false);

    act(() => result.current.toggleType("Pantry"));
    await waitFor(() =>
      expect(new URLSearchParams(window.location.search).getAll("type")).toEqual([
        "Shelter",
        "Soup kitchen",
        "Pantry",
      ]),
    );
  });

  it("submits address searches, resolves coordinates, and clears all criteria", async () => {
    censusLookup.mockResolvedValue({ latitude: 39, longitude: -84, label: "Cincinnati, OH" });
    const { result } = renderHook(() => useLocationCriteria(locations));
    act(() => result.current.submitSearch(" Cincinnati, OH "));

    expect(result.current.searching).toBe(true);
    await waitFor(() =>
      expect(result.current.criteria.search.origin).toEqual({
        latitude: 39,
        longitude: -84,
        label: "Cincinnati, OH",
      }),
    );
    expect(censusLookup).toHaveBeenCalledWith("Cincinnati, OH");
    expect(result.current.searching).toBe(false);

    act(() => {
      result.current.toggleType("Pantry");
      result.current.setSelectedDay("Friday");
      result.current.clearCriteria();
    });
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(result.current.searchText).toBe("");
    expect(result.current.criteria).toEqual({
      search: { mode: "address", query: "", origin: null },
      filters: { types: null, day: "" },
    });
    expect(result.current.mapResetVersion).toBe(1);
  });

  it("shows address lookup errors and does nothing for blank searches", async () => {
    censusLookup.mockRejectedValue(new Error("No address match"));
    const { result } = renderHook(() => useLocationCriteria(locations));
    act(() => result.current.submitSearch("   "));
    expect(censusLookup).not.toHaveBeenCalled();
    act(() => result.current.submitSearch("bad address"));
    await waitFor(() => expect(result.current.error).toBe("No address match"));
    expect(result.current.searching).toBe(false);
  });

  it("uses a fallback message for unexpected lookup failures and cancels stale lookups", async () => {
    let rejectOld!: (reason: unknown) => void;
    censusLookup
      .mockImplementationOnce(() => new Promise((_resolve, reject) => (rejectOld = reject)))
      .mockRejectedValueOnce("offline");
    const { result } = renderHook(() => useLocationCriteria(locations));
    act(() => result.current.submitSearch("old address"));
    act(() => result.current.submitSearch("new address"));
    await waitFor(() => expect(result.current.error).toBe("Address lookup failed."));
    act(() => rejectOld(new Error("stale failure")));
    await act(async () => Promise.resolve());
    expect(result.current.error).toBe("Address lookup failed.");
  });
});
