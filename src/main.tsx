import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./client/App";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Joint Liability requires a root element.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
