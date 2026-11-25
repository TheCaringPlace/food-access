import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import leafletStyles from "leaflet/dist/leaflet.css?inline";
import appStyles from "./styles.css?inline";
import App from "./App";

const defaultLocationsUrl = new URL("/locations.json", import.meta.url).href;

class FoodAccessMapElement extends HTMLElement {
  static observedAttributes = ["data-locations-url"];

  private reactRoot: Root | undefined;
  private mountPoint: HTMLDivElement | undefined;

  connectedCallback() {
    const shadowRoot = this.shadowRoot ?? this.attachShadow({ mode: "open" });

    if (!this.reactRoot) {
      if (!shadowRoot.querySelector("style[data-food-access-map-styles]")) {
        const style = document.createElement("style");
        style.dataset.foodAccessMapStyles = "";
        style.textContent = `
          ${leafletStyles}
          ${appStyles}
          :host {
            all: initial;
            box-sizing: border-box;
            color: #0f172a;
            display: block;
            font-family: system-ui, sans-serif;
            font-size: 17px;
            width: 100%;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
        `;
        shadowRoot.append(style);
      }

      this.mountPoint = document.createElement("div");
      this.mountPoint.dataset.foodAccessMapRoot = "";
      shadowRoot.append(this.mountPoint);
      this.reactRoot = createRoot(this.mountPoint);
    }

    this.renderWidget();
  }

  disconnectedCallback() {
    this.reactRoot?.unmount();
    this.reactRoot = undefined;
    this.mountPoint?.remove();
    this.mountPoint = undefined;
  }

  attributeChangedCallback() {
    this.renderWidget();
  }

  private renderWidget() {
    if (!this.reactRoot) return;

    const configuredUrl = this.getAttribute("data-locations-url");
    const locationsUrl = configuredUrl
      ? new URL(configuredUrl, document.baseURI).href
      : defaultLocationsUrl;

    this.reactRoot.render(
      <StrictMode>
        <App
          locationsUrl={locationsUrl}
          syncUrl={false}
          includeStructuredData={false}
          includeTitle={false}
        />
      </StrictMode>,
    );
  }
}

if (!customElements.get("food-access-map")) {
  customElements.define("food-access-map", FoodAccessMapElement);
}
