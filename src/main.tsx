import "@fontsource-variable/inter";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/theme.css";
import "./styles/app.css";

async function boot() {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("demo")) {
    const { installDemo } = await import("./devDemo");
    installDemo();
  }

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void boot();
