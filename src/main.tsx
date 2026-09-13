import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./client/App";
import { CardGallery } from "./client/CardGallery";
import "./client/card-visuals.css";
import { MorrowPreview } from "./client/MorrowPreview";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Joint Liability requires a root element.");
}

// Development preview switches mount visual review surfaces instead of the game.
// The production entry point is unchanged when the parameter is absent.
const preview = new URLSearchParams(window.location.search).get("preview");

createRoot(rootElement).render(
  <StrictMode>
    {preview === "morrow" ? (
      <MorrowPreview />
    ) : preview === "cards" ? (
      <CardGallery />
    ) : (
      <App />
    )}
  </StrictMode>,
);
