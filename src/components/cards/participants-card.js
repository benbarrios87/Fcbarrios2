import { initials } from "../../utils/format.js";
import { SectionHeading } from "../ui/section-heading.js";

const tierMeta = {
  250: { name: "Bronse", icon: "🥉" },
  500: { name: "Sølv", icon: "🥈" },
  800: { name: "Gull", icon: "🥇" }
};

function avatar(player) {
  return player.avatar_url
    ? `<img class="participant-card__avatar" src="${player.avatar_url}" alt="" />`
    : `<span class="participant-card__avatar participant-card__avatar--fallback">${initials(player.display_name)}</span>`;
}

function participant(player) {
  const tier = tierMeta[player.buy_in_tier] || { name: "Ingen pulje", icon: "⚪" };

  return `
    <a class="participant-card" href="/profile?id=${player.player_id}" data-link
      data-participant-tier="${player.buy_in_tier || 0}"
      data-participant-paid="${player.is_paid ? "true" : "false"}">
      ${avatar(player)}
      <span class="participant-card__name">
        <strong>${player.display_name}</strong>
        <small>${tier.icon} ${tier.name}${player.buy_in_tier ? ` · ${player.buy_in_tier} kr` : ""}</small>
      </span>
      <span class="participant-card__status ${player.is_paid ? "is-paid" : ""}">
        ${player.is_paid ? "✓ Betalt" : "Venter"}
      </span>
      <b>${player.leaderboard_rank ? `#${player.leaderboard_rank}` : "–"}</b>
    </a>
  `;
}

export function ParticipantsCard(players) {
  return `
    <section class="panel home-participants">
      ${SectionHeading({
        eyebrow: "Feltet",
        title: `Deltakere (${players.length})`
      })}

      <div class="participant-filters" role="group" aria-label="Filtrer deltakere">
        <button type="button" class="is-active" data-participant-filter="all">Alle</button>
        <button type="button" data-participant-filter="800">🥇 Gull</button>
        <button type="button" data-participant-filter="500">🥈 Sølv</button>
        <button type="button" data-participant-filter="250">🥉 Bronse</button>
        <button type="button" data-participant-filter="paid">✓ Betalt</button>
      </div>

      <div class="participant-list" data-participant-list>
        ${players.length
          ? players.map(participant).join("")
          : `<div class="home-empty-state"><span>👥</span><strong>Ingen deltakere ennå</strong></div>`}
      </div>
    </section>
  `;
}

export function mountParticipantFilters() {
  const buttons = [...document.querySelectorAll("[data-participant-filter]")];
  const cards = [...document.querySelectorAll("[data-participant-tier]")];
  if (!buttons.length || !cards.length) return;

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.participantFilter;
      buttons.forEach((item) => item.classList.toggle("is-active", item === button));

      cards.forEach((card) => {
        const visible = filter === "all"
          || (filter === "paid" && card.dataset.participantPaid === "true")
          || card.dataset.participantTier === filter;

        card.hidden = !visible;
      });
    });
  });
}
