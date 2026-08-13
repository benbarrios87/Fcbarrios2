import { getAuthSnapshot } from "../../services/auth-service.js";
import { hasSupabaseConfig } from "../../services/supabase-client.js";
import { getTournamentBySlug } from "../../repositories/tournament-repository.js";
import { getTournamentTeams } from "../../repositories/teams-repository.js";
import {
  getMyClubSelection,
  saveClubSelection
} from "../../repositories/club-selection-repository.js";
import { ClubBadge } from "../../utils/club-badge.js";
import { mockKnowYourClubTeams } from "../../data/mock-data.js";

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
      ${ClubBadge(team, 40)}
      <span class="club-card__name">${team.short_name || team.name}</span>
      ${isSelected ? `<span class="club-card__check">✓</span>` : ""}
    </label>
  `;
}

function selectedTeam() {
  return state.teams.find((team) => team.id === state.selectedTeamId) ?? null;
}

function renderContent() {
  const target = document.querySelector("#club-select-content");
  if (!target) return;

  const isLocked = Boolean(state.lockedAt);
  const team = selectedTeam();

  target.innerHTML = `
    ${
      isLocked && team
        ? `
          <div class="club-select-locked">
            ${ClubBadge(team, 30)}
            <span>Lagvalget ditt er låst — du følger <strong>${team.name}</strong> gjennom hele konkurransen.</span>
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
      ${state.selectedTeamId ? `Bekreft ${team?.short_name ?? ""}` : "Velg et lag først"}
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
      renderContent();
      setMessage("Klubbvalget er lagret.", "success");

      const message = document.querySelector("[data-club-message]");
      if (message) {
        message.insertAdjacentHTML(
          "afterend",
          `<a class="button button--ghost button--full club-next-match-link" href="/know-your-club/tips" data-link>
            Se din neste kamp →
          </a>`
        );
      }
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
      <section class="kyc-hero">
        <div class="kyc-hero__copy">
          <span class="eyebrow"><i></i>${tournament.short_name} · Forhåndsvisning</span>
          <h1>Hvor godt<br/>kjenner du <em>ditt</em> lag?</h1>
          <p>
            Velg favorittklubben din i Premier League. Du tipper kun
            kampene til laget du velger — én kamp i uka, hele sesongen.
            Ingen skjuler seg bak et lag de ikke egentlig følger.
          </p>
        </div>
        <div class="kyc-hero__visual">
          <div class="kyc-hero__orb"></div>
          <span>20</span>
          <small>klubber å velge mellom</small>
        </div>
      </section>

      <section id="club-select-content"></section>
    </div>
  `;
}
