import { HeroCard, mountHeroCountdown } from "../cards/hero-card.js";
import { StatusStrip } from "../cards/status-strip.js";
import { TournamentProgress } from "../cards/tournament-progress.js";
import { MatchCard } from "../cards/match-card.js";
import { LeaderboardPreview } from "../cards/leaderboard-preview.js";
import { NewsCard } from "../cards/news-card.js";
import { CommunityCard } from "../cards/community-card.js";
import { QuickLinks } from "../cards/quick-links.js";
import { ParticipantsCard, mountParticipantFilters } from "../cards/participants-card.js";
import { PrizePoolsCard } from "../cards/prize-pools-card.js";
import { SectionHeading } from "../ui/section-heading.js";

function topThree(leaderboard) {
  return leaderboard.slice(0, 3);
}

export function mountHomeMode() {
  mountHeroCountdown();
  mountParticipantFilters();
}

export function RegistrationHome({ tournament, data }) {
  return `
    <section class="pre-home-hero">
      <div class="pre-home-hero__copy">
        <span>FC Barrios · ${tournament.short_name}</span>
        <h1>Mer enn bare å tippe riktig resultat.</h1>
        <p>
          Underdog-poeng, Road to Glory, egne bonusvalg og premiepotter
          gjør at hver kamp betyr noe.
        </p>

        <div class="pre-home-hero__actions">
          <a class="button button--primary" href="/login" data-link>Bli med</a>
          <a class="button button--ghost" href="#how-it-works">Slik fungerer det</a>
        </div>

        <div class="pre-home-hero__numbers">
          <article><strong>${data.participantCount}</strong><span>påmeldte</span></article>
          <article><strong>${data.paidCount}</strong><span>betalt</span></article>
          <article><strong>${Number(data.totalPrizePool).toLocaleString("no-NO")} kr</strong><span>premiepott</span></article>
        </div>
      </div>

      <div class="pre-home-hero__visual">
        <img src="/fcbarrios-logo.png" alt="FC Barrios" />
        <strong>${tournament.name}</strong>
        <small>${tournament.starts_at ? `Starter ${new Date(tournament.starts_at).toLocaleDateString("no-NO")}` : "Påmeldingen er åpen"}</small>
      </div>
    </section>

    <section id="how-it-works" class="pre-feature-grid">
      <article><span>🎯</span><h2>Flere veier til poeng</h2><p>Eksakt, målforskjell, utfall og ekstra uttelling for dristige tips.</p></article>
      <article><span>🛣️</span><h2>Road to Glory</h2><p>Fordel poengene dine på lagene du tror går hele veien.</p></article>
      <article><span>🔥</span><h2>Bonusvalg</h2><p>Velg målrike og målfattige kamper, toppscorer og turneringens beste spiller.</p></article>
      <article><span>🏆</span><h2>Tre premiepotter</h2><p>Velg Bronse, Sølv eller Gull og konkurrer om pottene du har betalt inn til.</p></article>
    </section>

    ${PrizePoolsCard(data.prizePools)}
    ${ParticipantsCard(data.participants)}

    <section class="panel pre-home-faq">
      ${SectionHeading({ eyebrow: "Kort fortalt", title: "Hvorfor er FC Barrios annerledes?" })}
      <div>
        <article><strong>Må jeg kunne mye om fotball?</strong><p>Nei. Reglene forklares direkte på kampkortene.</p></article>
        <article><strong>Kan jeg fortsatt vinne etter en dårlig start?</strong><p>Ja. Underdogs, bonusvalg og sluttspill gir store muligheter til å hente inn forsprang.</p></article>
        <article><strong>Kan en Gull-spiller vinne flere potter?</strong><p>Ja. Hver pott er uavhengig, som sidepotter i poker.</p></article>
      </div>
    </section>
  `;
}

export function LiveHome({ tournament, data }) {
  return `
    ${HeroCard({
      tournament,
      nextMatch: data.matches[0] ?? null,
      summary: {
        participantCount: data.participantCount,
        paidCount: data.paidCount,
        totalPrizePool: data.totalPrizePool
      }
    })}

    ${StatusStrip({
      participantCount: data.participantCount,
      paidCount: data.paidCount,
      totalPrizePool: data.totalPrizePool,
      matchCounts: data.matchCounts
    })}

    ${TournamentProgress({ tournament, matchCounts: data.matchCounts })}

    <section class="home-grid">
      <div class="home-grid__main">
        <section class="panel">
          ${SectionHeading({
            eyebrow: "Personlig",
            title: "Dine neste tips",
            action: `<a href="/tips" data-link class="text-link">Alle kampene →</a>`
          })}

          ${data.matches.length
            ? `<div class="match-list">${data.matches.map(MatchCard).join("")}</div>`
            : `<div class="home-empty-state"><span>⚽</span><strong>Ingen kommende kamper</strong><small>Nye kamper vises her når de blir lagt inn.</small></div>`}
        </section>

        ${CommunityCard(data.community)}
      </div>

      <aside class="home-grid__side">
        ${LeaderboardPreview(data.leaderboard)}
        ${NewsCard(data.news)}
      </aside>
    </section>

    ${PrizePoolsCard(data.prizePools)}
    ${ParticipantsCard(data.participants)}
    ${QuickLinks()}
  `;
}

export function FinishedHome({ tournament, data }) {
  const podium = topThree(data.leaderboard);

  return `
    <section class="finished-home-hero">
      <span>🏆 ${tournament.name} er ferdig</span>
      <h1>${podium[0]?.name || "Vinneren kommer snart"}</h1>
      <p>${podium[0] ? `Tok seieren med ${podium[0].points} poeng.` : "Leaderboardet oppdateres."}</p>
      <a class="button button--primary" href="/history" data-link>Se historikken</a>
    </section>

    <section class="panel finished-podium">
      ${SectionHeading({ eyebrow: "Sluttstilling", title: "Pallen" })}
      <div>
        ${podium.map((player, index) => `
          <article class="finished-podium__place finished-podium__place--${index + 1}">
            <span>${["🥇","🥈","🥉"][index]}</span>
            <strong>${player.name}</strong>
            <small>${player.points} poeng</small>
          </article>
        `).join("")}
      </div>
    </section>

    ${PrizePoolsCard(data.prizePools)}
    ${LeaderboardPreview(data.leaderboard)}
    ${NewsCard(data.news)}

    <section class="panel next-tournament-card">
      <span>Neste kapittel</span>
      <h2>FC Barrios fortsetter.</h2>
      <p>Historikken, medaljene og mesterskapene følger spillerprofilen videre.</p>
      <a class="button button--ghost" href="/history" data-link>Hall of Fame</a>
    </section>
  `;
}
