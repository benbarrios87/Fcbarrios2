import { getActiveTournament } from "../../repositories/tournament-repository.js";
import { getTournamentRounds, getMatchesForRound } from "../../repositories/matches-repository.js";
import { getMyPredictions, savePrediction } from "../../repositories/predictions-repository.js";
import {
  getActiveScoreRules,
  getMyMatchBonusPicks,
  setMatchBonusPick,
  getPossiblePoints
} from "../../repositories/tips-extras-repository.js";
import { getAuthSnapshot } from "../../services/auth-service.js";
import { formatKickoff } from "../../utils/format.js";

let state = {
  tournament: null,
  rounds: [],
  selectedRoundId: null,
  matches: [],
  predictions: new Map(),
  bonusPicks: new Map(),
  scoreRules: [],
  saving: new Set(),
  timers: new Map()
};

const bonusKey = (matchId, code) => `${matchId}:${code}`;

function isOpen(match, round) {
  if (match.status !== "scheduled" || round?.status !== "open") return false;
  const deadline = match.tipping_closes_at || round?.closes_at || match.kickoff_at;
  return deadline ? Date.now() < new Date(deadline).getTime() : true;
}

function tier(number) {
  return `<span class="tips-tier tips-tier--${number}">T${number}</span>`;
}

function pointsBlock(match, prediction) {
  const points = getPossiblePoints(match, prediction, state.scoreRules);

  if (!points) {
    return `<div class="possible-points possible-points--empty">
      <span>Mulige poeng</span>
      <small>Fyll inn et tips for å se hva som står på spill.</small>
    </div>`;
  }

  const label = {
    favorite: "Favoritt",
    draw: "Uavgjort",
    underdog: "Underdog"
  }[points.selectionType];

  return `<div class="possible-points">
    <div><span>Mulige poeng</span><small>${label}</small></div>
    <b><em>Utfall</em>${points.outcome}</b>
    <b><em>Diff</em>${points.difference}</b>
    <b><em>Eksakt</em>${points.exact}</b>
  </div>`;
}

function renderTabs() {
  return `<div class="tips-rounds">
    ${state.rounds.map((round) => `
      <button type="button"
        class="${round.id === state.selectedRoundId ? "is-active" : ""}"
        data-round-id="${round.id}">
        ${round.name}
        <small>${round.status === "open" ? "Åpen" : round.status}</small>
      </button>`).join("")}
  </div>`;
}

function renderMatch(match) {
  const round = state.rounds.find((item) => item.id === match.round_id);
  const prediction = state.predictions.get(match.id);
  const open = isOpen(match, round);
  const saving = state.saving.has(match.id);
  const rich = state.bonusPicks.get(bonusKey(match.id, "goal-rich")) === true;
  const poor = state.bonusPicks.get(bonusKey(match.id, "goal-poor")) === true;

  return `<article class="tips-match ${open ? "" : "tips-match--locked"}" data-match-id="${match.id}">
    <div class="tips-match__meta">
      <span>${match.round || round?.name || "Kamp"}</span>
      <time>${formatKickoff(match.kickoff_at)}</time>
    </div>

    <div class="tips-match__teams">
      <div>${tier(match.home_tier)}<strong>${match.home_team}</strong></div>
      <div class="tips-score">
        <input type="number" min="0" max="30" inputmode="numeric"
          data-score-home value="${prediction?.home_score ?? ""}" ${open ? "" : "disabled"} />
        <span>–</span>
        <input type="number" min="0" max="30" inputmode="numeric"
          data-score-away value="${prediction?.away_score ?? ""}" ${open ? "" : "disabled"} />
      </div>
      <div><strong>${match.away_team}</strong>${tier(match.away_tier)}</div>
    </div>

    ${pointsBlock(match, prediction)}

    <div class="match-bonus-picks">
      <label class="${rich ? "is-selected" : ""}">
        <input type="checkbox" data-match-bonus="goal-rich"
          ${rich ? "checked" : ""} ${open ? "" : "disabled"} />
        <span>🔥 Målrik</span><small>4 mål eller mer</small>
      </label>
      <label class="${poor ? "is-selected" : ""}">
        <input type="checkbox" data-match-bonus="goal-poor"
          ${poor ? "checked" : ""} ${open ? "" : "disabled"} />
        <span>🧊 Målfattig</span><small>0–1 mål</small>
      </label>
    </div>

    <div class="tips-match__footer">
      <span class="tips-match__status">
        ${saving ? "Lagrer …" : !open ? "🔒 Tips stengt" : prediction ? "✓ Lagret" : "Ikke lagret"}
      </span>
    </div>
  </article>`;
}

