import { formatPoints, initials } from "../../utils/format.js";
import { SectionHeading } from "../ui/section-heading.js";

function movement(value) {
  if (value > 0) return `<span class="movement movement--up">↑${value}</span>`;
  if (value < 0) return `<span class="movement movement--down">↓${Math.abs(value)}</span>`;
  return `<span class="movement">–</span>`;
}

export function LeaderboardPreview(players) {
  return `
    <section class="panel">
      ${SectionHeading({
        eyebrow: "Live",
        title: "Topp 5 akkurat nå",
        action: `<a href="/leaderboard" data-link class="text-link">Hele tabellen →</a>`
      })}
      <div class="leaderboard-list">
        ${players
          .map(
            (player) => `
              <a class="leaderboard-row" href="/profile?id=${player.id}" data-link>
                <span class="leaderboard-row__rank">${player.rank}</span>
                <span class="avatar">${initials(player.name)}</span>
                <span class="leaderboard-row__name">
                  <strong>${player.name}</strong>
                  <small>${player.exact_hits} fulltreffere</small>
                </span>
                ${movement(player.movement)}
                <strong class="leaderboard-row__points">${formatPoints(player.points)}</strong>
              </a>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}
