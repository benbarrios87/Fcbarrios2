import { getAuthSnapshot } from "../../services/auth-service.js";

export async function AdminPage() {
  const auth = getAuthSnapshot();

  if (!auth.isAuthenticated) {
    return `<div class="page"><section class="access-card">
      <span>🔒</span><h1>Logg inn først</h1>
      <a class="button button--primary" href="/login" data-link>Logg inn</a>
    </section></div>`;
  }

  if (!auth.isAdmin) {
    return `<div class="page"><section class="access-card">
      <span>⛔</span><h1>Ingen admin-tilgang</h1>
      <a class="button button--ghost" href="/" data-link>Til forsiden</a>
    </section></div>`;
  }

  const modules = [
    ["🏠", "Turneringsmodus", "Påmelding, turnering eller ferdig.", "/admin/tournament"],
    ["🌍", "Lag og flagg", "Legg til lag, tier, gruppe og automatisk flagg.", "/admin/teams"],
    ["⚽", "Kamper og resultater", "Registrer resultater og beregn poeng.", "/admin/results"],
    ["🧮", "Scoremodell", "Endre kampmatrisen uten kode.", "/admin/scoring"],
    ["🎯", "Bonusmotor", "Toppscorer, Best Player og RTG.", "/admin/bonuses"],
    ["💳", "Betalinger", "Bronse, Sølv, Gull og betalingsstatus.", "/admin/payments"],
    ["🏆", "Premiemotor", "Sidepotter, fordeling og live vinnere.", "/admin/prizes"],
    ["📣", "Nyheter", "Publiser meldinger.", "#"],
    ["👥", "Spillere", "Deltakere og roller.", "#"]
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
            ? `<article><span>${icon}</span><strong>${title}</strong><small>${text}</small></article>`
            : `<a class="admin-module" href="${href}" data-link>
                <span>${icon}</span><strong>${title}</strong><small>${text}</small>
              </a>`
        ).join("")}
      </section>
    </div>
  `;
}
