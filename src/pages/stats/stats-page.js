import { getAuthSnapshot } from "../../services/auth-service.js";
import { getActiveTournament } from "../../repositories/tournament-repository.js";
import { getProfile } from "../../repositories/profile-repository.js";

export async function StatsPage() {
  const auth = getAuthSnapshot();

  if (!auth.isAuthenticated) {
    return `
      <div class="page">
        <section class="access-card">
          <span>📊</span>
          <h1>Logg inn for å se statistikken din</h1>
          <a class="button button--primary" href="/login" data-link>Logg inn</a>
        </section>
      </div>
    `;
  }

  const playerId = auth.player?.player_id || auth.player?.id;
  const tournament = await getActiveTournament();
  const profile = await getProfile(playerId, tournament.id);

  const current = profile.current || {};
  const exact = Number(current.exact_hits || 0);
  const difference = Number(current.difference_hits || 0);
  const outcome = Number(current.outcome_hits || 0);
  const scored = exact + difference + outcome;

  const stats = [
    [`#${current.rank ?? "–"}`, "Plassering"],
    [`${current.points ?? 0}`, "Poeng"],
    [`${exact}`, "Eksakte resultater"],
    [`${profile.averageFinish ? Number(profile.averageFinish).toFixed(1) : "–"}`, "Snittplassering (karriere)"]
  ];

  const breakdown = [
    { label: "Eksakt", value: exact, color: "var(--gold)" },
    { label: "Målforskjell", value: difference, color: "var(--green)" },
    { label: "Riktig utfall", value: outcome, color: "var(--blue)" }
  ];
  const maxBreakdown = Math.max(1, ...breakdown.map((b) => b.value));

  return `
    <div class="page">
      <header class="page-header">
        <span>${tournament.short_name}</span>
        <h1>Statsrommet</h1>
        <p>Din egen tippehistorikk denne turneringen.</p>
      </header>

      <section class="stat-grid">
        ${stats.map(([value, label]) => `<article><strong>${value}</strong><span>${label}</span></article>`).join("")}
      </section>

      <section class="panel chart-placeholder">
        <div class="section-heading">
          <div><span>Fordeling</span><h2>Hvordan poengene kom inn</h2></div>
        </div>

        ${
          scored
            ? `
              <div class="stats-breakdown">
                ${breakdown.map((b) => `
                  <div class="stats-breakdown__row">
                    <span>${b.label}</span>
                    <div class="stats-breakdown__bar">
                      <i style="width:${(b.value / maxBreakdown) * 100}%; background:${b.color};"></i>
                    </div>
                    <strong>${b.value}</strong>
                  </div>
                `).join("")}
              </div>
            `
            : `<div class="tips-empty">Ingen scorede kamper ennå — kommer så snart resultater er lagt inn.</div>`
        }
      </section>
    </div>
  `;
}
