import { SectionHeading } from "../ui/section-heading.js";

const icon = { gold: "🥇", silver: "🥈", bronze: "🥉" };

function money(value) {
  return `${Number(value || 0).toLocaleString("no-NO")} kr`;
}

export function PrizePoolsCard(pools) {
  return `
    <section class="panel home-prize-pools">
      ${SectionHeading({
        eyebrow: "Modell C",
        title: "Premiepotter"
      })}

      <p class="home-prize-pools__intro">
        Gull kan kvalifisere til alle tre pottene, Sølv til Sølv og Bronse,
        og Bronse til Bronse. Én spiller kan bare vinne én premie.
      </p>

      <div class="home-prize-pools__grid">
        ${pools.map((pool) => `
          <article class="home-prize-pool home-prize-pool--${pool.pool_code}">
            <header>
              <span>${icon[pool.pool_code]}</span>
              <div>
                <small>${pool.minimum_tier} kr-nivå</small>
                <h3>${pool.pool_name}</h3>
              </div>
              <strong>${money(pool.prize_pool)}</strong>
            </header>

            <p>${pool.eligible_paid_players} betalte kvalifiserer</p>

            <div>
              <span>1. plass <b>${money(pool.first_prize)}</b></span>
              <span>2. plass <b>${money(pool.second_prize)}</b></span>
              <span>3. plass <b>${money(pool.third_prize)}</b></span>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}
