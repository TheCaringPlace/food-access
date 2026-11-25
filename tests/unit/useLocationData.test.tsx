import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLocationData } from "../../src/hooks/useLocationData";
import { locations } from "./fixtures";

describe("useLocationData", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads valid locations and drops records with invalid coordinates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [locations[0], { ...locations[1], latitude: Number.NaN }],
      }),
    );
    const { result } = renderHook(() => useLocationData());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.locations).toEqual([locations[0]]);
    expect(result.current.error).toBe("");
    expect(fetch).toHaveBeenCalledWith(
      "/locations.json",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("loads from a configured data URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => [locations[0]] }),
    );
    const dataUrl = "https://finder.example/locations.json";
    const { result } = renderHook(() => useLocationData(dataUrl));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetch).toHaveBeenCalledWith(
      dataUrl,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.current.locations).toEqual([locations[0]]);
  });

  it("exposes a failed response as an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const { result } = renderHook(() => useLocationData());
    await waitFor(() => expect(result.current.error).toBe("Could not load the location data."));
    expect(result.current.loading).toBe(false);
  });

  it("uses a fallback for non-Error failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue("offline"));
    const { result } = renderHook(() => useLocationData());
    await waitFor(() => expect(result.current.error).toBe("Could not load locations."));
  });

  it("aborts an in-flight request on unmount without reporting an error", async () => {
    let rejectRequest!: (error: unknown) => void;
    const fetchMock = vi.fn((_url: string, options: { signal: AbortSignal }) => {
      options.signal.addEventListener("abort", () =>
        rejectRequest(new DOMException("Aborted", "AbortError")),
      );
      return new Promise((_resolve, reject) => {
        rejectRequest = reject;
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = renderHook(() => useLocationData());
    await act(async () => unmount());
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
