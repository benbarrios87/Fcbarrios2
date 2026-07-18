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

const teamStatuses = [
  ["not_started", "Ikke startet"],
  ["group", "Gruppespill"],
  ["round32", "32-delsfinale"],
  ["round16", "Åttedelsfinale"],
  ["quarterfinal", "Kvartfinale"],
  ["semifinal", "Semifinale"],
  ["bronze_match", "Spiller bronsefinale"],
  ["bronze_winner", "Bronsevinner"],
  ["finalist", "Finalist"],
  ["champion", "Mester"],
  ["eliminated_group", "Utslått i gruppespill"],
  ["eliminated_round32", "Utslått i 32-delsfinale"],
  ["eliminated_round16", "Utslått i åttedelsfinale"],
  ["eliminated_quarterfinal", "Utslått i kvartfinale"],
  ["eliminated_semifinal", "Utslått i semifinale"],
  ["runner_up", "Tapende finalist"]
];

const statusMap = new Map(teamStatuses);

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function statusIcon(status) {
  if (status === "champion") return "🏆";
  if (status === "bronze_winner") return "🥉";
  if (status === "finalist" || status === "runner_up") return "🥈";
  if (status === "bronze_match") return "🟠";
  if (String(status || "").startsWith("eliminated_")) return "⚫";
  if (status === "not_started") return "⚪";
  return "🟢";
}

function teamRow(team) {
  const status = team.competition_status || "not_started";
  const multiplier = Number(team.rtg_multiplier || 1);

  return `
    <article class="admin-team-row ${team.is_active ? "" : "is-inactive"}" data-team-id="${team.id}">
      <span class="admin-team-row__flag">${countryCodeToFlag(team.country_code)}</span>

      <div class="admin-team-row__name">
        <strong>${team.name}</strong>
        <small>${team.code}${team.group_name ? ` · Gruppe ${team.group_name}` : ""}</small>
      </div>

      <div class="admin-team-row__meta">
        <span class="admin-team-row__tier">Tier ${team.tier}</span>
        <span class="admin-team-row__multiplier">RTG ×${multiplier.toLocaleString("no-NO", { maximumFractionDigits: 3 })}</span>
        <span class="admin-team-row__status">${statusIcon(status)} ${statusMap.get(status) || status}</span>
      </div>

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
  const currentStatus = editing?.competition_status || "not_started";

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
          <small>To bokstaver, for eksempel NO.</small>
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

        <label>
          <span>RTG-multiplikator</span>
          <input
            name="rtgMultiplier"
            type="number"
            min="0"
            step="0.001"
            value="${editing?.rtg_multiplier ?? 1}"
            placeholder="1.000"
          />
          <small>Synkroniseres med lagets RTG-kandidat.</small>
        </label>

        <label class="admin-team-form__status-field">
          <span>Turneringsstatus</span>
          <select name="competitionStatus">
            ${teamStatuses.map(([value, label]) => `
              <option value="${value}" ${currentStatus === value ? "selected" : ""}>
                ${statusIcon(value)} ${label}
              </option>
            `).join("")}
          </select>
          <small>Brukes for å holde styr på hvem som er videre eller utslått.</small>
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

  form?.elements.code?.addEventListener("input", () => {
    form.elements.code.value = form.elements.code.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = formValues(form);
    const message = document.querySelector("#team-form-message");
    const submit = form.querySelector("[type=submit]");

    submit.disabled = true;
    message.className = "admin-inline-message";
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
        groupName: values.groupName,
        rtgMultiplier: values.rtgMultiplier,
        competitionStatus: values.competitionStatus
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
        <h1>Lagkontroll</h1>
        <p>Administrer tier, gruppe, RTG-multiplikator og turneringsstatus på ett sted.</p>
      </header>
      <section id="teams-content"></section>
    </div>
  `;
}
