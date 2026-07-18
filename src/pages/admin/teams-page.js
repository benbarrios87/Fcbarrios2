import { getAuthSnapshot } from "../../services/auth-service.js";
import { getActiveTournament } from "../../repositories/tournament-repository.js";
import {
  getAdminTeams,
  saveTournamentTeam,
  setTournamentTeamActive
} from "../../repositories/teams-repository.js";
import { countryCodeToFlag } from "../../utils/flag.js";

let state = {
  tournament: null,
  teams: [],
  editingId: null
};

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function teamRow(team) {
  return `
    <article class="admin-team-row ${team.is_active ? "" : "is-inactive"}" data-team-id="${team.id}">
      <span class="admin-team-row__flag">${countryCodeToFlag(team.country_code)}</span>

      <div class="admin-team-row__name">
        <strong>${team.name}</strong>
        <small>${team.code}${team.group_name ? ` · Gruppe ${team.group_name}` : ""}</small>
      </div>

      <span class="admin-team-row__tier">Tier ${team.tier}</span>

      <button type="button" class="button button--ghost" data-edit-team>
        Rediger
      </button>

      <button type="button" class="button button--ghost" data-toggle-team>
        ${team.is_active ? "Deaktiver" : "Aktiver"}
      </button>
    </article>
  `;
}

function render() {
  const target = document.querySelector("#teams-content");
  if (!target) return;

  const editing = state.teams.find((team) => team.id === state.editingId);

  target.innerHTML = `
    <section class="panel admin-team-editor">
      <div class="section-heading">
        <div>
          <span>${editing ? "Rediger" : "Nytt lag"}</span>
          <h2>${editing?.name || "Legg til lag"}</h2>
        </div>
      </div>

      <form id="team-form" class="admin-team-form">
        <label>
          <span>Lag</span>
          <input name="name" required value="${editing?.name || ""}" placeholder="Norge" />
        </label>

        <label>
          <span>FIFA-kode</span>
          <input name="code" required maxlength="3" value="${editing?.code || ""}" placeholder="NOR" />
        </label>

        <label>
          <span>Kortnavn</span>
          <input name="shortName" value="${editing?.short_name || ""}" placeholder="Norge" />
        </label>

        <label>
          <span>Landskode</span>
          <div class="country-code-field">
            <input name="countryCode" maxlength="2" value="${editing?.country_code || ""}" placeholder="NO" />
            <b data-flag-preview>${countryCodeToFlag(editing?.country_code)}</b>
          </div>
          <small>To bokstaver. NO gir 🇳🇴. Ingen bildefiler.</small>
        </label>

        <label>
          <span>Tier</span>
          <select name="tier">
            ${[1,2,3,4].map((tier) => `
              <option value="${tier}" ${Number(editing?.tier || 4) === tier ? "selected" : ""}>
                Tier ${tier}
              </option>
            `).join("")}
          </select>
        </label>

        <label>
          <span>Gruppe</span>
          <input name="groupName" value="${editing?.group_name || ""}" placeholder="A" />
        </label>

        <div class="admin-team-form__actions">
          <button class="button button--primary" type="submit">
            ${editing ? "Lagre endringer" : "Legg til lag"}
          </button>

          ${editing ? `<button class="button button--ghost" type="button" data-cancel-edit>Avbryt</button>` : ""}
        </div>

        <small id="team-form-message" class="admin-inline-message"></small>
      </form>
    </section>

    <section class="panel admin-team-list">
      <div class="section-heading">
        <div><span>Turneringen</span><h2>Lag (${state.teams.length})</h2></div>
      </div>

      <div class="admin-team-rows">
        ${state.teams.length
          ? state.teams.map(teamRow).join("")
          : `<div class="tips-empty">Ingen lag er lagt inn ennå.</div>`}
      </div>
    </section>
  `;

  bindEvents();
}

async function reload() {
  state.teams = await getAdminTeams(state.tournament.id);
}

function bindEvents() {
  const form = document.querySelector("#team-form");
  const countryInput = form?.elements.countryCode;
  const preview = form?.querySelector("[data-flag-preview]");

  countryInput?.addEventListener("input", () => {
    countryInput.value = countryInput.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
    preview.textContent = countryCodeToFlag(countryInput.value);
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = formValues(form);
    const message = document.querySelector("#team-form-message");
    const submit = form.querySelector("[type=submit]");

    submit.disabled = true;
    message.textContent = "Lagrer …";

    try {
      await saveTournamentTeam({
        tournamentId: state.tournament.id,
        teamId: state.editingId,
        code: values.code,
        name: values.name,
        shortName: values.shortName,
        tier: values.tier,
        countryCode: values.countryCode,
        groupName: values.groupName
      });

      state.editingId = null;
      await reload();
      render();
    } catch (error) {
      message.textContent = error.message;
      message.className = "admin-inline-message is-error";
    } finally {
      submit.disabled = false;
    }
  });

  document.querySelector("[data-cancel-edit]")?.addEventListener("click", () => {
    state.editingId = null;
    render();
  });

  document.querySelectorAll("[data-edit-team]").forEach((button) => {
    button.addEventListener("click", () => {
      state.editingId = button.closest("[data-team-id]").dataset.teamId;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  document.querySelectorAll("[data-toggle-team]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.closest("[data-team-id]").dataset.teamId;
      const team = state.teams.find((item) => item.id === id);

      button.disabled = true;

      try {
        await setTournamentTeamActive({
          tournamentId: state.tournament.id,
          teamId: id,
          isActive: !team.is_active
        });

        await reload();
        render();
      } catch (error) {
        button.disabled = false;
        button.textContent = error.message;
      }
    });
  });
}

export async function TeamsPage() {
  const auth = getAuthSnapshot();

  if (!auth.isAdmin) {
    return `<div class="page"><section class="access-card">
      <span>⛔</span><h1>Ingen tilgang</h1>
      <a class="button button--ghost" href="/" data-link>Til forsiden</a>
    </section></div>`;
  }

  const tournament = await getActiveTournament();
  const teams = await getAdminTeams(tournament.id);

  state = { tournament, teams, editingId: null };
  window.setTimeout(render, 0);

  return `
    <div class="page">
      <header class="page-header">
        <span>Admin · ${tournament.short_name}</span>
        <h1>Lag og flagg</h1>
        <p>Legg inn landskode én gang. Flagget lages automatisk som emoji.</p>
      </header>
      <section id="teams-content"></section>
    </div>
  `;
}
