import { routes } from "./routes.js";
import { setActiveNavigation } from "../components/layout/navigation.js";
import { renderPageLoading } from "../components/ui/loading-state.js";

function normalizePath(pathname) {
  const cleaned = pathname.replace(/\/+$/, "");
  return cleaned || "/";
}

function navigate(path) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, "", path);
  }
  void renderCurrentRoute();
}

async function renderCurrentRoute() {
  const outlet = document.querySelector("#page-outlet");
  if (!outlet) return;

  const path = normalizePath(window.location.pathname);
  const page = routes[path] ?? routes["/"];

  renderPageLoading(outlet);
  setActiveNavigation(path);

  try {
    outlet.innerHTML = await page();
    window.scrollTo({ top: 0, behavior: "instant" });
  } catch (error) {
    console.error(error);
    outlet.innerHTML = `
      <section class="state-card state-card--error">
        <span class="state-card__icon">!</span>
        <h1>Noe gikk galt</h1>
        <p>${error?.message ?? "Ukjent feil"}</p>
        <button class="button button--primary" data-retry>Prøv igjen</button>
      </section>
    `;
    outlet.querySelector("[data-retry]")?.addEventListener("click", renderCurrentRoute);
  }
}

function bindNavigation() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-link]");
    if (!link) return;

    const url = new URL(link.href);
    if (url.origin !== window.location.origin) return;

    event.preventDefault();
    navigate(url.pathname);
  });

  window.addEventListener("popstate", renderCurrentRoute);
}

export const router = {
  async start() {
    bindNavigation();
    await renderCurrentRoute();
  },
  navigate
};
