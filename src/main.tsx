import "@fontsource-variable/inter";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { MiniCalendar } from "./components/MiniCalendar";
import { applyPlatformClass } from "./platform";
import "./styles/theme.css";
import "./styles/app.css";
import "./styles/mac.css";

async function boot() {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("demo")) {
    const { installDemo } = await import("./devDemo");
    installDemo();
  }

  applyPlatformClass();

  const isMini = new URLSearchParams(window.location.search).has("mini");
  if (isMini) document.documentElement.classList.add("is-mini");

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>{isMini ? <MiniCalendar /> : <App />}</React.StrictMode>,
  );
}

void boot();
