import { Navigation } from "./navigation.js";

export function AppShell() {
  return `
    <div class="pitch-lines" aria-hidden="true"></div>

    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="/" data-link aria-label="FC Barrios hjem">
          <img
            class="brand__logo"
            src="/fcbarrios-logo.png"
            alt="FC Barrios"
          />

          <span class="brand__copy">
            <strong>FC BARRIOS</strong>
            <small>Prediction League</small>
          </span>
        </a>

        <div class="topbar__right">
          <span class="topbar__status"><i></i> EM 2028</span>
          <div id="auth-control" class="auth-control"></div>
        </div>
      </header>

      <main id="page-outlet" class="page-outlet"></main>
      ${Navigation()}
    </div>
  `;
}
