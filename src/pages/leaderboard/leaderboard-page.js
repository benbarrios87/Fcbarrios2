import { getActiveTournament } from "../../repositories/tournament-repository.js";
import { getLeaderboard } from "../../repositories/leaderboard-repository.js";
import { formatPoints, initials } from "../../utils/format.js";

const filters = [
  ["all","Alle"],
  ["bronze","🥉 Bronsepotten"],
  ["silver","🥈 Sølvpotten"],
  ["gold","🥇 Gullpotten"]
];

const tierLabel = (tier) => tier === 800 ? "🥇 Gull" : tier === 500 ? "🥈 Sølv" : tier === 250 ? "🥉 Bronse" : "Ingen pulje";

function eligible(player, filter) {
  if (filter === "all") return true;
  const minimum = filter === "gold" ? 800 : filter === "silver" ? 500 : 250;
  return player.is_paid && Number(player.buy_in_tier || 0) >= minimum;
}

function renderRows(players, filter) {
  const visible = players.filter((player) => eligible(player, filter));
  return visible.length ? visible.map((player, index) => `
    <a href="/profile?id=${player.id}" data-link class="full-leaderboard__row leaderboard-sidepot-row">
      <span class="full-leaderboard__rank">${filter === "all" ? player.rank : index + 1}</span>
      ${player.avatar_url ? `<img class="avatar avatar--large" src="${player.avatar_url}" alt="" />` : `<span class="avatar avatar--large">${initials(player.name)}</span>`}
      <span class="full-leaderboard__person">
        <strong>${player.name}</strong>
        <small>${tierLabel(Number(player.buy_in_tier))}${player.is_paid ? " · ✓ Betalt" : " · Venter"}</small>
      </span>
      <strong>${formatPoints(player.points)} p</strong>
    </a>
  `).join("") : `<div class="tips-empty">Ingen kvalifiserte spillere i denne potten ennå.</div>`;
}

export async function LeaderboardPage() {
  const tournament = await getActiveTournament();
  const players = await getLeaderboard(tournament.id);

  setTimeout(() => {
    const target = document.querySelector("#sidepot-leaderboard-rows");
    document.querySelectorAll("[data-sidepot-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-sidepot-filter]").forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");
        target.innerHTML = renderRows(players, button.dataset.sidepotFilter);
      });
    });
  }, 0);

  return `
    <div class="page">
      <header class="page-header">
        <span>Live</span>
        <h1>Leaderboard</h1>
        <p>Filtrer på premiepott. Høyere nivåer vises også i pottene de har betalt seg inn i.</p>
      </header>

      <nav class="sidepot-filters" aria-label="Premiepottfilter">
        ${filters.map(([value,label],index)=>`<button type="button" data-sidepot-filter="${value}" class="${index===0?"is-active":""}">${label}</button>`).join("")}
      </nav>

      <section class="side-pot-rule panel">
        <strong>Sidepot-modellen</strong>
        <span>Gull vises i Gull, Sølv og Bronse. Sølv vises i Sølv og Bronse. Bronse vises bare i Bronse.</span>
      </section>

      <section id="sidepot-leaderboard-rows" class="full-leaderboard">
        ${renderRows(players,"all")}
      </section>
    </div>
  `;
}
