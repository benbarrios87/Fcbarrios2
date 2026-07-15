import { Button } from "../ui/button.js";

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("no-NO")} kr`;
}

export function HeroCard({ tournament, summary, nextMatch }) {
  const deadline = nextMatch?.kickoff_at || tournament.starts_at;

  return `
    <section class="hero-card hero-card--dashboard">
      <div class="hero-card__content">
        <span class="eyebrow"><i></i> ${tournament.short_name}</span>

        <h1>
          Hele mesterskapet.<br>
          <em>Én vinner.</em>
        </h1>

        <p>
          Tipp kampene, jakt fulltreffere og følg kampen om både topplisten
          og premiepottene.
        </p>

        <div class="hero-card__stats">
          <article>
            <span>Deltakere</span>
            <strong>${summary.participantCount}</strong>
          </article>
          <article>
            <span>Betalt</span>
            <strong>${summary.paidCount}</strong>
          </article>
          <article>
            <span>Total premiepott</span>
            <strong>${formatMoney(summary.totalPrizePool)}</strong>
          </article>
        </div>

        <div class="hero-card__actions">
          ${Button({ label: "Gå til tipping", href: "/tips", icon: "⚽" })}
          ${Button({
            label: "Se topplisten",
            href: "/leaderboard",
            variant: "ghost",
            icon: "🏆"
          })}
        </div>
      </div>

      <div class="hero-card__visual">
        <img class="hero-card__logo" src="/fcbarrios-logo.png" alt="FC Barrios-logo" />
        <div class="hero-card__glow"></div>

        <div class="hero-countdown-card">
          <span>${nextMatch ? "Neste kamp" : "Turneringsstart"}</span>
          <strong>${nextMatch ? `${nextMatch.home_team} – ${nextMatch.away_team}` : tournament.name}</strong>
          <time data-home-countdown="${deadline || ""}">Laster nedtelling …</time>
        </div>
      </div>
    </section>
  `;
}

export function mountHeroCountdown() {
  const target = document.querySelector("[data-home-countdown]");
  if (!target) return;

  const deadline = new Date(target.dataset.homeCountdown).getTime();
  if (!Number.isFinite(deadline)) {
    target.textContent = "Tidspunkt kommer";
    return;
  }

  const render = () => {
    const distance = deadline - Date.now();

    if (distance <= 0) {
      target.textContent = "I gang nå";
      return false;
    }

    const days = Math.floor(distance / 86400000);
    const hours = Math.floor((distance % 86400000) / 3600000);
    const minutes = Math.floor((distance % 3600000) / 60000);
    const seconds = Math.floor((distance % 60000) / 1000);

    target.textContent = days > 0
      ? `${days}d ${hours}t ${minutes}m`
      : `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    return true;
  };

  if (!render()) return;
  const timer = window.setInterval(() => {
    if (!document.body.contains(target) || !render()) {
      window.clearInterval(timer);
    }
  }, 1000);
}
