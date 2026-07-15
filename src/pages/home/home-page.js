import { getActiveTournament } from "../../repositories/tournament-repository.js";
import { getHomeData } from "../../repositories/home-repository.js";
import { getAuthSnapshot } from "../../services/auth-service.js";
import { appConfig } from "../../config/app-config.js";
import {
  RegistrationHome,
  LiveHome,
  FinishedHome,
  mountHomeMode
} from "../../components/home/home-modes.js";

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

      <footer class="site-footer">
        <strong>FC Barrios</strong>
        <span>Bygget for EM 2028 og de neste mesterskapene.</span>
      </footer>
    </div>
  `;
}
