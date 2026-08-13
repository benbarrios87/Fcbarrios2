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
import { mockKnowYourClubScoreConfig } from "../../data/mock-data.js";

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
    <div class="odds-preview">
      <div class="odds-preview__row">
        <span>Hjemmeseier</span>
        <strong>${homePts ?? "–"}p</strong>
      </div>
      <div class="odds-preview__row">
        <span>Uavgjort</span>
        <strong>${drawPts ?? "–"}p</strong>
      </div>
      <div class="odds-preview__row">
        <span>Borteseier</span>
        <strong>${awayPts ?? "–"}p</strong>
      </div>
    </div>
    <p class="odds-preview__bonus">
      + ${config.difference_bonus ?? 0}p for riktig målforskjell ·
      + ${config.exact_bonus ?? 0}p for eksakt resultat
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

export async function ClubTipsPage() {
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

  const tournament = await getTournamentBySlug(TOURNAMENT_SLUG);
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

  return `
    <div class="page">
      <header class="page-header">
        <span>${tournament.short_name} · Runde ${match.round ?? ""}</span>
        <h1>${match.home_team} – ${match.away_team}</h1>
        <p>${formatKickoff(match.kickoff_at)}</p>
      </header>

      ${renderPreview(config, odds)}

      ${
        isFinished
          ? `
            <div class="club-match-result">
              Kampen er ferdig: ${match.home_score} – ${match.away_score}
            </div>
          `
          : `
            <form class="tip-form" data-tip-form>
              <div class="tip-form__scores">
                <input
                  type="number" min="0" max="30" inputmode="numeric"
                  name="home_score" data-tip-home
                  value="${existing?.home_score ?? ""}"
                  aria-label="${match.home_team}"
                />
                <span>–</span>
                <input
                  type="number" min="0" max="30" inputmode="numeric"
                  name="away_score" data-tip-away
                  value="${existing?.away_score ?? ""}"
                  aria-label="${match.away_team}"
                />
              </div>
              <button class="button button--primary button--full" type="submit">
                ${existing ? "Oppdater tips" : "Lagre tips"}
              </button>
              <div class="club-select-message" data-tip-message></div>
            </form>
          `
      }
    </div>
  `;
}