function selectedCount(code) {
  return Array.from(state.bonusPicks.entries())
    .filter(([key, selected]) => selected && key.endsWith(`:${code}`)).length;
}

function renderContent() {
  const target = document.querySelector("#tips-content");
  if (!target) return;

  target.innerHTML = `
    ${renderTabs()}
    <div class="tips-summary tips-summary--extended">
      <span><strong>${state.predictions.size}</strong> lagrede tips</span>
      <span><strong>${selectedCount("goal-rich")}/5</strong> målrike</span>
      <span><strong>${selectedCount("goal-poor")}/5</strong> målfattige</span>
    </div>
    <div class="tips-match-list">
      ${state.matches.length ? state.matches.map(renderMatch).join("") :
        `<div class="tips-empty">Ingen kamper er lagt inn i denne runden ennå.</div>`}
    </div>`;

  bindEvents();
}

async function selectRound(roundId) {
  state.selectedRoundId = roundId;
  state.matches = await getMatchesForRound(state.tournament.id, roundId);
  renderContent();
}

function scheduleSave(matchId, home, away) {
  const oldTimer = state.timers.get(matchId);
  if (oldTimer) window.clearTimeout(oldTimer);

  state.timers.set(matchId, window.setTimeout(async () => {
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
      const status = document.querySelector(`[data-match-id="${matchId}"] .tips-match__status`);
      if (status) {
        status.textContent = error.message;
        status.classList.add("is-error");
      }
      return;
    }

    state.saving.delete(matchId);
    state.timers.delete(matchId);
    renderContent();
  }, 650));
}

function bindEvents() {
  document.querySelectorAll("[data-round-id]").forEach((button) => {
    button.addEventListener("click", () => selectRound(button.dataset.roundId));
  });

  document.querySelectorAll("[data-match-id]").forEach((card) => {
    const matchId = card.dataset.matchId;
    const homeInput = card.querySelector("[data-score-home]");
    const awayInput = card.querySelector("[data-score-away]");

    [homeInput, awayInput].forEach((input) => {
      input?.addEventListener("input", () => {
        if (homeInput.value === "" || awayInput.value === "") return;
        state.predictions.set(matchId, {
          match_id: matchId,
          home_score: Number(homeInput.value),
          away_score: Number(awayInput.value)
        });
        scheduleSave(matchId, homeInput.value, awayInput.value);
      });
    });

    card.querySelectorAll("[data-match-bonus]").forEach((checkbox) => {
      checkbox.addEventListener("change", async () => {
        const code = checkbox.dataset.matchBonus;
        const selected = checkbox.checked;
        const otherCode = code === "goal-rich" ? "goal-poor" : "goal-rich";

        try {
          await setMatchBonusPick(matchId, code, selected);
          state.bonusPicks.set(bonusKey(matchId, code), selected);
          if (selected) state.bonusPicks.set(bonusKey(matchId, otherCode), false);
          renderContent();
        } catch (error) {
          checkbox.checked = !selected;
          const status = card.querySelector(".tips-match__status");
          status.textContent = error.message;
          status.classList.add("is-error");
        }
      });
    });
  });
}

export async function TipsPage() {
  const auth = getAuthSnapshot();

  if (!auth.isAuthenticated) {
    return `<div class="page"><section class="access-card">
      <span>⚽</span><h1>Logg inn for å tippe</h1>
      <p>Tipsene kobles til spillerkontoen din og følger deg på alle enheter.</p>
      <a class="button button--primary" href="/login" data-link>Logg inn</a>
    </section></div>`;
  }

  const tournament = await getActiveTournament();
  const [rounds, predictions, scoreRules, bonusPicks] = await Promise.all([
    getTournamentRounds(tournament.id),
    getMyPredictions(tournament.id),
    getActiveScoreRules(tournament.id),
    getMyMatchBonusPicks(tournament.id)
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
    bonusPicks: new Map(bonusPicks.map((item) => [bonusKey(item.match_id, item.bonus_code), true])),
    scoreRules,
    saving: new Set(),
    timers: new Map()
  };

  window.setTimeout(renderContent, 0);

  return `<div class="page tips-page">
    <header class="page-header">
      <span>${tournament.short_name}</span>
      <h1>Mine tips</h1>
      <p>Tipsene lagres automatisk. Velg opptil fem målrike og fem målfattige kamper.</p>
    </header>
    <section id="tips-content" class="tips-content"></section>
  </div>`;
}
