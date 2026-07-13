import { Button } from "../ui/button.js";

export function HeroCard(tournament) {
  return `
    <section class="hero-card">
      <div class="hero-card__content">
        <span class="eyebrow"><i></i> ${tournament.short_name}</span>
        <h1>Hele mesterskapet.<br><em>Én vinner.</em></h1>
        <p>
          Tipp kampene, jakt fulltreffere og bygg FC Barrios-arven din
          gjennom hvert mesterskap.
        </p>
        <div class="hero-card__actions">
          ${Button({
            label: "Gå til tipping",
            href: "/tips",
            icon: "⚽"
          })}
          ${Button({
            label: "Se topplisten",
            href: "/leaderboard",
            variant: "ghost",
            icon: "🏆"
          })}
        </div>
      </div>

      <div class="hero-card__visual" aria-hidden="true">
        <div class="trophy">
          <span>★</span>
          <strong>2028</strong>
          <small>FC BARRIOS</small>
        </div>
        <div class="hero-card__glow"></div>
      </div>
    </section>
  `;
}
