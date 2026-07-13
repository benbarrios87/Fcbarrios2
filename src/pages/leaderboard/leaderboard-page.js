import { getActiveTournament } from "../../repositories/tournament-repository.js";
import { getLeaderboard } from "../../repositories/leaderboard-repository.js";
import { formatPoints, initials } from "../../utils/format.js";

export async function LeaderboardPage() {
  const tournament = await getActiveTournament();
  const players = await getLeaderboard(tournament.id);

  return `
    <div class="page">
      <header class="page-header">
        <span>Live</span>
        <h1>Leaderboard</h1>
        <p>${players.length} spillere kjemper om FC Barrios-tittelen.</p>
      </header>
      <section class="full-leaderboard">
        ${players
          .map(
            (player) => `
              <a href="/profile?id=${player.id}" data-link class="full-leaderboard__row">
                <span class="full-leaderboard__rank">${player.rank}</span>
                <span class="avatar avatar--large">${initials(player.name)}</span>
                <span class="full-leaderboard__person">
                  <strong>${player.name}</strong>
                  <small>${player.exact_hits} eksakte · form ${formatPoints(player.form_points)}</small>
                </span>
                <strong>${formatPoints(player.points)} p</strong>
              </a>
            `
          )
          .join("")}
      </section>
    </div>
  `;
}
