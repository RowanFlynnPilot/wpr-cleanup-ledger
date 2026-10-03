// Fraunces is variable on optical size: one file serves every weight, and
// the browser matches the opsz axis to each font-size (display cut for the
// title, text cut in the drawer).
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource/public-sans/400.css";
import "@fontsource/public-sans/500.css";
import "@fontsource/public-sans/600.css";
import "@fontsource/public-sans/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "leaflet/dist/leaflet.css";
import "./styles.css";

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
