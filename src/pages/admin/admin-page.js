import { getAuthSnapshot } from "../../services/auth-service.js";

export async function AdminPage() {
  const auth = getAuthSnapshot();

  if (!auth.isAuthenticated) {
    return `
      <div class="page">
        <section class="access-card">
          <span>🔒</span>
          <h1>Logg inn først</h1>
          <p>Adminområdet krever en FC Barrios-konto.</p>
          <a class="button button--primary" href="/login" data-link>
            Logg inn
          </a>
        </section>
      </div>
    `;
  }

  if (!auth.isAdmin) {
    return `
      <div class="page">
        <section class="access-card">
          <span>⛔</span>
          <h1>Ingen admin-tilgang</h1>
          <p>Kontoen din er logget inn som spiller.</p>
          <a class="button button--ghost" href="/" data-link>
            Til forsiden
          </a>
        </section>
      </div>
    `;
  }

  const modules = [
    ["📣", "Nyheter", "Publiser meldinger og siste nytt.", "#"],
    ["🔓", "Runder", "Åpne og lås tipperunder.", "#"],
    ["⚽", "Kamper og resultater", "Registrer resultater og beregn poeng.", "/admin/results"],
    ["🧮", "Scoremodell", "Endre poengmatrisen uten kode.", "/admin/scoring"],
    ["🧨", "Road to Glory", "Lag, multiplikatorer og status.", "#"],
    ["👥", "Spillere", "Deltakere, roller og tilgang.", "#"]
  ];

  return `
    <div class="page">
      <header class="page-header">
        <span>${auth.membership.role}</span>
        <h1>Admin</h1>
        <p>Kontrollrommet for EM 2028.</p>
      </header>

      <section class="admin-grid">
        ${modules.map(([icon, title, text, href]) =>
          href === "#"
            ? `
              <article>
                <span>${icon}</span>
                <strong>${title}</strong>
                <small>${text}</small>
              </article>
            `
            : `
              <a class="admin-module" href="${href}" data-link>
                <span>${icon}</span>
                <strong>${title}</strong>
                <small>${text}</small>
              </a>
            `
        ).join("")}
      </section>
    </div>
  `;
}
