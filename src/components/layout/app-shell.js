import { Navigation } from "./navigation.js";

export function AppShell() {
  return `
    <div class="pitch-lines" aria-hidden="true"></div>
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="/" data-link aria-label="FC Barrios hjem">
          <span class="brand__crest">FCB</span>
          <span class="brand__copy">
            <strong>FC BARRIOS</strong>
            <small>Prediction League</small>
          </span>
        </a>
        <span class="topbar__status"><i></i> EM 2028</span>
      </header>

      <main id="page-outlet" class="page-outlet"></main>
      ${Navigation()}
    </div>
  `;
}
