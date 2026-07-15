import { getActiveTournament } from "../../repositories/tournament-repository.js";
import { getProfile, getPlayerPoolStatus } from "../../repositories/profile-repository.js";
import { getAuthSnapshot } from "../../services/auth-service.js";
import { formatPoints, initials } from "../../utils/format.js";

function stat(label, value) {
  const displayValue =
    value === null || value === undefined || value === ""
      ? "–"
      : value;

  return `<div><strong>${displayValue}</strong><span>${label}</span></div>`;
}

function playerVisual(player, className) {
  if (player.avatarUrl) {
    return `
      <img
        class="${className}"
        src="${player.avatarUrl}"
        alt="${player.name}"
      />
    `;
  }

  return `<span class="${className} profile-initials">${initials(player.name)}</span>`;
}

function CareerTimeline(history) {
  if (!history.length) {
    return `<div class="profile-empty"><span>📚</span><strong>Ingen tidligere mesterskap ennå</strong></div>`;
  }

  return `
    <div class="career-timeline">
      ${history.map((item) => `
        <article class="${item.isChampion ? "is-champion" : ""}">
          <div class="career-timeline__year">
            <span>${item.year}</span>
            ${item.isChampion ? "<b>🏆</b>" : ""}
          </div>
          <div class="career-timeline__main">
            <strong>${item.tournament}</strong>
            <small>
              ${
                item.correctPredictions === null ||
                item.correctPredictions === undefined
                  ? `${item.fieldSize} deltakere`
                  : `${item.correctPredictions} riktige tips`
              }
            </small>
          </div>
          <div class="career-timeline__rank">
            <strong>#${item.rank}</strong>
            <small>av ${item.fieldSize}</small>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function Achievements(items) {
  return `
    <div class="profile-achievements">
      ${items.map((item) => `
        <article>
          <span>${item.icon}</span>
          <div><strong>${item.name}</strong><small>${item.description}</small></div>
        </article>
      `).join("")}
    </div>
  `;
}

export async function ProfilePage() {
  const auth = getAuthSnapshot();
  const tournament = await getActiveTournament();
  const requestedPlayerId = new URLSearchParams(window.location.search).get("id");
  const playerId = requestedPlayerId || auth.player?.player_id || auth.player?.id;

  if (!playerId) {
    return `
      <div class="page">
        <section class="access-card">
          <span>👤</span>
          <h1>Velg en spiller</h1>
          <p>Åpne en spiller fra leaderboardet eller logg inn for å se din profil.</p>
          <a class="button button--primary" href="/leaderboard" data-link>Se leaderboard</a>
        </section>
      </div>
    `;
  }

  const [player, poolStatus] = await Promise.all([
    getProfile(playerId, tournament.id),
    getPlayerPoolStatus(tournament.id, playerId)
  ]);
  const isOwnProfile = auth.player?.player_id === player.id || auth.player?.id === player.id;

  return `
    <div class="page profile-page">
      <header class="profile-hero">
        <div class="profile-hero__logo">
          ${playerVisual(player, "profile-hero__photo")}
        </div>

        <div class="profile-hero__copy">
          <span>FC Barrios-karriere</span>
          <h1>${player.name}</h1>
          <p>
            ${player.tournamentsPlayed} mesterskap ·
            ${player.titles} titler ·
            ${player.podiums} pallplasser
          </p>

          ${
            isOwnProfile
              ? `<a class="button button--ghost profile-edit-link" href="/profile/edit" data-link>Endre profilbilde</a>`
              : ""
          }
        </div>
      </header>

      <section class="profile-layout">
        <article class="fut-card fut-card--career">
          <img class="fut-card__brand" src="/fcbarrios-logo.png" alt="" aria-hidden="true" />

          <div class="fut-card__rating">
            <strong>${player.overall}</strong>
            <span>OVR</span>
          </div>

          <div class="fut-card__avatar">
            ${playerVisual(player, "fut-card__photo")}
          </div>

          <h2>${player.name}</h2>
          <p>FC BARRIOS LEGACY</p>

          <div class="fut-card__stats">
            ${stat("KAR", Math.round(player.averagePercentile))}
            ${stat("FORM", player.form)}
            ${stat("TIT", player.titles)}
            ${stat("POD", player.podiums)}
          </div>
        </article>

        <div class="profile-content">
          <section class="profile-kpis">
            ${stat("Nåværende plass", player.rank ? `#${player.rank}` : "–")}
            ${stat("EM 2028-poeng", formatPoints(player.points))}
            ${stat("Beste plassering", player.bestFinish ? `#${player.bestFinish}` : "–")}
            ${stat("Snittplassering", player.averageFinish ?? "–")}
            ${stat("Riktige tips", player.totalCorrectPredictions)}
            ${stat("Mesterskap", player.tournamentsPlayed)}
          </section>

          <section class="panel profile-pool-card">
            <div class="section-heading"><div><span>Premiepotter</span><h2>Du konkurrerer om</h2></div></div>
            <div class="profile-pool-card__status">
              <strong>${poolStatus.buy_in_tier ? `${poolStatus.buy_in_tier} kr` : "Ingen pulje valgt"}</strong>
              <span class="${poolStatus.is_paid ? "is-paid" : ""}">
                ${poolStatus.is_paid ? "✓ Betalt" : "⏳ Betaling mangler"}
              </span>
            </div>
            <div class="profile-pool-list">
              ${["bronze", "silver", "gold"].map((code) => {
                const enabled = poolStatus.eligible_pools?.includes(code);
                const labels = { bronze: "🥉 Bronsepotten", silver: "🥈 Sølvpotten", gold: "🥇 Gullpotten" };
                return `<span class="${enabled ? "is-enabled" : ""}">${enabled ? "✓" : "–"} ${labels[code]}</span>`;
              }).join("")}
            </div>
          </section>

          <section class="panel">
            <div class="section-heading"><div><span>Samling</span><h2>Achievements</h2></div></div>
            ${Achievements(player.achievements)}
          </section>

          <section class="panel">
            <div class="section-heading"><div><span>Siden 2016</span><h2>Karriere</h2></div></div>
            ${CareerTimeline(player.history)}
          </section>
        </div>
      </section>
    </div>
  `;
}
