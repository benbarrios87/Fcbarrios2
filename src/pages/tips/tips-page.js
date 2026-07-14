import { getActiveTournament } from "../../repositories/tournament-repository.js";
import { getTournamentRounds, getMatchesForRound } from "../../repositories/matches-repository.js";
import { getMyPredictions, savePrediction } from "../../repositories/predictions-repository.js";
import { getAuthSnapshot } from "../../services/auth-service.js";
import { formatKickoff } from "../../utils/format.js";

let state = {
  tournament: null,
  rounds: [],
  selectedRoundId: null,
  matches: [],
  predictions: new Map(),
  saving: new Set()
};

function isOpen(match, round) {
  if (match.status !== "scheduled" || round?.status !== "open") return false;
  const deadline = match.tipping_closes_at || round?.closes_at || match.kickoff_at;
  return deadline ? Date.now() < new Date(deadline).getTime() : true;
}

function tier(tierNumber) {
  return `<span class="tips-tier tips-tier--${tierNumber}">T${tierNumber}</span>`;
}

function renderTabs() {
  return `
    <div class="tips-rounds">
      ${state.rounds.map((round) => `
        <button type="button"
          class="${round.id === state.selectedRoundId ? "is-active" : ""}"
          data-round-id="${round.id}">
          ${round.name}
          <small>${round.status === "open" ? "Åpen" : round.status}</small>
        </button>
      `).join("")}
    </div>
  `;
}

function renderMatch(match) {
  const round = state.rounds.find((item) => item.id === match.round_id);
  const prediction = state.predictions.get(match.id);
  const open = isOpen(match, round);
  const saving = state.saving.has(match.id);

  return `
    <article class="tips-match ${open ? "" : "tips-match--locked"}"
      data-match-id="${match.id}">
      <div class="tips-match__meta">
        <span>${match.round || round?.name || "Kamp"}</span>
        <time>${formatKickoff(match.kickoff_at)}</time>
      </div>

      <div class="tips-match__teams">
        <div>${tier(match.home_tier)}<strong>${match.home_team}</strong></div>
        <div class="tips-score">
          <input type="number" min="0" max="30" inputmode="numeric"
            data-score-home value="${prediction?.home_score ?? ""}"
            ${open ? "" : "disabled"} />
          <span>–</span>
          <input type="number" min="0" max="30" inputmode="numeric"
            data-score-away value="${prediction?.away_score ?? ""}"
            ${open ? "" : "disabled"} />
        </div>
        <div><strong>${match.away_team}</strong>${tier(match.away_tier)}</div>
      </div>

      <div class="tips-match__footer">
        <span class="tips-match__status">
          ${saving ? "Lagrer …" : !open ? "🔒 Tips stengt" : prediction ? "✓ Lagret" : "Ikke lagret"}
        </span>
        <button type="button" class="button button--primary tips-save"
          data-save-prediction ${open && !saving ? "" : "disabled"}>
          ${prediction ? "Oppdater tips" : "Lagre tips"}
        </button>
      </div>
    </article>
  `;
}

function renderContent() {
  const target = document.querySelector("#tips-content");
  if (!target) return;

  target.innerHTML = `
    ${renderTabs()}
    <div class="tips-summary">
      <span><strong>${state.predictions.size}</strong> lagrede tips</span>
      <span><strong>${state.matches.length}</strong> kamper i runden</span>
    </div>
    <div class="tips-match-list">
      ${state.matches.length ? state.matches.map(renderMatch).join("") :
        `<div class="tips-empty">Ingen kamper er lagt inn i denne runden ennå.</div>`}
    </div>
  `;

  bindEvents();
}

async function selectRound(roundId) {
  state.selectedRoundId = roundId;
  state.matches = await getMatchesForRound(state.tournament.id, roundId);
  renderContent();
}

function bindEvents() {
  document.querySelectorAll("[data-round-id]").forEach((button) => {
    button.addEventListener("click", () => selectRound(button.dataset.roundId));
  });

  document.querySelectorAll("[data-save-prediction]").forEach((button) => {
    button.addEventListener("click", async () => {
      const card = button.closest("[data-match-id]");
      const matchId = card.dataset.matchId;
      const home = card.querySelector("[data-score-home]").value;
      const away = card.querySelector("[data-score-away]").value;

      if (home === "" || away === "") {
        const status = card.querySelector(".tips-match__status");
        status.textContent = "Fyll inn begge resultater.";
        status.classList.add("is-error");
        return;
      }

      state.saving.add(matchId);
      renderContent();

      try {
        await savePrediction(matchId, home, away);
        state.predictions.set(matchId, {
          match_id: matchId,
          home_score: Number(home),
          away_score: Number(away)
        });
      } catch (error) {
        state.saving.delete(matchId);
        renderContent();
        const status = document
          .querySelector(`[data-match-id="${matchId}"]`)
          ?.querySelector(".tips-match__status");
        if (status) {
          status.textContent = error.message;
          status.classList.add("is-error");
        }
        return;
      }

      state.saving.delete(matchId);
      renderContent();
    });
  });
}

export async function TipsPage() {
  const auth = getAuthSnapshot();

  if (!auth.isAuthenticated) {
    return `
      <div class="page">
        <section class="access-card">
          <span>⚽</span>
          <h1>Logg inn for å tippe</h1>
          <p>Tipsene kobles til spillerkontoen din og følger deg på alle enheter.</p>
          <a class="button button--primary" href="/login" data-link>Logg inn</a>
        </section>
      </div>
    `;
  }

  const tournament = await getActiveTournament();
  const [rounds, predictions] = await Promise.all([
    getTournamentRounds(tournament.id),
    getMyPredictions(tournament.id)
  ]);

  const selectedRound = rounds.find((round) => round.status === "open") || rounds[0];
  const matches = selectedRound
    ? await getMatchesForRound(tournament.id, selectedRound.id)
    : [];

  state = {
    tournament,
    rounds,
    selectedRoundId: selectedRound?.id ?? null,
    matches,
    predictions: new Map(predictions.map((item) => [item.match_id, item])),
    saving: new Set()
  };

  window.setTimeout(renderContent, 0);

  return `
    <div class="page tips-page">
      <header class="page-header">
        <span>${tournament.short_name}</span>
        <h1>Mine tips</h1>
        <p>Tipsene lagres direkte på kontoen din og kan endres frem til fristen.</p>
      </header>
      <section id="tips-content" class="tips-content"></section>
    </div>
  `;
}
