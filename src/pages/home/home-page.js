import { getActiveTournament } from "../../repositories/tournament-repository.js";
import { getHomeData } from "../../repositories/home-repository.js";
import { appConfig } from "../../config/app-config.js";
import { HeroCard } from "../../components/cards/hero-card.js";
import { StatusStrip } from "../../components/cards/status-strip.js";
import { MatchCard } from "../../components/cards/match-card.js";
import { LeaderboardPreview } from "../../components/cards/leaderboard-preview.js";
import { NewsCard } from "../../components/cards/news-card.js";
import { CommunityCard } from "../../components/cards/community-card.js";
import { QuickLinks } from "../../components/cards/quick-links.js";
import { SectionHeading } from "../../components/ui/section-heading.js";

export async function HomePage() {
  const tournament = await getActiveTournament();
  const data = await getHomeData(tournament.id);

  return `
    <div class="page">
      ${appConfig.mockMode ? `
        <div class="demo-banner">
          DEMOMODUS · Koble til Supabase når du er klar
        </div>
      ` : ""}

      ${HeroCard(tournament)}
      ${StatusStrip(tournament)}

      <section class="home-grid">
        <div class="home-grid__main">
          <section class="panel">
            ${SectionHeading({
              eyebrow: "Personlig",
              title: "Dine neste tips",
              action: `<a href="/tips" data-link class="text-link">Alle kampene →</a>`
            })}
            <div class="match-list">
              ${data.matches.map(MatchCard).join("")}
            </div>
          </section>

          ${CommunityCard(data.community)}
        </div>

        <aside class="home-grid__side">
          ${LeaderboardPreview(data.leaderboard)}
          ${NewsCard(data.news)}
        </aside>
      </section>

      ${QuickLinks()}

      <footer class="site-footer">
        <strong>FC Barrios</strong>
        <span>Bygget for EM 2028 og de neste mesterskapene.</span>
      </footer>
    </div>
  `;
}
