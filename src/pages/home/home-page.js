import { getActiveTournament, getTournamentBySlug } from "../../repositories/tournament-repository.js";
import { getHomeData } from "../../repositories/home-repository.js";
import { getAuthSnapshot } from "../../services/auth-service.js";
import { appConfig } from "../../config/app-config.js";
import { hasSupabaseConfig } from "../../services/supabase-client.js";
import { getMyClubSelection } from "../../repositories/club-selection-repository.js";
import { getTournamentTeams } from "../../repositories/teams-repository.js";
import { mockKnowYourClubTeams } from "../../data/mock-data.js";
import {
  RegistrationHome,
  LiveHome,
  FinishedHome,
  mountHomeMode
} from "../../components/home/home-modes.js";
import { KnowYourClubTeaser } from "../../components/home/know-your-club-teaser.js";

const KYC_SLUG = "know-your-club-2026";

function resolveMode(tournament, auth) {
  const preview = new URLSearchParams(window.location.search).get("preview");

  if (auth.isAdmin && ["registration", "live", "finished"].includes(preview)) {
    return preview;
  }

  if (tournament.status === "finished") return "finished";
  if (tournament.status === "registration" || tournament.status === "planning") {
    return "registration";
  }

  return "live";
}

async function getKnowYourClubTeaserData(auth) {
  try {
    const kycTournament = await getTournamentBySlug(KYC_SLUG);
    if (!auth.isAuthenticated) return { team: null };

    const mySelection = await getMyClubSelection(kycTournament.id);
    if (!mySelection?.team_id) return { team: null };

    const teams = hasSupabaseConfig
      ? await getTournamentTeams(kycTournament.id)
      : mockKnowYourClubTeams;

    const team = teams.find((t) => t.id === mySelection.team_id) ?? null;
    return { team };
  } catch {
    // Know Your Club er et sideprosjekt ved siden av EM 2028 — hvis noe
    // mangler (f.eks. turneringen ikke seedet ennå), skal ikke forsiden
    // knekke av den grunn. Teaseren vises da bare ikke.
    return null;
  }
}

export async function HomePage() {
  const tournament = await getActiveTournament();
  const data = await getHomeData(tournament.id);
  const auth = getAuthSnapshot();
  const mode = resolveMode(tournament, auth);

  window.setTimeout(mountHomeMode, 0);

  const content =
    mode === "registration"
      ? RegistrationHome({ tournament, data })
      : mode === "finished"
        ? FinishedHome({ tournament, data })
        : LiveHome({ tournament, data });

  const kyc = await getKnowYourClubTeaserData(auth);

  return `
    <div class="page home-page home-page--${mode}">
      ${appConfig.mockMode ? `<div class="demo-banner">DEMOMODUS · Koble til Supabase når du er klar</div>` : ""}

      ${auth.isAdmin && new URLSearchParams(window.location.search).has("preview")
        ? `<div class="admin-preview-banner">
            Forhåndsvisning: <strong>${mode}</strong>
            <a href="/" data-link>Avslutt forhåndsvisning</a>
          </div>`
        : ""}

      ${content}

      ${kyc ? KnowYourClubTeaser(kyc) : ""}

      <footer class="site-footer">
        <strong>FC Barrios</strong>
        <span>Bygget for EM 2028 og de neste mesterskapene.</span>
      </footer>
    </div>
  `;
}
