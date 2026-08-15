import { getAuthSnapshot } from "../../services/auth-service.js";
import { supabase, hasSupabaseConfig } from "../../services/supabase-client.js";
import { getTournamentBySlug } from "../../repositories/tournament-repository.js";
import { getMyClubSelection } from "../../repositories/club-selection-repository.js";
import {
  getNextTeamMatch,
  getMatchScoringOdds
} from "../../repositories/matches-repository.js";
import {
  getMyPredictions,
  savePrediction
} from "../../repositories/predictions-repository.js";
import { mockKnowYourClubScoreConfig, mockKnowYourClubTeams } from "../../data/mock-data.js";
import { ClubBadge } from "../../utils/club-badge.js";

const TOURNAMENT_SLUG = "know-your-club-2026";

let state = {
  match: null,
  existing: null
};

function bandPoints(config, odds) {
  const bands = config?.outcome_bands ?? [];
  if (odds == null || !bands.length) return null;

  const sorted = [...bands].sort((a, b) => {
    if (a.max_odds == null) return 1;
    if (b.max_odds == null) return -1;
    return a.max_odds - b.max_odds;
  });

  const match = sorted.find(
    (band) => band.max_odds == null || odds <= band.max_odds
  );

  return match?.points ?? null;
}

async function getActiveDynamicOddsConfig(tournamentId) {
  if (!hasSupabaseConfig) return mockKnowYourClubScoreConfig;

  const { data, error } = await supabase
    .from("score_models")
    .select("model_type, config")
    .eq("tournament_id", tournamentId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`Kunne ikke hente scoremodellen: ${error.message}`);
  if (data?.model_type !== "dynamic_odds") return null;
  return data.config;
}

function findTeamByName(name) {
  return mockKnowYourClubTeams.find(
    (team) => team.name === name || team.short_name === name
  );
}

function formatKickoff(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("nb-NO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderPreview(config, odds) {
  if (!config || !odds) return "";

  const homePts = bandPoints(config, odds.home_odds);
  const drawPts = bandPoints(config, odds.draw_odds);
  const awayPts = bandPoints(config, odds.away_odds);

  return `
    <div class="odds-strip">
      <article>
        <span>Hjemmeseier</span>
        <strong>${homePts ?? "–"}<small>p</small></strong>
      </article>
      <article>
        <span>Uavgjort</span>
        <strong>${drawPts ?? "–"}<small>p</small></strong>
      </article>
      <article>
        <span>Borteseier</span>
        <strong>${awayPts ?? "–"}<small>p</small></strong>
      </article>
    </div>
    <p class="odds-strip__bonus">
      + ${config.difference_bonus ?? 0}p riktig målforskjell &nbsp;·&nbsp;
      + ${config.exact_bonus ?? 0}p eksakt resultat
    </p>
  `;
}

function setTipMessage(text, type = "") {
  const message = document.querySelector("[data-tip-message]");
  if (!message) return;
  message.className = `club-select-message ${type ? `club-select-message--${type}` : ""}`;
  message.textContent = text;
}

function bindTipForm() {
  const form = document.querySelector("[data-tip-form]");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const homeInput = form.querySelector("[data-tip-home]");
    const awayInput = form.querySelector("[data-tip-away]");
    const button = form.querySelector("button[type='submit']");

    button.disabled = true;
    button.textContent = "Lagrer …";

    try {
      await savePrediction(state.match.id, homeInput.value, awayInput.value);
      state.existing = {
        match_id: state.match.id,
        home_score: Number(homeInput.value),
        away_score: Number(awayInput.value)
      };
      setTipMessage("Tipset er lagret.", "success");
      button.textContent = "Oppdater tips";
    } catch (error) {
      setTipMessage(error.message, "error");
      button.textContent = "Lagre tips";
    } finally {
      button.disabled = false;
    }
  });
}

export async function ClubTipsPage(preloadedTournament) {
  const auth = getAuthSnapshot();

  if (!auth.isAuthenticated) {
    return `
      <div class="page">
        <section class="access-card">
          <span>⚽</span>
          <h1>Logg inn først</h1>
          <a class="button button--primary" href="/login" data-link>Logg inn</a>
        </section>
      </div>
    `;
  }

  const tournament = preloadedTournament ?? (await getTournamentBySlug(TOURNAMENT_SLUG));
  const mySelection = await getMyClubSelection(tournament.id);

  if (!mySelection?.team_id) {
    return `
      <div class="page">
        <section class="access-card">
          <span>⚽</span>
          <h1>Du har ikke valgt klubb ennå</h1>
          <p>Velg favorittlaget ditt først, så finner vi neste kamp.</p>
          <a class="button button--primary" href="/know-your-club" data-link>
            Velg klubb
          </a>
        </section>
      </div>
    `;
  }

  const match = await getNextTeamMatch(tournament.id, mySelection.team_id);

  if (!match) {
    return `
      <div class="page">
        <header class="page-header">
          <span>${tournament.short_name}</span>
          <h1>Ingen kommende kamp</h1>
          <p>Fant ingen planlagt kamp for laget ditt akkurat nå.</p>
        </header>
      </div>
    `;
  }

  const [odds, config, myPredictions] = await Promise.all([
    getMatchScoringOdds(match.id),
    getActiveDynamicOddsConfig(tournament.id),
    getMyPredictions(tournament.id)
  ]);

  const existing = myPredictions.find((pr) => pr.match_id === match.id) ?? null;
  const isFinished = match.home_score != null && match.away_score != null;

  state = { match, existing };

  window.setTimeout(bindTipForm, 0);

  const homeTeam = findTeamByName(match.home_team) || { name: match.home_team, short_name: match.home_team, code: match.home_team?.slice(0, 3) };
  const awayTeam = findTeamByName(match.away_team) || { name: match.away_team, short_name: match.away_team, code: match.away_team?.slice(0, 3) };

  return `
    <div class="page">
      <section class="club-match-hero">
        <span class="eyebrow"><i></i>${tournament.short_name} · Runde ${match.round ?? ""}</span>

        <div class="club-match-hero__fixture">
          <div class="club-match-hero__side">
            ${ClubBadge(homeTeam, 64)}
            <strong>${homeTeam.short_name}</strong>
          </div>
          <span class="club-match-hero__vs">VS</span>
          <div class="club-match-hero__side">
            ${ClubBadge(awayTeam, 64)}
            <strong>${awayTeam.short_name}</strong>
          </div>
        </div>

        <time>${formatKickoff(match.kickoff_at)}</time>
      </section>

      ${renderPreview(config, odds)}

      ${
        isFinished
          ? `
            <div class="club-match-result">
              Kampen er ferdig: ${match.home_score} – ${match.away_score}
            </div>
          `
          : `
            <form class="tip-form panel" data-tip-form>
              <div class="tip-form__scores">
                <input
                  type="number" min="0" max="30" inputmode="numeric"
                  name="home_score" data-tip-home
                  value="${existing?.home_score ?? ""}"
                  aria-label="${match.home_team}"
                  placeholder="0"
                />
                <span>–</span>
                <input
                  type="number" min="0" max="30" inputmode="numeric"
                  name="away_score" data-tip-away
                  value="${existing?.away_score ?? ""}"
                  aria-label="${match.away_team}"
                  placeholder="0"
                />
              </div>
              <button class="button button--primary button--full" type="submit">
                ${existing ? "Oppdater tips" : "Lagre tips"}
              </button>
              <div class="club-select-message" data-tip-message></div>
            </form>
          `
      }

      <a class="button button--ghost button--full club-next-match-link" href="/leaderboard" data-link>
        Se leaderboard →
      </a>
    </div>
  `;
}
