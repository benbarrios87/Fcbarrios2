import { formatPoints, initials } from "../../utils/format.js";
import { SectionHeading } from "../ui/section-heading.js";

const tierIcon = {
  250: "🥉",
  500: "🥈",
  800: "🥇"
};

function movement(value) {
  if (value > 0) return `<span class="movement movement--up">↑${value}</span>`;
  if (value < 0) return `<span class="movement movement--down">↓${Math.abs(value)}</span>`;
  return `<span class="movement">–</span>`;
}

function avatar(player) {
  return player.avatar_url
    ? `<img class="avatar avatar--image" src="${player.avatar_url}" alt="" />`
    : `<span class="avatar">${initials(player.name)}</span>`;
}

function playerMeta(player) {
  const icon = tierIcon[Number(player.buy_in_tier)] || "";
  const paid = player.is_paid ? " · ✓ Betalt" : "";
  return `${icon ? `${icon} ` : ""}${player.exact_hits} fulltreffere${paid}`;
}

export function LeaderboardPreview(players) {
  return `<section class="panel">
    ${SectionHeading({
      eyebrow: "Live",
      title: "Topp 5 akkurat nå",
      action: `<a href="/leaderboard" data-link class="text-link">Hele tabellen →</a>`
    })}

    ${players.length ? `
      <div class="leaderboard-list">
        ${players.map((player) => `
          <a class="leaderboard-row leaderboard-row--rank-${player.rank}"
            href="/profile?id=${player.id}" data-link>
            <span class="leaderboard-row__rank">${player.rank}</span>
            ${avatar(player)}
            <span class="leaderboard-row__name">
              <strong>${player.name}</strong>
              <small>${playerMeta(player)}</small>
            </span>
            ${movement(player.movement)}
            <strong class="leaderboard-row__points">${formatPoints(player.points)}</strong>
          </a>`).join("")}
      </div>` : `
      <div class="home-empty-state">
        <span>🏆</span><strong>Topplisten venter</strong>
        <small>Poeng vises her når kampene er scoret.</small>
      </div>`}
  </section>`;
}
