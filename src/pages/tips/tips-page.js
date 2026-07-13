import { getActiveTournament } from "../../repositories/tournament-repository.js";
import { mockMatches } from "../../data/mock-data.js";
import { MatchCard } from "../../components/cards/match-card.js";

export async function TipsPage() {
  const tournament = await getActiveTournament();

  return `
    <div class="page">
      <header class="page-header">
        <span>EM 2028</span>
        <h1>Tips</h1>
        <p>Første skjelett for den viktigste siden i hele appen.</p>
      </header>

      <section class="panel">
        <div class="round-tabs">
          <button class="is-active">Runde 1</button>
          <button>Runde 2</button>
          <button>Runde 3</button>
          <button>Sluttspill</button>
        </div>
        <div class="match-list">
          ${mockMatches.map(MatchCard).join("")}
        </div>
        <button class="button button--primary button--full">Lagre tips</button>
      </section>
    </div>
  `;
}
