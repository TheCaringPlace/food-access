import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { FilterSidebar } from "../../src/components/FilterSidebar";
import { LocationActions, formatLocationAddress } from "../../src/components/LocationActions";
import { LocationResult } from "../../src/components/LocationResult";
import { LocationResults } from "../../src/components/LocationResults";
import { SearchForm } from "../../src/components/SearchForm";
import { locations, results } from "./fixtures";

vi.mock("../../src/hooks/useLocationData", () => ({ useLocationData: vi.fn() }));
vi.mock("../../src/components/LocationMap", () => ({
  default: () => <div data-testid="map-placeholder">Map</div>,
}));

import { useLocationData } from "../../src/hooks/useLocationData";

describe("SearchForm", () => {
  it("edits and submits a name query, changes modes, and clears", async () => {
    const user = userEvent.setup();
    const search = {
      text: "",
      mode: "address" as const,
      searching: false,
      setText: vi.fn(),
      changeMode: vi.fn(),
      submit: vi.fn(),
      clear: vi.fn(),
    };
    const { rerender } = render(<SearchForm search={search} />);

    await user.type(screen.getByRole("textbox", { name: "Address" }), "Main Street");
    expect(search.setText).toHaveBeenLastCalledWith("t");
    await user.click(screen.getByLabelText("name"));
    expect(search.changeMode).toHaveBeenCalledWith("name");
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(search.clear).toHaveBeenCalledOnce();

    rerender(
      <SearchForm
        search={{
          ...search,
          text: "Community Pantry",
          mode: "name",
          setText: vi.fn(),
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(search.submit).toHaveBeenCalledWith("Community Pantry");
    expect(
      screen.getByRole("textbox", { name: "Location name" }).getAttribute("autocomplete"),
    ).toBe("off");
  });

  it("disables controls and labels the submit button while searching", () => {
    render(
      <SearchForm
        search={{
          text: "Address",
          mode: "address",
          searching: true,
          setText: vi.fn(),
          changeMode: vi.fn(),
          submit: vi.fn(),
          clear: vi.fn(),
        }}
      />,
    );
    expect((screen.getByRole("button", { name: "Searching…" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(
      (screen.getAllByRole("group", { name: "Search by" })[0] as HTMLFieldSetElement).disabled,
    ).toBe(true);
  });
});

describe("FilterSidebar", () => {
  it("renders types and days and reports selections", async () => {
    const user = userEvent.setup();
    const filters = {
      types: ["Pantry", "Shelter"],
      selectedTypes: null,
      selectedDay: "" as const,
      toggleType: vi.fn(),
      setSelectedDay: vi.fn(),
    };
    const { rerender } = render(<FilterSidebar filters={filters} />);

    expect((screen.getByRole("checkbox", { name: "Pantry" }) as HTMLInputElement).checked).toBe(
      true,
    );
    expect((screen.getByRole("checkbox", { name: "Shelter" }) as HTMLInputElement).checked).toBe(
      true,
    );
    rerender(<FilterSidebar filters={{ ...filters, selectedTypes: ["Shelter"] }} />);
    expect((screen.getByRole("checkbox", { name: "Pantry" }) as HTMLInputElement).checked).toBe(
      false,
    );
    expect((screen.getByRole("checkbox", { name: "Shelter" }) as HTMLInputElement).checked).toBe(
      true,
    );
    rerender(<FilterSidebar filters={filters} />);
    await user.click(screen.getByRole("checkbox", { name: "Pantry" }));
    expect(filters.toggleType).toHaveBeenCalledWith("Pantry");
    await user.selectOptions(screen.getByRole("combobox", { name: "Open on" }), "Friday");
    expect(filters.setSelectedDay).toHaveBeenCalledWith("Friday");
  });
});

describe("LocationActions", () => {
  it("formats partial addresses and builds safe directions and web-search links", () => {
    expect(formatLocationAddress(locations[0])).toBe("100 Main Street, Cincinnati, OH, 45202");
    expect(formatLocationAddress(locations[2])).toBe("Newport, KY, 41071");
    const { rerender } = render(<LocationActions location={locations[0]} origin={null} />);
    const directions = screen.getByRole("link", { name: "Get directions to Community Pantry" });
    expect(new URL(directions.getAttribute("href")!).searchParams.get("destination")).toBe(
      "100 Main Street, Cincinnati, OH, 45202",
    );
    expect(
      screen
        .getByRole("link", { name: "Search the web for Community Pantry" })
        .getAttribute("target"),
    ).toBe("_blank");

    rerender(
      <LocationActions
        location={{ ...locations[2], address: "", city: "", state: "", zip: "" }}
        origin={{ latitude: 39, longitude: -84, label: "Start point" }}
      />,
    );
    const fallbackDirections = screen.getByRole("link", {
      name: "Get directions to Daily Soup Kitchen",
    });
    const params = new URL(fallbackDirections.getAttribute("href")!).searchParams;
    expect(params.get("destination")).toBe("39.09,-84.49");
    expect(params.get("origin")).toBe("Start point");
  });
});

describe("LocationResult", () => {
  it("shows the location, hours, distance, and selects it when clicked", async () => {
    const user = userEvent.setup();
    const selectLocation = vi.fn();
    const location = { ...results[0], distance: 1.24 };
    render(
      <LocationResult
        location={location}
        selectLocation={selectLocation}
        search={{ mode: "address", origin: null }}
      />,
    );

    expect(screen.getByText("Community Pantry")).toBeTruthy();
    expect(screen.getByText("1.2 mi")).toBeTruthy();
    expect(screen.getByText("Mon-Fri · 9:00 AM - 5:00 PM")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Community Pantry/ }));
    expect(selectLocation).toHaveBeenCalledWith(location.key);
  });
});

describe("LocationResults", () => {
  function renderResults(
    search: { mode: "name" | "address"; query: string; origin: null },
    filters = {
      types: null,
      day: "",
    },
  ) {
    return render(
      <Suspense fallback={<p>Loading map</p>}>
        <LocationResults locations={locations} criteria={{ search, filters }} mapResetVersion={0} />
      </Suspense>,
    );
  }

  it("sorts the default results and filters by fuzzy name, type, and day", async () => {
    const user = userEvent.setup();
    const { rerender } = renderResults({ mode: "name", query: "", origin: null });
    await screen.findByTestId("map-placeholder");
    expect(screen.getByText("3 matches")).toBeTruthy();
    const list = screen.getByRole("list");
    expect(
      within(list)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(expect.arrayContaining([expect.stringContaining("Community Pantry")]));

    rerender(
      <Suspense fallback={<p>Loading map</p>}>
        <LocationResults
          locations={locations}
          criteria={{
            search: { mode: "name", query: "Community Pantri", origin: null },
            filters: { types: null, day: "" },
          }}
          mapResetVersion={0}
        />
      </Suspense>,
    );
    expect(await screen.findByText("Community Pantry")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Locations" }).textContent).toContain(
      "1 matches for “Community Pantri”",
    );

    rerender(
      <Suspense fallback={<p>Loading map</p>}>
        <LocationResults
          locations={locations}
          criteria={{
            search: { mode: "name", query: "", origin: null },
            filters: { types: ["Pantry"], day: "Monday" },
          }}
          mapResetVersion={0}
        />
      </Suspense>,
    );
    expect(
      await screen.findByText((_, element) => element?.textContent === "1 matches"),
    ).toBeTruthy();
    expect(screen.getByText("Community Pantry")).toBeTruthy();

    await user.selectOptions(screen.getByRole("combobox", { name: "Matches per page" }), "10");
    expect(screen.queryByRole("navigation", { name: "Result pages" })).toBeNull();
  });

  it("reports empty results and paginates large result lists", async () => {
    const user = userEvent.setup();
    const empty = renderResults({ mode: "name", query: "no such place", origin: null });
    expect(await screen.findByText("No matching locations.")).toBeTruthy();
    empty.unmount();

    const manyLocations = Array.from({ length: 22 }, (_, index) => ({
      ...locations[0],
      name: `Pantry ${String(index).padStart(2, "0")}`,
    }));
    render(
      <Suspense fallback={<p>Loading map</p>}>
        <LocationResults
          locations={manyLocations}
          criteria={{
            search: { mode: "address", query: "123 Main St", origin: null },
            filters: { types: null, day: "" },
          }}
          mapResetVersion={0}
        />
      </Suspense>,
    );
    expect(await screen.findByText("Page 1 of 2")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(20);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Page 2 of 2")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("Page 1 of 2")).toBeTruthy();
    await user.selectOptions(screen.getByRole("combobox", { name: "Matches per page" }), "all");
    expect(screen.getAllByRole("listitem")).toHaveLength(22);
  });

  it("sorts nearby locations by distance and carries the address origin to directions", async () => {
    const origin = {
      latitude: locations[0].latitude,
      longitude: locations[0].longitude,
      label: "Start",
    };
    render(
      <Suspense fallback={<p>Loading map</p>}>
        <LocationResults
          locations={locations}
          criteria={{
            search: { mode: "address", query: "Cincinnati, OH", origin },
            filters: { types: null, day: "" },
          }}
          mapResetVersion={0}
        />
      </Suspense>,
    );

    const resultList = await screen.findByRole("list");
    expect(within(resultList).getAllByText(/\d+\.\d mi/)[0].textContent).toBe("0.0 mi");
    const directions = within(resultList).getByRole("link", {
      name: "Get directions to Community Pantry",
    });
    expect(new URL(directions.getAttribute("href")!).searchParams.get("origin")).toBe("Start");
  });
});

describe("App", () => {
  it("shows loading, error, and the finder states", async () => {
    vi.mocked(useLocationData).mockReturnValue({ locations: [], loading: true, error: "" });
    const { rerender } = render(<App />);
    expect(screen.getByRole("status").textContent).toBe("Loading");

    vi.mocked(useLocationData).mockReturnValue({
      locations: [],
      loading: false,
      error: "Could not load the location data.",
    });
    rerender(<App />);
    expect(screen.getByRole("alert").textContent).toContain("Could not load the location data.");

    vi.mocked(useLocationData).mockReturnValue({ locations, loading: false, error: "" });
    rerender(<App />);
    await waitFor(() => expect(screen.getByRole("main")).toBeTruthy());
  });
});
