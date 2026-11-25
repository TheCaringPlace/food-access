import React from "react";
import ReactDOM from "react-dom/client";
// oxlint-disable-next-line import/no-unassigned-import -- Vite loads CSS through side-effect imports.
import "./styles.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
