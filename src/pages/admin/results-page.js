import { getAuthSnapshot } from "../../services/auth-service.js";
import { getActiveTournament } from "../../repositories/tournament-repository.js";
import {
  getAdminMatches,
  saveMatchResult
} from "../../repositories/results-repository.js";
import { formatKickoff } from "../../utils/format.js";

let pageState = {
  tournament: null,
  matches: [],
  saving: new Set()
};

function resultValue(value) {
  return value === null || value === undefined ? "" : value;
}

function renderMatch(match) {
  const saving = pageState.saving.has(match.match_id);
  const scored = match.status === "finished";

  return `
    <article class="result-card" data-result-match="${match.match_id}">
      <div class="result-card__meta">
        <span>${match.round || "Kamp"}</span>
        <time>${formatKickoff(match.kickoff_at)}</time>
      </div>

      <div class="result-card__main">
        <strong>${match.home_team}</strong>

        <div class="result-score">
          <input
            type="number"
            min="0"
            max="30"
            inputmode="numeric"
            data-result-home
            value="${resultValue(match.home_score)}"
            aria-label="Mål ${match.home_team}"
          />
          <span>–</span>
          <input
            type="number"
            min="0"
            max="30"
            inputmode="numeric"
            data-result-away
            value="${resultValue(match.away_score)}"
            aria-label="Mål ${match.away_team}"
          />
        </div>

        <strong>${match.away_team}</strong>
      </div>

      <div class="result-card__stats">
        <span><b>${match.prediction_count ?? 0}</b> tips</span>
        <span><b>${match.exact_count ?? 0}</b> eksakte</span>
        <span><b>${match.total_points_awarded ?? 0}</b> poeng utdelt</span>
      </div>

      <div class="result-card__footer">
        <span class="result-status">
          ${
            saving
              ? "Beregner poeng …"
              : scored
                ? "✓ Ferdig og scoret"
                : "Ikke ferdigspilt"
          }
        </span>

        <button
          type="button"
          class="button button--primary result-save"
          data-save-result
          ${saving ? "disabled" : ""}
        >
          ${scored ? "Oppdater resultat" : "Lagre resultat"}
        </button>
      </div>
    </article>
  `;
}

function renderContent() {
  const target = document.querySelector("#results-content");
  if (!target) return;

  target.innerHTML = `
    <div class="results-summary">
      <span>
        <strong>${pageState.matches.length}</strong>
        kamper
      </span>
      <span>
        <strong>
          ${pageState.matches.filter((match) => match.status === "finished").length}
        </strong>
        ferdigspilt
      </span>
    </div>

    <div class="results-list">
      ${pageState.matches.map(renderMatch).join("")}
    </div>
  `;

  bindEvents();
}

function setCardMessage(matchId, message, isError = false) {
  const card = document.querySelector(`[data-result-match="${matchId}"]`);
  const status = card?.querySelector(".result-status");

  if (!status) return;

  status.textContent = message;
  status.classList.toggle("is-error", isError);
}

function bindEvents() {
  document.querySelectorAll("[data-save-result]").forEach((button) => {
    button.addEventListener("click", async () => {
      const card = button.closest("[data-result-match]");
      const matchId = card.dataset.resultMatch;
      const homeInput = card.querySelector("[data-result-home]");
      const awayInput = card.querySelector("[data-result-away]");

      if (homeInput.value === "" || awayInput.value === "") {
        setCardMessage(matchId, "Fyll inn begge resultater.", true);
        return;
      }

      pageState.saving.add(matchId);
      renderContent();

      try {
        const scoredCount = await saveMatchResult({
          matchId,
          homeScore: homeInput.value,
          awayScore: awayInput.value,
          finished: true
        });

        pageState.matches = await getAdminMatches(pageState.tournament.id);
        pageState.saving.delete(matchId);
        renderContent();
        setCardMessage(
          matchId,
          `✓ Resultat lagret · ${scoredCount ?? 0} tips scoret`
        );
      } catch (error) {
        pageState.saving.delete(matchId);
        renderContent();
        setCardMessage(matchId, error.message, true);
      }
    });
  });
}

export async function ResultsPage() {
  const auth = getAuthSnapshot();

  if (!auth.isAdmin) {
    return `
      <div class="page">
        <section class="access-card">
          <span>⛔</span>
          <h1>Ingen tilgang</h1>
          <p>Resultater kan bare registreres av admin eller owner.</p>
          <a class="button button--ghost" href="/" data-link>Til forsiden</a>
        </section>
      </div>
    `;
  }

  const tournament = await getActiveTournament();
  const matches = await getAdminMatches(tournament.id);

  pageState = {
    tournament,
    matches,
    saving: new Set()
  };

  window.setTimeout(renderContent, 0);

  return `
    <div class="page">
      <header class="page-header">
        <span>Admin · ${tournament.short_name}</span>
        <h1>Resultater</h1>
        <p>
          Registrer sluttresultatet. Alle tips beregnes automatisk på nytt.
        </p>
      </header>

      <section id="results-content">
        <div class="loading-state">
          <div class="loading-ball">⚽</div>
          <p>Laster kampene …</p>
        </div>
      </section>
    </div>
  `;
}
