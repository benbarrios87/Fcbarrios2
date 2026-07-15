import { getAuthSnapshot } from "../../services/auth-service.js";
import { getActiveTournament } from "../../repositories/tournament-repository.js";
import {
  getAdminMatches,
  saveMatchResult
} from "../../repositories/results-repository.js";
import { formatKickoff } from "../../utils/format.js";

let state = {
  tournament: null,
  matches: [],
  query: "",
  saving: new Set()
};

function groupMatches(matches) {
  return matches.reduce((groups, match) => {
    const key = match.round || "Kamper";
    groups[key] ??= [];
    groups[key].push(match);
    return groups;
  }, {});
}

function filteredMatches() {
  const query = state.query.trim().toLowerCase();

  if (!query) return state.matches;

  return state.matches.filter((match) =>
    match.home_team.toLowerCase().includes(query) ||
    match.away_team.toLowerCase().includes(query) ||
    String(match.round || "").toLowerCase().includes(query)
  );
}

function renderMatch(match) {
  const saving = state.saving.has(match.match_id);
  const finished = match.status === "finished";

  return `
    <article class="result-card ${finished ? "result-card--finished" : ""}"
      data-result-match="${match.match_id}">
      <div class="result-card__meta">
        <time>${formatKickoff(match.kickoff_at)}</time>
        <span>${finished ? "✓ Scoret" : "Venter"}</span>
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
            value="${match.home_score ?? ""}"
            aria-label="Mål ${match.home_team}"
          />
          <span>–</span>
          <input
            type="number"
            min="0"
            max="30"
            inputmode="numeric"
            data-result-away
            value="${match.away_score ?? ""}"
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
          ${saving ? "Beregner poeng …" : finished ? "Resultat kan oppdateres" : "Klar for resultat"}
        </span>

        <button
          type="button"
          class="button button--primary result-save"
          data-save-result
          ${saving ? "disabled" : ""}
        >
          ${finished ? "Beregn på nytt" : "Lagre og beregn"}
        </button>
      </div>
    </article>
  `;
}

function renderContent() {
  const target = document.querySelector("#results-content");
  if (!target) return;

  const matches = filteredMatches();
  const groups = groupMatches(matches);
  const finishedCount = state.matches.filter((m) => m.status === "finished").length;

  target.innerHTML = `
    <section class="results-toolbar panel">
      <input
        id="result-search"
        type="search"
        value="${state.query}"
        placeholder="Søk etter lag eller runde"
      />

      <div>
        <strong>${finishedCount}/${state.matches.length}</strong>
        <span>ferdigspilt</span>
      </div>
    </section>

    <div class="results-groups">
      ${Object.entries(groups).map(([round, roundMatches]) => `
        <section class="results-group">
          <header>
            <span>Runde</span>
            <h2>${round}</h2>
          </header>

          <div class="results-list">
            ${roundMatches.map(renderMatch).join("")}
          </div>
        </section>
      `).join("")}
    </div>

    ${matches.length ? "" : `
      <div class="tips-empty">Ingen kamper matcher søket.</div>
    `}
  `;

  bindEvents();
}

function setCardMessage(matchId, text, error = false) {
  const status = document
    .querySelector(`[data-result-match="${matchId}"]`)
    ?.querySelector(".result-status");

  if (!status) return;

  status.textContent = text;
  status.classList.toggle("is-error", error);
}

function bindEvents() {
  const search = document.querySelector("#result-search");

  search?.addEventListener("input", () => {
    state.query = search.value;
    renderContent();

    requestAnimationFrame(() => {
      const nextSearch = document.querySelector("#result-search");
      nextSearch?.focus();
      nextSearch?.setSelectionRange(
        nextSearch.value.length,
        nextSearch.value.length
      );
    });
  });

  document.querySelectorAll("[data-save-result]").forEach((button) => {
    button.addEventListener("click", async () => {
      const card = button.closest("[data-result-match]");
      const matchId = card.dataset.resultMatch;
      const home = card.querySelector("[data-result-home]").value;
      const away = card.querySelector("[data-result-away]").value;

      if (home === "" || away === "") {
        setCardMessage(matchId, "Fyll inn begge resultater.", true);
        return;
      }

      state.saving.add(matchId);
      renderContent();

      try {
        const scoredCount = await saveMatchResult({
          matchId,
          homeScore: home,
          awayScore: away,
          finished: true
        });

        state.matches = await getAdminMatches(state.tournament.id);
        state.saving.delete(matchId);
        renderContent();
        setCardMessage(
          matchId,
          `✓ Resultat lagret · ${scoredCount ?? 0} tips beregnet`
        );
      } catch (error) {
        state.saving.delete(matchId);
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

  state = {
    tournament,
    matches,
    query: "",
    saving: new Set()
  };

  window.setTimeout(renderContent, 0);

  return `
    <div class="page">
      <header class="page-header">
        <span>Admin · ${tournament.short_name}</span>
        <h1>Resultatsenter</h1>
        <p>
          Legg inn sluttresultatet. Tips og leaderboard beregnes automatisk.
        </p>
      </header>

      <section id="results-content"></section>
    </div>
  `;
}
