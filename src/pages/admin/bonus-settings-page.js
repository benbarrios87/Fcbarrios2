import { getAuthSnapshot } from "../../services/auth-service.js";
import { getActiveTournament } from "../../repositories/tournament-repository.js";
import {
  getBonusGames,
  updateBonusGame
} from "../../repositories/bonus-repository.js";

let state = {
  tournament: null,
  games: []
};

function renderGame(game) {
  return `
    <article class="bonus-admin-card panel" data-admin-bonus="${game.id}">
      <div class="section-heading">
        <div>
          <span>${game.code}</span>
          <h2>${game.name}</h2>
        </div>
      </div>

      <div class="bonus-admin-fields">
        <label>
          <span>Total pott</span>
          <input
            type="number"
            min="0"
            step="1"
            value="${game.total_budget ?? 0}"
            data-field="total_budget"
          />
        </label>

        <label>
          <span>Maks per kandidat</span>
          <input
            type="number"
            min="0"
            step="1"
            value="${game.max_per_candidate ?? ""}"
            data-field="max_per_candidate"
          />
        </label>

        <label>
          <span>Maks valg</span>
          <input
            type="number"
            min="0"
            step="1"
            value="${game.max_selections ?? ""}"
            data-field="max_selections"
          />
        </label>

        <label>
          <span>Påkrevde valg</span>
          <input
            type="number"
            min="0"
            step="1"
            value="${game.required_selections ?? ""}"
            data-field="required_selections"
          />
        </label>

        <label>
          <span>Poeng per treff</span>
          <input
            type="number"
            min="0"
            step="0.25"
            value="${game.base_points ?? 0}"
            data-field="base_points"
          />
        </label>

        <label>
          <span>Terskel</span>
          <input
            type="number"
            min="0"
            step="1"
            value="${game.threshold_value ?? ""}"
            data-field="threshold_value"
          />
        </label>
      </div>

      <button
        class="button button--primary button--full"
        type="button"
        data-save-admin-bonus="${game.id}"
      >
        Lagre ${game.name}
      </button>

      <div class="bonus-message" data-admin-bonus-message="${game.id}"></div>
    </article>
  `;
}

function renderContent() {
  const target = document.querySelector("#bonus-admin-content");
  if (!target) return;

  target.innerHTML = `
    <div class="bonus-admin-grid">
      ${state.games.map(renderGame).join("")}
    </div>
  `;

  bindEvents();
}

function parseNullableNumber(value) {
  if (value === "") return null;
  return Number(value);
}

function bindEvents() {
  document.querySelectorAll("[data-save-admin-bonus]").forEach((button) => {
    button.addEventListener("click", async () => {
      const gameId = button.dataset.saveAdminBonus;
      const card = button.closest("[data-admin-bonus]");
      const fields = {};

      card.querySelectorAll("[data-field]").forEach((input) => {
        fields[input.dataset.field] = parseNullableNumber(input.value);
      });

      const message = card.querySelector("[data-admin-bonus-message]");

      button.disabled = true;
      button.textContent = "Lagrer …";

      try {
        const updated = await updateBonusGame(gameId, fields);
        state.games = state.games.map((game) =>
          game.id === gameId ? { ...game, ...updated } : game
        );
        message.className = "bonus-message bonus-message--success";
        message.textContent = "Innstillingene er lagret.";
      } catch (error) {
        message.className = "bonus-message bonus-message--error";
        message.textContent = error.message;
      } finally {
        button.disabled = false;
        button.textContent = "Lagre";
      }
    });
  });
}

export async function BonusSettingsPage() {
  const auth = getAuthSnapshot();

  if (!auth.isAdmin) {
    return `
      <div class="page">
        <section class="access-card">
          <span>⛔</span>
          <h1>Ingen tilgang</h1>
          <p>Bonusinnstillinger kan bare endres av admin eller owner.</p>
          <a class="button button--ghost" href="/" data-link>Til forsiden</a>
        </section>
      </div>
    `;
  }

  const tournament = await getActiveTournament();
  const games = await getBonusGames(tournament.id);

  state = { tournament, games };
  window.setTimeout(renderContent, 0);

  return `
    <div class="page">
      <header class="page-header">
        <span>Admin · ${tournament.short_name}</span>
        <h1>Bonusmotor</h1>
        <p>
          Endre poengpotter, antall valg og terskler uten kode.
        </p>
      </header>

      <section id="bonus-admin-content"></section>
    </div>
  `;
}
