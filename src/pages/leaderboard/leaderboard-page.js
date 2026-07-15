import { getActiveTournament } from "../../repositories/tournament-repository.js";
import { getLeaderboard } from "../../repositories/leaderboard-repository.js";
import { getAuthSnapshot } from "../../services/auth-service.js";
import { formatPoints, initials } from "../../utils/format.js";

const tierMeta = {
  250: { label: "Bronse", icon: "🥉", className: "bronze" },
  500: { label: "Sølv", icon: "🥈", className: "silver" },
  800: { label: "Gull", icon: "🥇", className: "gold" }
};

let state = {
  players: [],
  filter: "all",
  currentPlayerId: null
};

function movement(value) {
  const number = Number(value || 0);
  if (number > 0) return `<span class="lb2-movement lb2-movement--up">↑${number}</span>`;
  if (number < 0) return `<span class="lb2-movement lb2-movement--down">↓${Math.abs(number)}</span>`;
  return `<span class="lb2-movement">–</span>`;
}

function avatar(player) {
  return player.avatar_url
    ? `<img class="lb2-avatar" src="${player.avatar_url}" alt="" />`
    : `<span class="lb2-avatar lb2-avatar--fallback">${initials(player.name)}</span>`;
}

function tierBadge(player) {
  const meta = tierMeta[Number(player.buy_in_tier)];
  if (!meta) return `<span class="lb2-tier lb2-tier--none">Ingen pulje</span>`;

  return `<span class="lb2-tier lb2-tier--${meta.className}">${meta.icon} ${meta.label}</span>`;
}

function qualification(player) {
  const tier = Number(player.buy_in_tier);
  if (tier === 800) return "Gull, Sølv og Bronse";
  if (tier === 500) return "Sølv og Bronse";
  if (tier === 250) return "Bronse";
  return "Ingen premiepott valgt";
}

function paymentBadge(player) {
  return player.is_paid
    ? `<span class="lb2-paid">✓ Betalt</span>`
    : `<span class="lb2-unpaid">Venter på betaling</span>`;
}

function podiumClass(rank) {
  if (Number(rank) === 1) return " lb2-row--first";
  if (Number(rank) === 2) return " lb2-row--second";
  if (Number(rank) === 3) return " lb2-row--third";
  return "";
}

function filteredPlayers() {
  if (state.filter === "all") return state.players;
  if (state.filter === "paid") return state.players.filter((player) => player.is_paid);
  return state.players.filter((player) => Number(player.buy_in_tier) === Number(state.filter));
}

function playerRow(player) {
  const isMe = player.id === state.currentPlayerId;

  return `
    <a
      href="/profile?id=${player.id}"
      data-link
      class="lb2-row${podiumClass(player.rank)}${isMe ? " lb2-row--me" : ""}"
    >
      <span class="lb2-rank">${player.rank}</span>
      ${avatar(player)}

      <span class="lb2-person">
        <span class="lb2-person__name">
          <strong>${player.name}</strong>
          ${isMe ? `<em>Deg</em>` : ""}
        </span>
        <span class="lb2-badges">
          ${tierBadge(player)}
          ${paymentBadge(player)}
        </span>
        <small>Kvalifisert til: ${qualification(player)}</small>
      </span>

      <span class="lb2-form">
        <small>Siste kamp</small>
        <strong>+${formatPoints(player.last_match_points)}</strong>
      </span>

      ${movement(player.movement)}

      <span class="lb2-points">
        <strong>${formatPoints(player.points)}</strong>
        <small>poeng</small>
      </span>
    </a>
  `;
}

function render() {
  const target = document.querySelector("#leaderboard-2-content");
  if (!target) return;

  const players = filteredPlayers();

  target.innerHTML = `
    <div class="lb2-filter" role="group" aria-label="Filtrer leaderboard">
      ${[
        ["all", "Alle"],
        ["800", "🥇 Gull"],
        ["500", "🥈 Sølv"],
        ["250", "🥉 Bronse"],
        ["paid", "✓ Betalt"]
      ].map(([value, label]) => `
        <button type="button" data-lb-filter="${value}"
          class="${state.filter === value ? "is-active" : ""}">${label}</button>
      `).join("")}
    </div>

    <section class="lb2-list">
      ${players.length
        ? players.map(playerRow).join("")
        : `<div class="lb2-empty">Ingen spillere i dette filteret.</div>`}
    </section>
  `;

  target.querySelectorAll("[data-lb-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.lbFilter;
      render();
    });
  });
}

export async function LeaderboardPage() {
  const tournament = await getActiveTournament();
  const players = await getLeaderboard(tournament.id);
  const auth = getAuthSnapshot();

  state = {
    players,
    filter: "all",
    currentPlayerId: auth.player?.player_id ?? null
  };

  window.setTimeout(render, 0);

  return `
    <div class="page leaderboard-2-page">
      <header class="page-header leaderboard-2-header">
        <span>Live</span>
        <h1>Leaderboard</h1>
        <p>${players.length} spillere kjemper om FC Barrios-tittelen.</p>
      </header>
      <section id="leaderboard-2-content"></section>
    </div>
  `;
}
