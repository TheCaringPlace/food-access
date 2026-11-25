import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { SourceLocation } from "../../src/types";

test.beforeEach(async ({ page }) => {
  await page.route("**/tile.openstreetmap.org/**", (route) => route.abort());
});

test("serves the static app and location data", async ({ page, request, baseURL }) => {
  const dataResponse = await request.get(`${baseURL}/locations.json`);
  expect(dataResponse.ok()).toBe(true);
  expect((await dataResponse.json()).length).toBeGreaterThan(0);

  await page.goto("/");
  await expect(page).toHaveTitle("Food Access Points | The Caring Place");
  await expect(page.getByRole("heading", { name: "Filters" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Locations" })).toContainText("matches");
  await expect(page.locator("#location-results-map")).toBeVisible();
  const structuredData = page.locator(
    'script[type="application/ld+json"][data-food-access-points]',
  );
  await expect(structuredData).toHaveCount(1);
  const itemList = await structuredData.evaluate((script) =>
    JSON.parse(script.textContent ?? "{}"),
  );
  expect(itemList["@type"]).toBe("ItemList");
  expect(itemList.numberOfItems).toBeGreaterThan(0);
  expect(itemList.itemListElement[0].item.geo["@type"]).toBe("GeoCoordinates");
});

test("has no automatically detected accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Filters" })).toBeVisible();

  const accessibilityScan = await new AxeBuilder({ page }).analyze();
  const violations = accessibilityScan.violations.map(({ id, impact, help, nodes }) => ({
    id,
    impact,
    help,
    targets: nodes.slice(0, 5).map((node) => node.target),
  }));
  expect(violations, `Accessibility violations: ${JSON.stringify(violations, null, 2)}`).toEqual(
    [],
  );
});

test("loads the module widget in isolated styles without changing the host URL", async ({
  page,
}) => {
  await page.goto("/?host=keep");
  await page.evaluate(async () => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = "/assets/widget.js";
    document.head.append(script);
    await new Promise<void>((resolve, reject) => {
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error("Could not load widget module.")), {
        once: true,
      });
    });
    document.body.insertAdjacentHTML("beforeend", "<food-access-map></food-access-map>");
  });

  const widget = page.locator("food-access-map");
  await expect(widget.getByRole("heading", { name: "Filters" })).toBeVisible();
  await expect(widget.locator("#location-results-map")).toBeVisible();
  const widgetHeading = widget.getByRole("heading", {
    level: 1,
    name: "Food Access Points",
  });
  await expect(widget.getByRole("group", { name: "Text size" })).toHaveCount(0);
  expect(
    await widget.evaluate((element) =>
      element.shadowRoot?.querySelector("style")?.textContent?.includes(".leaflet-container"),
    ),
  ).toBe(true);
  await widget.getByLabel("name", { exact: true }).check();
  await widget.getByRole("textbox", { name: "Location name" }).fill("Test location");
  await widget.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/host=keep/);
  await expect(page).not.toHaveURL(/[?&](q|mode|type|day)=/);
});

test("searches by name, applies type filters, and persists state in the URL", async ({
  page,
  request,
  baseURL,
}) => {
  const locations = (await (
    await request.get(`${baseURL}/locations.json`)
  ).json()) as SourceLocation[];
  const location = locations[0];
  await page.goto("/");
  await page.getByLabel("name", { exact: true }).check();

  const search = page.getByRole("textbox", { name: "Location name" });
  await search.fill(location.name);
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page).toHaveURL(new RegExp(`[?&]mode=name`));
  await expect
    .poll(() => page.evaluate(() => new URLSearchParams(window.location.search).get("q")))
    .toBe(location.name);
  await expect(page.getByRole("region", { name: "Locations" })).toContainText(location.name);
  const matchingType = page.getByRole("checkbox", { name: location.type, exact: true });
  await matchingType.uncheck();
  await expect(
    page.getByRole("region", { name: "Locations" }).getByText(location.name, { exact: true }),
  ).toHaveCount(0);

  await matchingType.check();
  await expect(page.getByRole("region", { name: "Locations" })).toContainText(location.name);
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page).not.toHaveURL(/\b(q|mode|type|day)=/);
  await expect(page.getByRole("region", { name: "Locations" })).toContainText("matches");
});

test("address search uses Census coordinates and puts the origin in directions", async ({
  page,
  request,
  baseURL,
}) => {
  const locations = (await (
    await request.get(`${baseURL}/locations.json`)
  ).json()) as SourceLocation[];
  const location = locations[0];
  await page.route("https://geocoding.geo.census.gov/**", async (route) => {
    const url = new URL(route.request().url());
    const callback = url.searchParams.get("callback");
    expect(callback).toBeTruthy();
    await route.fulfill({
      contentType: "application/javascript",
      body: `${callback}(${JSON.stringify({
        result: {
          addressMatches: [
            {
              matchedAddress: "100 TEST AVE, CINCINNATI, OH 45202",
              coordinates: { x: location.longitude, y: location.latitude },
            },
          ],
        },
      })});`,
    });
  });

  await page.goto("/");
  await page.getByRole("textbox", { name: "Address" }).fill("100 Test Ave, Cincinnati, OH");
  await page.getByRole("button", { name: "Search" }).click();

  const result = page.getByRole("region", { name: "Locations" });
  await expect(result).toContainText(location.name);
  await expect(result.getByText("0.0 mi").first()).toBeVisible();
  const directions = page.getByRole("link", { name: `Get directions to ${location.name}` }).first();
  await expect(directions).toHaveAttribute("href", /origin=100\+TEST\+AVE/);
  await expect(page).toHaveURL(/q=100\+Test\+Ave/);
});
