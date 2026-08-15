import { getTournamentBySlug } from "../../repositories/tournament-repository.js";
import { getLeaderboard } from "../../repositories/leaderboard-repository.js";
import { formatPoints, initials } from "../../utils/format.js";

const TOURNAMENT_SLUG = "know-your-club-2026";

function renderRow(player, index) {
  return `
    <a href="/profile?id=${player.id}" data-link class="full-leaderboard__row">
      <span class="full-leaderboard__rank">${index + 1}</span>
      ${player.avatar_url ? `<img class="avatar avatar--large" src="${player.avatar_url}" alt="" />` : `<span class="avatar avatar--large">${initials(player.name)}</span>`}
      <span class="full-leaderboard__person">
        <strong>${player.name}</strong>
      </span>
      <strong>${formatPoints(player.points)} p</strong>
    </a>
  `;
}

export async function ClubLeaderboardPage(preloadedTournament) {
  const tournament = preloadedTournament ?? (await getTournamentBySlug(TOURNAMENT_SLUG));
  const players = await getLeaderboard(tournament.id);

  return `
    <div class="page">
      <header class="page-header">
        <span>${tournament.short_name}</span>
        <h1>Leaderboard</h1>
        <p>Alle klubber konkurrerer på samme liste — uansett hvilket lag du følger.</p>
      </header>

      <section class="full-leaderboard">
        ${players.length
          ? players.map(renderRow).join("")
          : `<div class="tips-empty">Ingen poeng er registrert ennå.</div>`}
      </section>
    </div>
  `;
}
