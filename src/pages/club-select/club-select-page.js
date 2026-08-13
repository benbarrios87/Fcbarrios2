import { getAuthSnapshot } from "../../services/auth-service.js";
import { hasSupabaseConfig } from "../../services/supabase-client.js";
import { getTournamentBySlug } from "../../repositories/tournament-repository.js";
import { getTournamentTeams } from "../../repositories/teams-repository.js";
import {
  getMyClubSelection,
  saveClubSelection
} from "../../repositories/club-selection-repository.js";
import { countryCodeToFlag } from "../../utils/flag.js";
import {
  mockKnowYourClubTeams
} from "../../data/mock-data.js";

const TOURNAMENT_SLUG = "know-your-club-2026";

let state = {
  tournament: null,
  teams: [],
  selectedTeamId: null,
  lockedAt: null
};

function renderTeamCard(team) {
  const isSelected = state.selectedTeamId === team.id;
  const isLocked = Boolean(state.lockedAt);

  return `
    <label class="club-card ${isSelected ? "club-card--selected" : ""} ${isLocked ? "club-card--locked" : ""}">
      <input
        type="radio"
        name="club-select"
        value="${team.id}"
        data-club-radio
        ${isSelected ? "checked" : ""}
        ${isLocked ? "disabled" : ""}
      />
      <span class="club-card__flag">${countryCodeToFlag(team.country_code)}</span>
      <span class="club-card__name">${team.short_name || team.name}</span>
    </label>
  `;
}

function renderContent() {
  const target = document.querySelector("#club-select-content");
  if (!target) return;

  const isLocked = Boolean(state.lockedAt);

  target.innerHTML = `
    ${
      isLocked
        ? `
          <div class="club-select-locked">
            Lagvalget ditt er låst. Du følger nå ${
              state.teams.find((team) => team.id === state.selectedTeamId)
                ?.name ?? "et lag"
            } gjennom hele konkurransen.
          </div>
        `
        : ""
    }

    <div class="club-grid">
      ${state.teams.map(renderTeamCard).join("")}
    </div>

    <button
      class="button button--primary button--full"
      type="button"
      data-save-club
      ${state.selectedTeamId && !isLocked ? "" : "disabled"}
    >
      ${state.selectedTeamId ? "Bekreft klubbvalg" : "Velg et lag først"}
    </button>

    <div class="club-select-message" data-club-message></div>
  `;

  bindEvents();
}

function setMessage(text, type = "") {
  const message = document.querySelector("[data-club-message]");
  if (!message) return;

  message.className = `club-select-message ${type ? `club-select-message--${type}` : ""}`;
  message.textContent = text;
}

function bindEvents() {
  document.querySelectorAll("[data-club-radio]").forEach((radio) => {
    radio.addEventListener("change", () => {
      state.selectedTeamId = radio.value;
      renderContent();
    });
  });

  const saveButton = document.querySelector("[data-save-club]");
  if (!saveButton) return;

  saveButton.addEventListener("click", async () => {
    if (!state.selectedTeamId) return;

    saveButton.disabled = true;
    saveButton.textContent = "Lagrer …";

    try {
      const saved = await saveClubSelection(
        state.tournament.id,
        state.selectedTeamId
      );
      state.lockedAt = saved?.locked_at ?? null;
      setMessage("Klubbvalget er lagret.", "success");
      renderContent();
    } catch (error) {
      setMessage(error.message, "error");
      saveButton.disabled = false;
      saveButton.textContent = "Bekreft klubbvalg";
    }
  });
}

export async function ClubSelectPage() {
  const auth = getAuthSnapshot();

  if (!auth.isAuthenticated) {
    return `
      <div class="page">
        <section class="access-card">
          <span>⚽</span>
          <h1>Logg inn først</h1>
          <p>Klubbvalget må kobles til spillerkontoen din.</p>
          <a class="button button--primary" href="/login" data-link>
            Logg inn
          </a>
        </section>
      </div>
    `;
  }

  const tournament = await getTournamentBySlug(TOURNAMENT_SLUG);

  const teams = hasSupabaseConfig
    ? await getTournamentTeams(tournament.id)
    : mockKnowYourClubTeams;

  const mySelection = await getMyClubSelection(tournament.id);

  state = {
    tournament,
    teams,
    selectedTeamId: mySelection?.team_id ?? null,
    lockedAt: mySelection?.locked_at ?? null
  };

  window.setTimeout(renderContent, 0);

  return `
    <div class="page">
      <header class="page-header">
        <span>${tournament.short_name}</span>
        <h1>Velg din klubb</h1>
        <p>
          Hvem heier du på i Premier League? Du tipper kun kampene til
          laget du velger her — én kamp i uka, resten av sesongen.
          Dette er en forhåndsvisning: konkurransen er ikke i gang ennå.
        </p>
      </header>

      <section id="club-select-content"></section>
    </div>
  `;
}
