import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AppThemeProvider } from "./theme/ThemeProvider.jsx";
import { ColorSchemeScript } from "@mantine/core";

// Import Mantine styles
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/spotlight/styles.css";

// Import custom styles
import "./styles/global.css";
import "./styles/styles.css";

// Configure accessibility metadata
document.documentElement.lang = "en";
document.documentElement.setAttribute("dir", "ltr");

// Render the app
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* ColorSchemeScript must be rendered before AppThemeProvider */}
    <ColorSchemeScript defaultColorScheme="light" />
    <AppThemeProvider>
      <App />
    </AppThemeProvider>
  </React.StrictMode>
);
