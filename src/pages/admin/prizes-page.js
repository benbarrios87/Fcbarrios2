import { getAuthSnapshot } from "../../services/auth-service.js";
import { getActiveTournament } from "../../repositories/tournament-repository.js";
import {
  getSidePotOverview,
  calculateSidePotWinners,
  updatePrizePoolSettings
} from "../../repositories/prize-repository.js";

let state = { tournament: null, pools: [], winners: [] };

const icon = { bronze: "🥉", silver: "🥈", gold: "🥇" };
const money = (value) => `${Number(value || 0).toLocaleString("no-NO")} kr`;

function poolEditor(pool) {
  return `
    <article class="prize-admin-card" data-pool="${pool.pool_code}">
      <header>
        <span>${icon[pool.pool_code]}</span>
        <div>
          <h2>${pool.pool_name}</h2>
          <small>${pool.eligible_paid_players} kvalifiserte · ${money(pool.prize_pool)}</small>
        </div>
        <label class="prize-active-toggle">
          <input type="checkbox" data-active ${pool.is_active ? "checked" : ""} /> Aktiv
        </label>
      </header>

      <p class="prize-admin-card__logic">
        ${pool.minimum_tier === 250
          ? "Alle betalte spillere konkurrerer i denne potten."
          : pool.minimum_tier === 500
            ? "Sølv- og Gull-spillere konkurrerer i denne potten."
            : "Bare Gull-spillere konkurrerer i denne potten."}
      </p>

      <div class="prize-percentage-list">
        ${pool.distribution.map((percent, index) => `
          <label>
            <span>${index + 1}. plass</span>
            <input type="number" min="0" max="100" step="1" data-percentage value="${percent}" />
            <small>%</small>
          </label>
        `).join("")}
      </div>

      <div class="prize-admin-card__footer">
        <span data-total>Totalt: 100%</span>
        <button class="button button--primary" type="button" data-save>Lagre</button>
      </div>
      <small class="prize-admin-message" aria-live="polite"></small>
    </article>
  `;
}

function winnerPreview() {
  return `
    <section class="panel prize-preview">
      <div class="section-heading"><div><span>Live beregning</span><h2>Premievinnere akkurat nå</h2></div></div>
      <p class="prize-preview__note">
        Hver pott beregnes uavhengig. Samme spiller kan derfor vinne i flere potter.
      </p>
      ${state.winners.length
        ? `<div class="prize-preview-list">${state.winners.map((winner) => `
            <article>
              <span>${icon[winner.pool_code]}</span>
              <strong>${winner.pool_name} · ${winner.prize_place}. plass</strong>
              <b>${winner.display_name}</b>
              <small>#${winner.leaderboard_rank} totalt · ${money(winner.prize_amount)}</small>
            </article>
          `).join("")}</div>`
        : `<div class="tips-empty">Ingen vinnere kan beregnes ennå.</div>`}
    </section>
  `;
}

function render() {
  const target = document.querySelector("#prizes-content");
  if (!target) return;
  target.innerHTML = `
    <section class="side-pot-explainer panel">
      <h2>Slik fungerer sidepottene</h2>
      <p>Alle betaler 250 kr inn i Bronsepotten. Sølv legger 250 kr ekstra i Sølvpotten. Gull legger ytterligere 300 kr i Gullpotten.</p>
      <div>
        <span>🥉 Bronse: alle</span>
        <span>🥈 Sølv: Sølv + Gull</span>
        <span>🥇 Gull: bare Gull</span>
      </div>
    </section>
    <section class="prize-admin-grid">${state.pools.map(poolEditor).join("")}</section>
    ${winnerPreview()}
  `;
  bindEvents();
}

async function refresh() {
  [state.pools, state.winners] = await Promise.all([
    getSidePotOverview(state.tournament.id),
    calculateSidePotWinners(state.tournament.id)
  ]);
}

function bindEvents() {
  document.querySelectorAll("[data-pool]").forEach((card) => {
    const inputs = [...card.querySelectorAll("[data-percentage]")];
    const totalLabel = card.querySelector("[data-total]");
    const message = card.querySelector(".prize-admin-message");
    const button = card.querySelector("[data-save]");

    const updateTotal = () => {
      const total = inputs.reduce((sum, input) => sum + Number(input.value || 0), 0);
      totalLabel.textContent = `Totalt: ${total}%`;
      totalLabel.classList.toggle("is-error", total !== 100);
    };

    inputs.forEach((input) => input.addEventListener("input", updateTotal));

    button.addEventListener("click", async () => {
      const distribution = inputs.map((input) => Number(input.value || 0));
      if (distribution.reduce((sum, value) => sum + value, 0) !== 100) {
        message.textContent = "Fordelingen må bli 100%.";
        message.classList.add("is-error");
        return;
      }

      button.disabled = true;
      button.textContent = "Lagrer …";
      try {
        await updatePrizePoolSettings({
          tournamentId: state.tournament.id,
          poolCode: card.dataset.pool,
          distribution,
          isActive: card.querySelector("[data-active]").checked
        });
        await refresh();
        render();
      } catch (error) {
        message.textContent = error.message;
        message.classList.add("is-error");
      }
    });
  });
}

export async function PrizesPage() {
  const auth = getAuthSnapshot();
  if (!auth.isAdmin) {
    return `<div class="page"><section class="access-card"><span>⛔</span><h1>Ingen tilgang</h1><a class="button button--ghost" href="/" data-link>Til forsiden</a></section></div>`;
  }

  const tournament = await getActiveTournament();
  const [pools, winners] = await Promise.all([
    getSidePotOverview(tournament.id),
    calculateSidePotWinners(tournament.id)
  ]);

  state = { tournament, pools, winners };
  setTimeout(render, 0);

  return `
    <div class="page">
      <header class="page-header">
        <span>Admin · Sidepotter</span>
        <h1>Premiemotor</h1>
        <p>Hver pott deles ut uavhengig. En Gull-spiller kan vinne Gull, Sølv og Bronse.</p>
      </header>
      <section id="prizes-content"></section>
    </div>
  `;
}
