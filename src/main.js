import "./styles/index.css";
import { router } from "./router/router.js";
import { AppShell } from "./components/layout/app-shell.js";
import { showFatalError } from "./components/ui/error-state.js";
import { initializeAuth } from "./services/auth-service.js";
import { mountAuthControl } from "./components/layout/auth-control.js";

async function start() {
  const app = document.querySelector("#app");

  if (!app) {
    throw new Error("Fant ikke #app.");
  }

  app.innerHTML = AppShell();

  await initializeAuth();
  mountAuthControl();
  await router.start();
}

start().catch((error) => {
  console.error(error);
  showFatalError(error);
});
