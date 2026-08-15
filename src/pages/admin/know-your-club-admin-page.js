import { getAuthSnapshot } from "../../services/auth-service.js";
import { getTournamentBySlug } from "../../repositories/tournament-repository.js";
import {
  getAdminMembers,
  lockClubSelections
} from "../../repositories/admin-members-repository.js";

const TOURNAMENT_SLUG = "know-your-club-2026";

let state = {
  tournament: null,
  members: []
};

function memberRow(member) {
  return `
    <article class="admin-team-row">
      <div class="admin-team-row__name">
        <strong>${member.display_name}</strong>
        <small>${member.email || "Ingen e-post"}</small>
      </div>
    </article>
  `;
}

function bindEvents() {
  const lockButton = document.querySelector("[data-lock-selections]");
  lockButton?.addEventListener("click", async () => {
    if (!confirm("Låse ALLE klubbvalg nå? Dette kan ikke angres uten SQL.")) return;

    lockButton.disabled = true;
    lockButton.textContent = "Låser …";

    try {
      const count = await lockClubSelections(state.tournament.id);
      lockButton.textContent = `${count} klubbvalg låst ✓`;
    } catch (error) {
      lockButton.textContent = error.message;
      lockButton.disabled = false;
    }
  });
}

export async function KnowYourClubAdminPage() {
  const auth = getAuthSnapshot();

  if (!auth.isAdmin) {
    return `<div class="page"><section class="access-card">
      <span>⛔</span><h1>Ingen tilgang</h1>
      <a class="button button--ghost" href="/" data-link>Til forsiden</a>
    </section></div>`;
  }

  const tournament = await getTournamentBySlug(TOURNAMENT_SLUG);
  const members = await getAdminMembers(tournament.id);

  state = { tournament, members };
  window.setTimeout(bindEvents, 0);

  return `
    <div class="page">
      <header class="page-header">
        <span>Admin · ${tournament.short_name}</span>
        <h1>Know Your Club</h1>
        <p>Status: <strong>${tournament.status}</strong>. Rediger lag i Lagkontroll, kamper og resultat kjøres foreløpig via SQL.</p>
      </header>

      <section class="panel admin-team-editor">
        <div class="section-heading">
          <div><span>Klubbvalg</span><h2>Lås alle valg</h2></div>
        </div>
        <p style="color:var(--muted); font-size:13px; margin:0 0 14px;">
          Låser klubbvalget til alle påmeldte spillere samtidig — bruk dette
          når sesongen faktisk starter, slik at ingen kan bytte lag underveis.
        </p>
        <button class="button button--primary" type="button" data-lock-selections>
          Lås alle klubbvalg nå
        </button>
      </section>

      <section class="panel admin-team-list">
        <div class="section-heading">
          <div><span>Påmeldte</span><h2>Medlemmer (${members.length})</h2></div>
        </div>
        <div class="admin-team-rows">
          ${members.length
            ? members.map(memberRow).join("")
            : `<div class="tips-empty">Ingen har meldt seg på ennå — de meldes automatisk inn når de velger klubb.</div>`}
        </div>
      </section>
    </div>
  `;
}
