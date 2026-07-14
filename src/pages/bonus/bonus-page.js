import { getAuthSnapshot } from "../../services/auth-service.js";
import { getActiveTournament } from "../../repositories/tournament-repository.js";
import {
  getBonusGames,
  getMyBonusEntries,
  saveBonusEntries
} from "../../repositories/bonus-repository.js";

let state = {
  tournament: null,
  games: [],
  entries: new Map()
};

function entryKey(gameId, candidateId) {
  return `${gameId}:${candidateId}`;
}

function currentStake(gameId, candidateId) {
  return Number(state.entries.get(entryKey(gameId, candidateId)) || 0);
}

function remainingBudget(game) {
  const used = game.candidates.reduce(
    (sum, candidate) => sum + currentStake(game.id, candidate.id),
    0
  );
  return Number(game.total_budget || 0) - used;
}

function renderCandidate(game, candidate) {
  const stake = currentStake(game.id, candidate.id);

  if (game.game_type === "allocation") {
    return `
      <label class="bonus-candidate">
        <div>
          <strong>${candidate.label}</strong>
          <small>
            ${candidate.tier ? `Tier ${candidate.tier} · ` : ""}
            ×${Number(candidate.multiplier).toLocaleString("no-NO")}
          </small>
        </div>

        <input
          type="number"
          min="0"
          max="${game.max_per_candidate ?? game.total_budget}"
          step="1"
          value="${stake || ""}"
          data-bonus-input
          data-game-id="${game.id}"
          data-candidate-id="${candidate.id}"
        />
      </label>
    `;
  }

  return `
    <label class="bonus-candidate bonus-candidate--check">
      <div>
        <strong>${candidate.label}</strong>
        <small>
          ${candidate.tier ? `Tier ${candidate.tier}` : ""}
        </small>
      </div>

      <input
        type="checkbox"
        ${stake > 0 ? "checked" : ""}
        data-bonus-check
        data-game-id="${game.id}"
        data-candidate-id="${candidate.id}"
      />
    </label>
  `;
}

function renderGame(game) {
  const remaining = remainingBudget(game);

  return `
    <article class="bonus-game panel" data-bonus-game="${game.id}">
      <div class="section-heading">
        <div>
          <span>${game.game_type === "allocation" ? "Fordeling" : "Valg"}</span>
          <h2>${game.name}</h2>
        </div>

        ${
          game.game_type === "allocation"
            ? `
              <strong class="bonus-budget">
                ${remaining} av ${game.total_budget} igjen
              </strong>
            `
            : `
              <strong class="bonus-budget">
                Velg ${game.required_selections ?? game.max_selections}
              </strong>
            `
        }
      </div>

      <div class="bonus-candidate-list">
        ${
          game.candidates.length
            ? game.candidates.map((candidate) =>
                renderCandidate(game, candidate)
              ).join("")
            : `
              <div class="home-empty-state">
                <span>🧩</span>
                <strong>Kandidater kommer</strong>
                <small>Admin legger inn lag, spillere eller kamper.</small>
              </div>
            `
        }
      </div>

      <button
        class="button button--primary button--full"
        type="button"
        data-save-bonus="${game.id}"
        ${game.candidates.length ? "" : "disabled"}
      >
        Lagre ${game.name}
      </button>

      <div class="bonus-message" data-bonus-message="${game.id}"></div>
    </article>
  `;
}

function renderContent() {
  const target = document.querySelector("#bonus-content");
  if (!target) return;

  target.innerHTML = `
    <div class="bonus-grid">
      ${state.games.map(renderGame).join("")}
    </div>
  `;

  bindEvents();
}

function setMessage(gameId, text, type = "") {
  const message = document.querySelector(`[data-bonus-message="${gameId}"]`);
  if (!message) return;

  message.className = `bonus-message ${type ? `bonus-message--${type}` : ""}`;
  message.textContent = text;
}

function collectGameEntries(game) {
  return game.candidates
    .map((candidate) => ({
      candidate_id: candidate.id,
      stake: currentStake(game.id, candidate.id)
    }))
    .filter((entry) => entry.stake > 0);
}

function bindEvents() {
  document.querySelectorAll("[data-bonus-input]").forEach((input) => {
    input.addEventListener("input", () => {
      state.entries.set(
        entryKey(input.dataset.gameId, input.dataset.candidateId),
        Number(input.value || 0)
      );
      renderContent();
    });
  });

  document.querySelectorAll("[data-bonus-check]").forEach((input) => {
    input.addEventListener("change", () => {
      state.entries.set(
        entryKey(input.dataset.gameId, input.dataset.candidateId),
        input.checked ? 1 : 0
      );
    });
  });

  document.querySelectorAll("[data-save-bonus]").forEach((button) => {
    button.addEventListener("click", async () => {
      const gameId = button.dataset.saveBonus;
      const game = state.games.find((item) => item.id === gameId);

      button.disabled = true;
      button.textContent = "Lagrer …";

      try {
        const entries = collectGameEntries(game);
        await saveBonusEntries(gameId, entries);
        setMessage(gameId, "Bonusvalgene er lagret.", "success");
      } catch (error) {
        setMessage(gameId, error.message, "error");
      } finally {
        button.disabled = false;
        button.textContent = `Lagre ${game.name}`;
      }
    });
  });
}

export async function BonusPage() {
  const auth = getAuthSnapshot();

  if (!auth.isAuthenticated) {
    return `
      <div class="page">
        <section class="access-card">
          <span>🎯</span>
          <h1>Logg inn først</h1>
          <p>Bonusvalgene må kobles til spillerkontoen din.</p>
          <a class="button button--primary" href="/login" data-link>
            Logg inn
          </a>
        </section>
      </div>
    `;
  }

  const tournament = await getActiveTournament();
  const [games, savedEntries] = await Promise.all([
    getBonusGames(tournament.id),
    getMyBonusEntries(tournament.id)
  ]);

  state = {
    tournament,
    games,
    entries: new Map(
      savedEntries.map((entry) => [
        entryKey(entry.bonus_game_id, entry.candidate_id),
        Number(entry.stake)
      ])
    )
  };

  window.setTimeout(renderContent, 0);

  return `
    <div class="page">
      <header class="page-header">
        <span>${tournament.short_name}</span>
        <h1>Bonusspill</h1>
        <p>
          Fordel poeng på Toppscorer, Best Player og Road to Glory,
          og lever de øvrige bonusvalgene.
        </p>
      </header>

      <section id="bonus-content"></section>
    </div>
  `;
}
