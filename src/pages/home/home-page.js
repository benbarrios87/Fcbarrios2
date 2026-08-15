import { getActiveTournament } from "../../repositories/tournament-repository.js";
import { getHomeData } from "../../repositories/home-repository.js";
import { getAuthSnapshot } from "../../services/auth-service.js";
import { appConfig } from "../../config/app-config.js";
import { isClubChallenge } from "../../utils/tournament-format.js";
import { getMyClubSelection } from "../../repositories/club-selection-repository.js";
import {
  RegistrationHome,
  LiveHome,
  FinishedHome,
  mountHomeMode
} from "../../components/home/home-modes.js";
import { ClubSelectPage } from "../club-select/club-select-page.js";
import { ClubTipsPage } from "../club-tips/club-tips-page.js";

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

function wrap(tournament, auth, mode, innerHtml) {
  return `
    <div class="page home-page home-page--${mode}">
      ${appConfig.mockMode ? `<div class="demo-banner">DEMOMODUS · Koble til Supabase når du er klar</div>` : ""}

      ${auth.isAdmin && new URLSearchParams(window.location.search).has("preview")
        ? `<div class="admin-preview-banner">
            Forhåndsvisning
            <a href="/" data-link>Avslutt forhåndsvisning</a>
          </div>`
        : ""}

      ${innerHtml}

      <footer class="site-footer">
        <strong>FC Barrios</strong>
        <span>Bygget for EM 2028 og de neste mesterskapene.</span>
      </footer>
    </div>
  `;
}

export async function HomePage() {
  const tournament = await getActiveTournament();
  const auth = getAuthSnapshot();

  // Appen viser ÉN aktiv turnering om gangen. Hvis den aktive
  // turneringen er en Know Your Club-type konkurranse, ER forsiden
  // klubbvalget/kampen — ikke et sideprosjekt ved siden av noe annet.
  // (Club-sidene har sin egen <div class="page">-wrapper allerede,
  // så vi wrapper dem ikke på nytt her.)
  if (isClubChallenge(tournament)) {
    const mySelection = auth.isAuthenticated
      ? await getMyClubSelection(tournament.id)
      : null;

    const banner = appConfig.mockMode
      ? `<div class="demo-banner">DEMOMODUS · Koble til Supabase når du er klar</div>`
      : "";

    return mySelection?.team_id
      ? banner + (await ClubTipsPage(tournament))
      : banner + (await ClubSelectPage(tournament));
  }

  const data = await getHomeData(tournament.id);
  const mode = resolveMode(tournament, auth);

  window.setTimeout(mountHomeMode, 0);

  const content =
    mode === "registration"
      ? RegistrationHome({ tournament, data })
      : mode === "finished"
        ? FinishedHome({ tournament, data })
        : LiveHome({ tournament, data });

  return wrap(tournament, auth, mode, content);
}
