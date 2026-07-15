import { SectionHeading } from "../ui/section-heading.js";

const icon = { gold: "🥇", silver: "🥈", bronze: "🥉" };

function money(value) {
  return `${Number(value || 0).toLocaleString("no-NO")} kr`;
}

function explanation(code) {
  if (code === "bronze") return "Alle betalte spillere konkurrerer om Bronsepotten.";
  if (code === "silver") return "Sølv- og Gull-spillere konkurrerer om Sølvpotten.";
  return "Bare Gull-spillere konkurrerer om Gullpotten.";
}

function tierCounts(pool) {
  return `
    <div class="home-prize-pool__tiers">
      ${pool.bronze_players ? `<span>🥉 ${pool.bronze_players}</span>` : ""}
      ${pool.silver_players ? `<span>🥈 ${pool.silver_players}</span>` : ""}
      ${pool.gold_players ? `<span>🥇 ${pool.gold_players}</span>` : ""}
    </div>
  `;
}

export function PrizePoolsCard(pools) {
  return `
    <section class="panel home-prize-pools">
      ${SectionHeading({
        eyebrow: "Sidepotter",
        title: "Premiepotter"
      })}

      <p class="home-prize-pools__intro">
        Du konkurrerer om alle pottene du har betalt inn til. Samme spiller
        kan vinne i flere potter.
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

            <p>${explanation(pool.pool_code)}</p>
            ${tierCounts(pool)}

            <div class="home-prize-pool__prizes">
              <span>1. plass <b>${money(pool.first_prize)}</b></span>
              <span>2. plass <b>${money(pool.second_prize)}</b></span>
              ${Number(pool.third_prize || 0) > 0
                ? `<span>3. plass <b>${money(pool.third_prize)}</b></span>`
                : ""}
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}
