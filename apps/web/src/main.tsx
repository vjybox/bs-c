import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// The static demo build has no server to rewrite unknown paths onto index.html, so it
// routes on the hash instead. Everything else uses real paths.
const isDemo = import.meta.env.VITE_DEMO_MODE === "true";
const Router = isDemo ? HashRouter : BrowserRouter;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isDemo && (
      <div className="demo-banner">
        <strong>Demo</strong> — sample data running entirely in your browser. Changes are not
        saved and reset when you reload. This is not a live deployment.
      </div>
    )}
    <Router>
      <App />
    </Router>
  </StrictMode>,
);
