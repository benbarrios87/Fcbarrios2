import { getActiveTournament } from "../../repositories/tournament-repository.js";
import { getProfile } from "../../repositories/profile-repository.js";
import { formatPoints, initials } from "../../utils/format.js";

function stat(label, value) {
  return `<div><strong>${value}</strong><span>${label}</span></div>`;
}

export async function ProfilePage() {
  const tournament = await getActiveTournament();
  const playerId = new URLSearchParams(window.location.search).get("id");
  const player = await getProfile(playerId, tournament.id);

  return `
    <div class="page">
      <header class="page-header">
        <span>Spillerprofil</span>
        <h1>${player.name}</h1>
        <p>Karriere, form og bragder samlet på ett sted.</p>
      </header>

      <section class="profile-grid">
        <article class="fut-card">
          <div class="fut-card__rating">
            <strong>${player.overall}</strong>
            <span>OVR</span>
          </div>
          <div class="fut-card__avatar">${initials(player.name)}</div>
          <h2>${player.name}</h2>
          <p>FC BARRIOS</p>
          <div class="fut-card__stats">
            ${stat("ACC", player.accuracy)}
            ${stat("FORM", player.form)}
            ${stat("UND", player.underdogs)}
            ${stat("TIT", player.titles)}
          </div>
        </article>

        <div class="profile-details">
          <section class="panel profile-summary">
            ${stat("Plass", `#${player.rank}`)}
            ${stat("Poeng", formatPoints(player.points))}
            ${stat("Eksakte", player.exact_hits)}
          </section>

          <section class="panel">
            <div class="section-heading"><div><span>Samling</span><h2>Achievements</h2></div></div>
            <div class="achievements">
              ${player.achievements
                .map(
                  (item) => `
                    <article>
                      <span>${item.icon}</span>
                      <div><strong>${item.name}</strong><small>${item.description}</small></div>
                    </article>
                  `
                )
                .join("")}
            </div>
          </section>

          <section class="panel">
            <div class="section-heading"><div><span>Hall of Fame</span><h2>Historikk</h2></div></div>
            <div class="history-list">
              ${player.history
                .map(
                  (item) => `
                    <div>
                      <strong>${item.tournament}</strong>
                      <span>#${item.rank}</span>
                      <b>${formatPoints(item.points)} p</b>
                    </div>
                  `
                )
                .join("")}
            </div>
          </section>
        </div>
      </section>
    </div>
  `;
}
