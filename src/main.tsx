import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { LearningProvider } from "./lib/store";
import { App } from "./App";
import { StudioProvider } from "./StudioContext";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StudioProvider>
      <HashRouter>
        <LearningProvider>
          <App />
        </LearningProvider>
      </HashRouter>
    </StudioProvider>
  </StrictMode>,
);
